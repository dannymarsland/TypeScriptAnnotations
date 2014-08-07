///<reference path="../defs/typescript.api.d.ts"/>
///<reference path="../defs/node.d.ts"/>

import tsapi = require("typescript-api");
import path = require('path');
import fs = require('fs');


export function getApplicationAnnotations(inputFile: string, callback: (applicationAnnotations: ApplicationAnnotations ) => void) {
    var parser = new Parser();
    parser.parse(inputFile, (classAnnotations : AnnotatedClass[], reflectedClasses: tsapi.Class[]) => {
        var applicationAnnotations = new ApplicationAnnotations(inputFile, classAnnotations);
        callback(applicationAnnotations);
    });
}

export function writeAnnotationsToFile(filePath: string, annotations: AnnotatedClass[], prettify: boolean = false) {

    var classes = {};
    annotations.forEach((classAnnotations: AnnotatedClass) => {
        var name = classAnnotations.getClass().getClassName();
        if (typeof classes[name] == 'undefined') {
            classes[name] = classAnnotations;
        } else {
            throw new Error('Duplicate class definition: ' + name);
        }
    });

    var dataString = '(function (context) {\n  ';
    dataString += 'var data = ';
    dataString += JSON.stringify(classes, undefined, prettify ? 2 : undefined) + ';\n  ';
    dataString += 'if (typeof module === "object" && typeof module.exports !== "undefined") {\n  ';
    dataString += '  module.exports = data;\n  ';
    dataString += '} else {\n  ';
    dataString += '  context["__annotations"] = data;\n  ';
    dataString += '}\n';

    dataString+= '})(this);';
    fs.writeFileSync(filePath, dataString);

}

export class ApplicationAnnotations {

    constructor(private inputFile: string, private classAnnotations: AnnotatedClass[]) {

    }

    public getInputFile() {
        return this.inputFile;
    }

    public getClassAnnotations() {
        return this.classAnnotations;
    }

}

export class Parser {

    public parse(inputFilePath: string, callback: (classAnnotations : AnnotatedClass[], reflectedClasses: tsapi.Class[]) => void) {
        if (fs.existsSync(inputFilePath)) {
            tsapi.resolve([inputFilePath], (resolved : tsapi.SourceUnit[]) => {
                if(tsapi.check(resolved)){
                    tsapi.compile(resolved, (compiled:tsapi.CompiledUnit[]) => {
                        var reflectedClasses: tsapi.Class[] = [];
                        compiled.forEach((unit) => {
                            this.getReflectedClassesFromScript(unit.script, reflectedClasses);
                        });
                        var annotations: AnnotatedClass[] = this.getAnnotationsFromReflectedClasses(reflectedClasses);
                        console.log('Number of classes:' + annotations.length);
                        callback(annotations.reverse(), reflectedClasses);
                    })
                } else {
                    throw new Error('Invalid code');
                }
            });
        } else {
            throw new Error('Input file does not exist ' + inputFilePath);
        }
    }

    private getReflectedClassesFromScript(script : tsapi.Script, classes: tsapi.Class[]) {
        script.classes.forEach((tsClass)=>{
                classes.push(tsClass);
            }
        );
        script.modules.forEach((tsModule)=>{
            this.getReflectedClassesFromModule(tsModule, classes);
        });

    }

    private getReflectedClassesFromModule(tsModule : tsapi.Module, classes: tsapi.Class[]) {
        tsModule.classes.forEach((tsClass)=>{
               classes.push(tsClass);
            }
        );
        tsModule.modules.forEach((subModule)=>{
            this.getReflectedClassesFromModule(subModule,classes);
        })
    }

    private getAnnotationsFromReflectedClasses(reflectedClasses: tsapi.Class[]): AnnotatedClass[] {
        var builder = new AnnotationBuilder();
        var annotatedClasses: AnnotatedClass[] = [];
        reflectedClasses.forEach((reflectedClass)=>{
            annotatedClasses.push(builder.fromReflectedClass(reflectedClass));
        });
        return annotatedClasses;
    }

}

export class AnnotationBuilder {

    public fromReflectedClass(reflectedClass: tsapi.Class) : AnnotatedClass {
        var classDescription = this.getClassDescription(reflectedClass);
        var variables = reflectedClass.variables;
        var comments = reflectedClass.comments;
        var classAnnotations: ClassAnnotation[] = [];
        comments.forEach((comment)=>{
            var annotations = this.parseAnnotations(comment);
            annotations.forEach((annotation)=>{
                classAnnotations.push(
                    new ClassAnnotation(
                        classDescription, annotation
                    )
                )
            });
        });

        var membersAnnotations: MemberAnnotation[] = [];
        for(var i=0; i< variables.length; i++){
            var variable = variables[i];
            var comments = variable.comments;
            for(var j=0; j<comments.length; j++){
                var annotations = this.parseAnnotations(comments[j]);
                annotations.forEach((annotation)=>{
                    membersAnnotations.push(
                        new MemberAnnotation(
                            variable.name,
                            variable.type.name,
                            annotation
                        )
                    )
                });
            }
        }

        return new AnnotatedClass(classDescription, classAnnotations, membersAnnotations);

    }

    private getClassDescription(reflectedClass: tsapi.Class): ClassDescription {
        var parentClass: ClassDescriptionJson;
        if (reflectedClass.extends.length > 0) {
            if(reflectedClass.extends.length != 1){
                throw new Error('Class extends more than one class. Not sure how to handle that');
            } else {
                parentClass = reflectedClass.extends[0];
            }
        }
        return new ClassDescription(reflectedClass, parentClass);
    }

    private parseAnnotations(comment: string): Annotation[] {
        var annotationMatches = comment.match(/\@([a-zA-Z\_\$1-5]+)(?:\([^\)]*\))?/g);
        if(annotationMatches) {
            return annotationMatches.map((match: string)=>{
                var bracketIndex = match.indexOf('(');
                var params = {};
                if(bracketIndex > -1){
                    var name = match.substring(0,bracketIndex);
                    var paramString = match.substring(bracketIndex+1, match.length - 1);
                    try {
                        params = JSON.parse(paramString);
                    } catch(e) {
                        throw new Error('Invalid params (cannot parse) : ' + match);
                    }
                    if(typeof params !== "object"){
                        throw new Error('Invalid params: ' + match);
                    }
                } else {
                    var name = match;
                }
                name = name.replace('@','');

                return (new Annotation(name, params));
            })
        } else {
            return [];
        }
    }
}



export interface ClassParentDescriptionDescription {
    className: string;
    scope: string[];
}

export interface ClassDescriptionDescription {
    className: string;
    parent: ClassParentDescriptionDescription
    scope: string[];
}

export interface ClassAnnotationsDescription {
    classDescription: ClassDescriptionDescription;
    annotations: ClassAnnotationDescription[];
    memberAnnotations: MemberAnnotationDescription[];
}

export interface ClassAnnotationDescription {
    //classDescription: ClassDescription;
    annotation: AnnotationDescription;
}

export interface AnnotationDescription {
    annotation: string;
    params: {};
}

export interface MemberAnnotationDescription {
    name: string;
    type: string;
    annotation: AnnotationDescription
}


//class AnnotationReader {
//
//    public static readClassName(className: string): AnnotatedClass {
//        // @todo deal with namespacing
//        return this.readClass(window[className]);
//    }
//
//    public static readInstance(object: any) {
//        return this.readClass(object['constructor']);
//    }
//
//    public static readClass(classConstructor: Function): AnnotatedClass {
//        if(typeof classConstructor['__annotations'] !== "undefined") {
//            var annotationsDescription: ClassAnnotationsDescription = classConstructor['__annotations'];
//            var classDescriptionJSON = annotationsDescription.classDescription;
//            var className = classDescriptionJSON.className;
//            var scope = classDescriptionJSON.scope;
//            var parent = classDescriptionJSON.parent ? new ParentClassDescription(classDescriptionJSON.parent.className, classDescriptionJSON.parent.scope) : null;
//            var classDescription = new ClassDescription(classDescriptionJSON, scope, parent);
//            var classAnnotations: ClassAnnotation[] = annotationsDescription.annotations.map((description: ClassAnnotationDescription) => {
//                var annotation = new Annotation(description.annotation.annotation, description.annotation.params);
//                return new ClassAnnotation(classDescription, annotation);
//            });
//            var memberAnnotations: MemberAnnotation[] = annotationsDescription.memberAnnotations.map((description)=>{
//                var annotation = new Annotation(description.annotation, description.params);
//                return new MemberAnnotation(description.name, description.type, annotation);
//            });
//
//            if(parent) {
//
//            }
//            return new AnnotatedClass(classDescription, classAnnotations, memberAnnotations);
//        } else {
//            return null;
//        }
//    }
//
//
//    private getClassDescriptionFromName(className: string, scope: string[] = null): ClassDescription {
//        var classConstructor = this.getClassConstructorFromName(className, scope);
//        if(typeof classConstructor['__annotations'] !== "undefined") {
//            var annotationsDescription: ClassAnnotationsDescription = classConstructor['__annotations'];
//            var classDescriptionJSON = annotationsDescription.classDescription;
//            var className = classDescriptionJSON.className;
//            var scope = classDescriptionJSON.scope;
//            var parent = classDescriptionJSON.parent ? new ParentClassDescription(classDescriptionJSON.parent.className, classDescriptionJSON.parent.scope) : null;
//            return new ClassDescription(className, scope, parent);
//
//        } else {
//            return new ClassDescription(className, scope);
//        }
//    }
//
//    private getAnnotationsForClass(classDescription: ClassDescription) {
//        var classConstructor = this.getClassFromDescription(classDescription);
//
//    }
//
//    private getClassFromDescription(classDescription: ClassDescription): Function {
//        var name = classDescription.getClassName();
//        var scope = classDescription.getScope();
//        return this.getClassConstructorFromName(name, scope);
//    }
//
//    private getFullClassName(name: string, scope: string[] = []) {
//        return new ClassDescription(name, scope, null).getFullClassName();
//    }
//
//    private getClassConstructorFromName(name: string, scope: string[] = []): Function{
//        var currentScope = window;
//
//        scope.forEach((namespace: string)=>{
//            // cater for function namespacing ?
//            if(typeof currentScope[namespace] == "object") {
//                currentScope = currentScope[namespace];
//            } else {
//                throw new Error('Namespace does not exist:' + namespace + ' (' + this.getFullClassName(name, scope) + ')');
//            }
//        });
//
//        if(typeof currentScope[name] == "function") {
//            return currentScope[name];
//        } else {
//            throw new Error('Class does not exist: ' + this.getFullClassName(name, scope))
//        }
//    }
//}


export class AnnotatedClass {

    constructor(private classDescription: ClassDescription, private classAnnotations: ClassAnnotation[], private memberAnnotations: MemberAnnotation[]){
    }

    public getMemberAnnotations(): MemberAnnotation[] {
        return this.memberAnnotations;
    }

    public getClassAnnotations(): ClassAnnotation[] {
        return this.classAnnotations;
    }

    public getClass() {
        return this.classDescription;
    }

    public getAnnotationsForMember(memberName: string): MemberAnnotation[] {
        return this.memberAnnotations.filter((annotation: MemberAnnotation)=>{
            return annotation.getName() == memberName;
        });
    }

    public toJSON() {
        return {
            "classDescription": this.classDescription,
            "classAnnotations": this.classAnnotations,
            "memberAnnotations": this.memberAnnotations
        }
    }
}


export class ClassDescription {

    private className: string;
    private parent: string;

    constructor(classDescription: ClassDescriptionJson, parentDescription: ClassDescriptionJson = null) {
        if (classDescription.scope.length > 0) {
            this.className = classDescription.scope.join('.') + '.' + classDescription.name;
        } else {
            this.className = classDescription.name;
        }
        if (parentDescription) {
            if (parentDescription.scope.length > 0) {
                this.parent = parentDescription.scope.join('.') + '.' + parentDescription.name;
            } else {
                this.parent = parentDescription.name;
            }
        } else {
            this.parent = null;
        }
    }

    public getClassName() {
        return this.className;
    }

    public getParent() {
        return this.parent;
    }
}

export class Annotation {

    constructor(private annotation: string, private params: {} = {}) {}

    public getAnnotation() {
        return this.annotation;
    }

    public getParams() {
        return this.params;
    }

    public toJSON(): AnnotationDescription {
        return {
            "annotation": this.annotation,
            "params": this.params
        }
    }
}

export class ClassAnnotation {

    constructor(private classDescription: ClassDescription, private annotation: Annotation) {}

    public getClass() {
        return this.classDescription
    }

    public getAnnotation() {
        return this.annotation;
    }

    public toJSON(): ClassAnnotationDescription {
        return {
          //  "classDescription": this.classDescription,
            "annotation": this.annotation.toJSON()
        }
    }

}

export class MemberAnnotation {

    constructor (
        private name: string,
        private type: string,
        private annotation: Annotation
        ){}

    public getName() {
        return this.name;
    }

    public getType() {
        return this.type;
    }

    public getAnnotation() {
        return this.annotation;
    }

    public toJSON() : MemberAnnotationDescription {
        return {
            "name": this.name,
            "type": this.type,
            "annotation": this.annotation.toJSON()
        }
    }

}


export interface ClassDescriptionJson {
    name: string;
    scope: string[];
}


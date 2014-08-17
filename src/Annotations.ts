///<reference path="../defs/typescript.api.d.ts"/>
///<reference path="../defs/node.d.ts"/>

import tsapi = require("typescript-api");
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

export class AnnotationBuilder {

    public fromReflectedClass(reflectedClass: tsapi.Class) : AnnotatedClass {
        var classDescription = this.getClassDescription(reflectedClass);
        var variables = reflectedClass.variables;
        var comments = reflectedClass.comments;
        var methods = reflectedClass.methods;
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
                    var memberVariable = new VariableSpec (
                        variable.name,
                        variable.type.name,
                        variable.type.arrayCount > 0
                    );
                    membersAnnotations.push(
                        new MemberAnnotation(
                            memberVariable,
                            annotation
                        )
                    )
                });
            }
        }

        var methodAnnotations: MethodAnnotation[] = [];
        for(var i=0; i< methods.length; i++){
            var method = methods[i];
            var comments = method.comments;
            for(var j=0; j<comments.length; j++){
                var annotations = this.parseAnnotations(comments[j]);
                annotations.forEach((annotation)=>{
                    var returns = method.returns;
                    var type;
                    if (returns.scope.length > 0) {
                        type = returns.scope.join('.') + '.' + returns.name;
                    } else {
                        type = returns.name;
                    }
                    var spec = new FunctionSpec (
                        method.name,
                        new VariableSpec(
                            returns.name,
                            type,
                            returns.arrayCount > 0
                        )
                    );
                    methodAnnotations.push(
                        new MethodAnnotation(
                            spec,
                            annotation
                        )
                    )
                });
            }
        }

        return new AnnotatedClass(classDescription, classAnnotations, membersAnnotations, methodAnnotations);

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

export class AnnotatedClass {

    constructor(
        private classDescription: ClassDescription,
        private classAnnotations: ClassAnnotation[],
        private memberAnnotations: MemberAnnotation[],
        private methodAnnotations: MethodAnnotation[]
        ){
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

    public getMethodAnnotations() {
        return this.methodAnnotations;
    }

    public toJSON() {
        return {
            "classDescription": this.classDescription,
            "classAnnotations": this.classAnnotations,
            "memberAnnotations": this.memberAnnotations,
            "methodAnnotations": this.methodAnnotations
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

    public toJSON() {
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

    public toJSON() {
        return {
            "annotation": this.annotation
        }
    }

}


export class VariableSpec {
    constructor(
        private name: string,
        private type: string,
        private isArray: boolean
        ) {
    }

    public getName() {
        return this.name;
    }

    public getType() {
        return this.type;
    }

    public getIsArray() {
        return this.isArray;
    }

    public toJSON() {
        return {
            "name": this.name,
            "type": this.type,
            "isArray": this.isArray
        }
    }
}

export class FunctionSpec {

    constructor(
        private name: string,
        private returns: VariableSpec
        ) {
    }

    public getName() {
        return this.name;
    }

    public getReturns() {
        return this.returns;
    }

    public toJSON() {
        return {
            "name": this.name,
            "returns": this.returns
        }
    }
}

export class MemberAnnotation {

    constructor (
        private variable: VariableSpec,
        private annotation: Annotation
        ){}

    public getName() {
        return this.variable.getName();
    }

    public getType() {
        return this.variable.getType();
    }

    public getAnnotation() {
        return this.annotation;
    }

    public getIsArray() {
        return this.variable.getIsArray();
    }

    public getVariable() {
        return this.variable;
    }

    public toJSON() {
        return {
            "variable": this.variable,
            "annotation": this.annotation
        }
    }
}


export class MethodAnnotation {

    constructor (
        private fn: FunctionSpec,
        private annotation: Annotation
        ){}

    public getAnnotation() {
        return this.annotation;
    }

    public getFunctionSpec() {
        return this.fn;
    }

    public toJSON() {
        return {
            "method": this.fn,
            "annotation": this.annotation
        }
    }
}


export interface ClassDescriptionJson {
    name: string;
    scope: string[];
}

class Parser {

    public parse(inputFilePath: string, callback: (classAnnotations : AnnotatedClass[], reflectedClasses: tsapi.Class[]) => void) {
        if (fs.existsSync(inputFilePath)) {
            tsapi.resolve([inputFilePath], (resolved : tsapi.SourceUnit[]) => {
                if(true || tsapi.check(resolved)){
                    tsapi.compile(resolved, (compiled:tsapi.CompiledUnit[]) => {
                        var reflectedClasses: tsapi.Class[] = [];
                        compiled.forEach((unit) => {
                            this.getReflectedClassesFromScript(unit.script, reflectedClasses);
                        });
                        var annotations: AnnotatedClass[] = this.getAnnotationsFromReflectedClasses(reflectedClasses);
                        callback(annotations.reverse(), reflectedClasses);
                    })
                } else {
                    //throw new Error('Invalid code');
                    console.error('Invalid code');
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

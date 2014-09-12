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

    var dataString = '';
    var classes = {};
    annotations.forEach((classAnnotations: AnnotatedClass) => {
        var name = classAnnotations.getClass().getName();
        if (typeof classes[name] == 'undefined') {
            classes[name] = classAnnotations;
            //dataString += name + '.__annotationJson = ' + JSON.stringify(classAnnotations, undefined, prettify ? 2 : undefined) + ';\n';
            //dataString += name + '.__classDefinitionJson = ' + JSON.stringify(classAnnotations.getClass(), undefined, prettify ? 2 : undefined) + ';\n';
        } else {
            throw new Error('Duplicate class definition: ' + name);
        }
    });

    dataString += '(function (context) {\n  ';
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
        var classType = this.getClassDescription(reflectedClass);
        var variables = reflectedClass.variables;
        var comments = reflectedClass.comments;
        var methods = reflectedClass.methods;
        var annotatedTypes: AnnotatedType[] = [];
        comments.forEach((comment)=>{
            var annotations = this.parseAnnotations(comment);
            annotatedTypes.push(
                new AnnotatedType(
                    classType, annotations
                )
            )
        });

        for(var i=0; i< variables.length; i++){
            var variable = variables[i];
            var comments = variable.comments;
            var annotations: Annotation[] = [];
            for(var j=0; j<comments.length; j++){
                annotations = [].concat(annotations, this.parseAnnotations(comments[j]));
            }
            var memberVariable = new VariableType (
                variable.name,
                variable.type.name,
                variable.type.arrayCount > 0
            );
            annotatedTypes.push(
                new AnnotatedType(
                    memberVariable,
                    annotations
                )
            )
        }

        for(var i=0; i< methods.length; i++){
            var method = methods[i];
            var comments = method.comments;
            var annotations: Annotation[] = [];
            for(var j=0; j<comments.length; j++){
                annotations = [].concat(annotations, this.parseAnnotations(comments[j]));
            }
            var returns = method.returns;
            var type;
            if (returns.scope.length > 0) {
                type = returns.scope.join('.') + '.' + returns.name;
            } else {
                type = returns.name;
            }
            var spec = new FunctionType (
                method.name,
                new VariableType(
                    returns.name,
                    type,
                    returns.arrayCount > 0
                )
            );
            annotatedTypes.push(
                new AnnotatedType(
                    spec,
                    annotations
                )
            );
        }
        return new AnnotatedClass(classType, annotatedTypes);

    }

    private getClassDescription(reflectedClass: tsapi.Class): ClassType {
        var parentClass: ClassDescriptionJson;
        if (reflectedClass.extends.length > 0) {
            if(reflectedClass.extends.length != 1){
                throw new Error('Class extends more than one class. Not sure how to handle that');
            } else {
                parentClass = reflectedClass.extends[0];
            }
        }
        return new ClassType(reflectedClass, parentClass);
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

    private annotations: {[s: string] : AnnotatedType};
    constructor(
        private classDescription: ClassType,
        annotatedTypes: AnnotatedType[]
        ){
        this.annotations = {};
        annotatedTypes.forEach((annotatedType: AnnotatedType) => {
            if( annotatedType.getType() == "constructor") {
                this.annotations[annotatedType.getType()] = annotatedType;
            } else {
                this.annotations[annotatedType.getName()] = annotatedType;
            }
        });
    }
    public getClass() {
        return this.classDescription;
    }

    public addAnnotatedType(annotatedType: AnnotatedType) {
        var name = annotatedType.getName();
        if (this.annotations[name]) {
            var annotations = annotatedType.getAnnotations();
            for (var annotationName in annotations) {
                this.annotations[name].addAnnotation(annotations[annotationName]);
            }
        } else {
            this.annotations[name] = annotatedType;
        }
    }

    public toJSON() {
        return {
            "type": this.classDescription,
            "annotations": this.annotations
        };
    }
}


export class ClassType implements Type {

    private className: string;
    private parent: string;
    private type: string = 'constructor';

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

    public getName() {
        return this.className;
    }

    public getParent() {
        return this.parent;
    }

    public getType() {
        return this.type
    }

    public toJSON() {
        return {
            "name": this.className,
            "parent": this.parent,
            "type": this.type
        }
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

export interface Type {
    getName(): string;
    getType(): string;
}


export class VariableType implements Type {
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

export class FunctionType implements Type {

    private type: string = "function";

    constructor(
        private name: string,
        private returns: VariableType
        ) {
    }

    public getName() {
        return this.name;
    }

    public getType() {
        return this.type;
    }

    public getReturns() {
        return this.returns;
    }

    public toJSON() {
        return {
            "name": this.name,
            "type": this.type,
            "returns": this.returns
        }
    }
}

export class AnnotatedType {

    private annotations: {[s: string]: Annotation};
    constructor (
        private type: Type,
        annotations: Annotation[]
        ){
        this.annotations = {};
        annotations.map((annotation: Annotation)=>{
            this.annotations[annotation.getAnnotation()] = annotation;
        });
    }

    public getName() {
        return this.type.getName();
    }

    public getType() {
        return this.type.getType();
    }

    public getAnnotations() {
        return this.annotations;
    }

    public addAnnotation(annotation: Annotation) {
        if (!this.annotations[annotation.getAnnotation()]) {
            this.annotations[annotation.getAnnotation()] = annotation;
        }
    }

    public toJSON() {
        return {
            "type": this.type,
            "annotations": this.annotations
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



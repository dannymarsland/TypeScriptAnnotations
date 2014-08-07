///<reference path="../defs/typescript.api.d.ts"/>
///<reference path="../defs/node.d.ts"/>
var tsapi = require("typescript-api");

var fs = require('fs');

function getApplicationAnnotations(inputFile, callback) {
    var parser = new Parser();
    parser.parse(inputFile, function (classAnnotations, reflectedClasses) {
        var applicationAnnotations = new ApplicationAnnotations(inputFile, classAnnotations);
        callback(applicationAnnotations);
    });
}
exports.getApplicationAnnotations = getApplicationAnnotations;

function writeAnnotationsToFile(filePath, annotations, prettify) {
    if (typeof prettify === "undefined") { prettify = false; }
    var classes = {};
    annotations.forEach(function (classAnnotations) {
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

    dataString += '})(this);';
    fs.writeFileSync(filePath, dataString);
}
exports.writeAnnotationsToFile = writeAnnotationsToFile;

var ApplicationAnnotations = (function () {
    function ApplicationAnnotations(inputFile, classAnnotations) {
        this.inputFile = inputFile;
        this.classAnnotations = classAnnotations;
    }
    ApplicationAnnotations.prototype.getInputFile = function () {
        return this.inputFile;
    };

    ApplicationAnnotations.prototype.getClassAnnotations = function () {
        return this.classAnnotations;
    };
    return ApplicationAnnotations;
})();
exports.ApplicationAnnotations = ApplicationAnnotations;

var Parser = (function () {
    function Parser() {
    }
    Parser.prototype.parse = function (inputFilePath, callback) {
        var _this = this;
        if (fs.existsSync(inputFilePath)) {
            tsapi.resolve([inputFilePath], function (resolved) {
                if (tsapi.check(resolved)) {
                    tsapi.compile(resolved, function (compiled) {
                        var reflectedClasses = [];
                        compiled.forEach(function (unit) {
                            _this.getReflectedClassesFromScript(unit.script, reflectedClasses);
                        });
                        var annotations = _this.getAnnotationsFromReflectedClasses(reflectedClasses);
                        console.log('Number of classes:' + annotations.length);
                        callback(annotations.reverse(), reflectedClasses);
                    });
                } else {
                    throw new Error('Invalid code');
                }
            });
        } else {
            throw new Error('Input file does not exist ' + inputFilePath);
        }
    };

    Parser.prototype.getReflectedClassesFromScript = function (script, classes) {
        var _this = this;
        script.classes.forEach(function (tsClass) {
            classes.push(tsClass);
        });
        script.modules.forEach(function (tsModule) {
            _this.getReflectedClassesFromModule(tsModule, classes);
        });
    };

    Parser.prototype.getReflectedClassesFromModule = function (tsModule, classes) {
        var _this = this;
        tsModule.classes.forEach(function (tsClass) {
            classes.push(tsClass);
        });
        tsModule.modules.forEach(function (subModule) {
            _this.getReflectedClassesFromModule(subModule, classes);
        });
    };

    Parser.prototype.getAnnotationsFromReflectedClasses = function (reflectedClasses) {
        var builder = new AnnotationBuilder();
        var annotatedClasses = [];
        reflectedClasses.forEach(function (reflectedClass) {
            annotatedClasses.push(builder.fromReflectedClass(reflectedClass));
        });
        return annotatedClasses;
    };
    return Parser;
})();
exports.Parser = Parser;

var AnnotationBuilder = (function () {
    function AnnotationBuilder() {
    }
    AnnotationBuilder.prototype.fromReflectedClass = function (reflectedClass) {
        var _this = this;
        var classDescription = this.getClassDescription(reflectedClass);
        var variables = reflectedClass.variables;
        var comments = reflectedClass.comments;
        var classAnnotations = [];
        comments.forEach(function (comment) {
            var annotations = _this.parseAnnotations(comment);
            annotations.forEach(function (annotation) {
                classAnnotations.push(new ClassAnnotation(classDescription, annotation));
            });
        });

        var membersAnnotations = [];
        for (var i = 0; i < variables.length; i++) {
            var variable = variables[i];
            var comments = variable.comments;
            for (var j = 0; j < comments.length; j++) {
                var annotations = this.parseAnnotations(comments[j]);
                annotations.forEach(function (annotation) {
                    membersAnnotations.push(new MemberAnnotation(variable.name, variable.type.name, annotation));
                });
            }
        }

        return new AnnotatedClass(classDescription, classAnnotations, membersAnnotations);
    };

    AnnotationBuilder.prototype.getClassDescription = function (reflectedClass) {
        var parentClass;
        if (reflectedClass.extends.length > 0) {
            if (reflectedClass.extends.length != 1) {
                throw new Error('Class extends more than one class. Not sure how to handle that');
            } else {
                parentClass = reflectedClass.extends[0];
            }
        }
        return new ClassDescription(reflectedClass, parentClass);
    };

    AnnotationBuilder.prototype.parseAnnotations = function (comment) {
        var annotationMatches = comment.match(/\@([a-zA-Z\_\$1-5]+)(?:\([^\)]*\))?/g);
        if (annotationMatches) {
            return annotationMatches.map(function (match) {
                var bracketIndex = match.indexOf('(');
                var params = {};
                if (bracketIndex > -1) {
                    var name = match.substring(0, bracketIndex);
                    var paramString = match.substring(bracketIndex + 1, match.length - 1);
                    try  {
                        params = JSON.parse(paramString);
                    } catch (e) {
                        throw new Error('Invalid params (cannot parse) : ' + match);
                    }
                    if (typeof params !== "object") {
                        throw new Error('Invalid params: ' + match);
                    }
                } else {
                    var name = match;
                }
                name = name.replace('@', '');

                return (new Annotation(name, params));
            });
        } else {
            return [];
        }
    };
    return AnnotationBuilder;
})();
exports.AnnotationBuilder = AnnotationBuilder;

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
var AnnotatedClass = (function () {
    function AnnotatedClass(classDescription, classAnnotations, memberAnnotations) {
        this.classDescription = classDescription;
        this.classAnnotations = classAnnotations;
        this.memberAnnotations = memberAnnotations;
    }
    AnnotatedClass.prototype.getMemberAnnotations = function () {
        return this.memberAnnotations;
    };

    AnnotatedClass.prototype.getClassAnnotations = function () {
        return this.classAnnotations;
    };

    AnnotatedClass.prototype.getClass = function () {
        return this.classDescription;
    };

    AnnotatedClass.prototype.getAnnotationsForMember = function (memberName) {
        return this.memberAnnotations.filter(function (annotation) {
            return annotation.getName() == memberName;
        });
    };

    AnnotatedClass.prototype.toJSON = function () {
        return {
            "classDescription": this.classDescription,
            "classAnnotations": this.classAnnotations,
            "memberAnnotations": this.memberAnnotations
        };
    };
    return AnnotatedClass;
})();
exports.AnnotatedClass = AnnotatedClass;

var ClassDescription = (function () {
    function ClassDescription(classDescription, parentDescription) {
        if (typeof parentDescription === "undefined") { parentDescription = null; }
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
    ClassDescription.prototype.getClassName = function () {
        return this.className;
    };

    ClassDescription.prototype.getParent = function () {
        return this.parent;
    };
    return ClassDescription;
})();
exports.ClassDescription = ClassDescription;

var Annotation = (function () {
    function Annotation(annotation, params) {
        if (typeof params === "undefined") { params = {}; }
        this.annotation = annotation;
        this.params = params;
    }
    Annotation.prototype.getAnnotation = function () {
        return this.annotation;
    };

    Annotation.prototype.getParams = function () {
        return this.params;
    };

    Annotation.prototype.toJSON = function () {
        return {
            "annotation": this.annotation,
            "params": this.params
        };
    };
    return Annotation;
})();
exports.Annotation = Annotation;

var ClassAnnotation = (function () {
    function ClassAnnotation(classDescription, annotation) {
        this.classDescription = classDescription;
        this.annotation = annotation;
    }
    ClassAnnotation.prototype.getClass = function () {
        return this.classDescription;
    };

    ClassAnnotation.prototype.getAnnotation = function () {
        return this.annotation;
    };

    ClassAnnotation.prototype.toJSON = function () {
        return {
            //  "classDescription": this.classDescription,
            "annotation": this.annotation.toJSON()
        };
    };
    return ClassAnnotation;
})();
exports.ClassAnnotation = ClassAnnotation;

var MemberAnnotation = (function () {
    function MemberAnnotation(name, type, annotation) {
        this.name = name;
        this.type = type;
        this.annotation = annotation;
    }
    MemberAnnotation.prototype.getName = function () {
        return this.name;
    };

    MemberAnnotation.prototype.getType = function () {
        return this.type;
    };

    MemberAnnotation.prototype.getAnnotation = function () {
        return this.annotation;
    };

    MemberAnnotation.prototype.toJSON = function () {
        return {
            "name": this.name,
            "type": this.type,
            "annotation": this.annotation.toJSON()
        };
    };
    return MemberAnnotation;
})();
exports.MemberAnnotation = MemberAnnotation;

//# sourceMappingURL=Annotations.js.map

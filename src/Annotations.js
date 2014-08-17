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
        var name = classAnnotations.getClass().getName();
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

var AnnotationBuilder = (function () {
    function AnnotationBuilder() {
    }
    AnnotationBuilder.prototype.fromReflectedClass = function (reflectedClass) {
        var _this = this;
        var classType = this.getClassDescription(reflectedClass);
        var variables = reflectedClass.variables;
        var comments = reflectedClass.comments;
        var methods = reflectedClass.methods;
        var annotatedTypes = [];
        comments.forEach(function (comment) {
            var annotations = _this.parseAnnotations(comment);
            annotatedTypes.push(new AnnotatedType(classType, annotations));
        });

        for (var i = 0; i < variables.length; i++) {
            var variable = variables[i];
            var comments = variable.comments;
            var annotations = [];
            for (var j = 0; j < comments.length; j++) {
                annotations = [].concat(annotations, this.parseAnnotations(comments[j]));
            }
            var memberVariable = new VariableType(variable.name, variable.type.name, variable.type.arrayCount > 0);
            annotatedTypes.push(new AnnotatedType(memberVariable, annotations));
        }

        for (var i = 0; i < methods.length; i++) {
            var method = methods[i];
            var comments = method.comments;
            var annotations = [];
            for (var j = 0; j < comments.length; j++) {
                annotations = [].concat(annotations, this.parseAnnotations(comments[j]));
            }
            var returns = method.returns;
            var type;
            if (returns.scope.length > 0) {
                type = returns.scope.join('.') + '.' + returns.name;
            } else {
                type = returns.name;
            }
            var spec = new FunctionType(method.name, new VariableType(returns.name, type, returns.arrayCount > 0));
            annotatedTypes.push(new AnnotatedType(spec, annotations));
        }
        return new AnnotatedClass(classType, annotatedTypes);
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
        return new ClassType(reflectedClass, parentClass);
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

var AnnotatedClass = (function () {
    function AnnotatedClass(classDescription, annotatedTypes) {
        this.classDescription = classDescription;
        this.annotatedTypes = annotatedTypes;
    }
    AnnotatedClass.prototype.getClass = function () {
        return this.classDescription;
    };

    AnnotatedClass.prototype.toJSON = function () {
        var annotations = {};
        this.annotatedTypes.forEach(function (annotatedType) {
            if (annotatedType.getType() == "constructor") {
                annotations[annotatedType.getType()] = annotatedType;
            } else {
                annotations[annotatedType.getName()] = annotatedType;
            }
        });
        return {
            "type": this.classDescription,
            "annotations": annotations
        };
    };
    return AnnotatedClass;
})();
exports.AnnotatedClass = AnnotatedClass;

var ClassType = (function () {
    function ClassType(classDescription, parentDescription) {
        if (typeof parentDescription === "undefined") { parentDescription = null; }
        this.type = 'constructor';
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
    ClassType.prototype.getName = function () {
        return this.className;
    };

    ClassType.prototype.getParent = function () {
        return this.parent;
    };

    ClassType.prototype.getType = function () {
        return this.type;
    };

    ClassType.prototype.toJSON = function () {
        return {
            "name": this.className,
            "parent": this.parent,
            "type": this.type
        };
    };
    return ClassType;
})();
exports.ClassType = ClassType;

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

var VariableType = (function () {
    function VariableType(name, type, isArray) {
        this.name = name;
        this.type = type;
        this.isArray = isArray;
    }
    VariableType.prototype.getName = function () {
        return this.name;
    };

    VariableType.prototype.getType = function () {
        return this.type;
    };

    VariableType.prototype.getIsArray = function () {
        return this.isArray;
    };

    VariableType.prototype.toJSON = function () {
        return {
            "name": this.name,
            "type": this.type,
            "isArray": this.isArray
        };
    };
    return VariableType;
})();
exports.VariableType = VariableType;

var FunctionType = (function () {
    function FunctionType(name, returns) {
        this.name = name;
        this.returns = returns;
        this.type = "function";
    }
    FunctionType.prototype.getName = function () {
        return this.name;
    };

    FunctionType.prototype.getType = function () {
        return this.type;
    };

    FunctionType.prototype.getReturns = function () {
        return this.returns;
    };

    FunctionType.prototype.toJSON = function () {
        return {
            "name": this.name,
            "type": this.type,
            "returns": this.returns
        };
    };
    return FunctionType;
})();
exports.FunctionType = FunctionType;

var AnnotatedType = (function () {
    function AnnotatedType(type, annotations) {
        this.type = type;
        this.annotations = annotations;
    }
    AnnotatedType.prototype.getName = function () {
        return this.type.getName();
    };

    AnnotatedType.prototype.getType = function () {
        return this.type.getType();
    };

    AnnotatedType.prototype.getAnnotations = function () {
        return this.annotations;
    };

    AnnotatedType.prototype.toJSON = function () {
        var annotations = {};
        this.annotations.map(function (annotation) {
            annotations[annotation.getAnnotation()] = annotation;
        });
        return {
            "type": this.type,
            "annotations": annotations
        };
    };
    return AnnotatedType;
})();
exports.AnnotatedType = AnnotatedType;

var Parser = (function () {
    function Parser() {
    }
    Parser.prototype.parse = function (inputFilePath, callback) {
        var _this = this;
        if (fs.existsSync(inputFilePath)) {
            tsapi.resolve([inputFilePath], function (resolved) {
                if (true || tsapi.check(resolved)) {
                    tsapi.compile(resolved, function (compiled) {
                        var reflectedClasses = [];
                        compiled.forEach(function (unit) {
                            _this.getReflectedClassesFromScript(unit.script, reflectedClasses);
                        });
                        var annotations = _this.getAnnotationsFromReflectedClasses(reflectedClasses);
                        callback(annotations.reverse(), reflectedClasses);
                    });
                } else {
                    //throw new Error('Invalid code');
                    console.error('Invalid code');
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

//# sourceMappingURL=Annotations.js.map

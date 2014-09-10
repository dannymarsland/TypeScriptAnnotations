///<reference path="../defs/typescript.api.d.ts"/>
///<reference path="../src/Annotations.ts"/>

import Annotations = require("../src/Annotations");


var inputFile = __dirname + '/ExampleClass.ts';
console.log('Getting application annotations for ' + inputFile);

Annotations.getApplicationAnnotations(inputFile, (applicationAnnotations: Annotations.ApplicationAnnotations)=>{
    if(applicationAnnotations){
        //console.log('Class Annotations:',JSON.stringify(applicationAnnotations.getClassAnnotations(),undefined,2));
        Annotations.writeAnnotationsToFile(
            __dirname + '/output.js',
            applicationAnnotations.getClassAnnotations(),
            true
        );
    } else {
        console.error('An error must have occured');
    }
});
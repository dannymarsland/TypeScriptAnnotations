/*--------------------------------------------------------------------------

Copyright (c) 2013 haydn paterson (sinclair).  All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

--------------------------------------------------------------------------*/

declare module "typescript-api" {

    export class Diagnostic
    {
    public type       : string;
    public path       : string;
    public text       : string;
    public message    : string;
    public line_index : number;
    public char_index : number;
    public toString() : string;
    }

    export class Import
    {
        public name    : string;
        public alias   : string;
        public limChar : number;
        public minChar : number;
    }

    export class ReflectedType
    {
        public identifier : string;
        public name       : string;
        public scope      : string [];
    }

    export class Parameter extends ReflectedType
    {
        public type       : Type;
        public isOptional : boolean;
    }

    export class Method  extends ReflectedType
    {
        public parameters    : Array<Parameter>;
        public returns       : Type;
        public isPublic      : boolean;
        public isExported    : boolean;
        public isStatic      : boolean;
        public isAccessor    : boolean;
        public isSignature   : boolean;
        public isConstructor : boolean;
        public isCallMember  : boolean;
        public isDeclaration : boolean;
        public isExpression  : boolean;
        public isGetAccessor : boolean;
        public isSetAccessor : boolean;
        public isIndexer     : boolean;
        public comments      : string[];
    }

    export class Type extends ReflectedType
    {
        public arguments  : Array<Type>;
        public signature  : Method;
        public arrayCount : number;
    }

    export class Variable extends ReflectedType
    {
        public fullname                : string;
        public type                    : Type;
        public isPublic                : boolean;
        public isExported              : boolean;
        public isProperty              : boolean;
        public isStatic                : boolean;
        public isStatement             : boolean;
        public isExpression            : boolean;
        public isStatementOrExpression : boolean;
        public isOptional              : boolean;
        public comments                : string[];
    }

    export class Interface extends ReflectedType
    {
        public methods    : Array<Method>;
        public variables  : Array<Variable>;
        public parameters : Array<string>;
        public extends    : Array<Type>;
        public isExported : boolean;
        public comments   : string[];
    }

    export class Class extends ReflectedType
    {
        public methods    : Array<Method>;
        public variables  : Array<Variable>;
        public parameters : Array<string>;
        public extends    : Array<Type>;
        public implements : Array<Type>;
        public isExported : boolean;
        public comments   : string[];
    }

    export class Module extends ReflectedType
    {
        public imports    : Array<Import>;
        public modules    : Array<Module>;
        public interfaces : Array<Interface>;
        public classes    : Array<Class>;
        public methods    : Array<Method>;
        public variables  : Array<Variable>;
        public isExported : boolean;
    }

    export class Script extends ReflectedType
    {
        public modules    : Array<Module>;
        public interfaces : Array<Interface>;
        public classes    : Array<Class>;
        public methods    : Array<Method>;
        public variables  : Array<Variable>;
    }

    export class Unit
    {
        public path        : string;
        public content     : string;
        public diagnostics : Array<Diagnostic>;
        public hasError()  : boolean;
    }

    export class SourceUnit extends Unit
    {
        public remote        : boolean;
        public syntaxChecked : boolean;
        public typeChecked   : boolean;
    }

    export class CompiledUnit extends Unit
    {
        public ast          : any;
        public sourcemap    : string;
        public declaration  : string;
        public script       : Script;
        public references   : string[];
    }

    export class AST {

    }
    export interface ICompilerOptions {

        languageVersion          : string;

        moduleGenTarget          : string;

        generateDeclarationFiles : boolean;

        mapSourceFiles           : boolean;

        removeComments           : boolean;

        noImplicitAny            : boolean;

        allowBool                : boolean;

        outputMany               : boolean;
    }

    export function reset    (options?:ICompilerOptions) : void;

    export function register ()     : void;

    export function check    (units : Array<Unit>) : boolean;

    export function create   (path:string, content:string) : SourceUnit

    export function resolve  (sources:Array<string>, callback : (units : Array<SourceUnit> ) => void) : void;

    export function sort     (sourceUnits: Array<SourceUnit>) : Array<SourceUnit>;

    export function compile (sourceUnits: Array<SourceUnit>, callback : (compiledUnit:Array<CompiledUnit> )=> void) : void;

    export function run     (compiledUnits:Array<CompiledUnit>, sandbox:any, callback :{ (context:any): void; }) : void;

}
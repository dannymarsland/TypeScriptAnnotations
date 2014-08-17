///<reference path="ExampleClass2.ts"/>
module Module1 {

    /** @classannon */
    class ExampleClass extends Test.Module.ExampleClass2 {
        /**
         * @inject
         * */
        public exampleMember: string[];

        /**
         * @annotation
         * */
        public exampleMember55: boolean;

        /** @fuckingmethod */
        public myMethod(): string {
            return '12345';
        }
    }
}

class NoAnnotations {

}

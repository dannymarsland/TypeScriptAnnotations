var Test;
(function (Test) {
    (function (Module) {
        var ExampleClass2 = (function () {
            function ExampleClass2() {
            }
            return ExampleClass2;
        })();
        Module.ExampleClass2 = ExampleClass2;
    })(Test.Module || (Test.Module = {}));
    var Module = Test.Module;
})(Test || (Test = {}));
//# sourceMappingURL=ExampleClass2.js.map

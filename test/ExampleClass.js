var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
///<reference path="ExampleClass2.ts"/>
var Module1;
(function (Module1) {
    /** @classannon */
    var ExampleClass = (function (_super) {
        __extends(ExampleClass, _super);
        function ExampleClass() {
            _super.apply(this, arguments);
        }
        /** @fuckingmethod */
        ExampleClass.prototype.myMethod = function () {
            return '12345';
        };
        return ExampleClass;
    })(Test.Module.ExampleClass2);
})(Module1 || (Module1 = {}));

var NoAnnotations = (function () {
    function NoAnnotations() {
    }
    return NoAnnotations;
})();
//# sourceMappingURL=ExampleClass.js.map

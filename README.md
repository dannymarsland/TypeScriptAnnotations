#TypeScriptAnnotations

Work is currently being done on the TypeScript compiler to enable annotations in TypeScript here https://github.com/dannymarsland/TypeScript/tree/annotations

Once development has been complete this repository will become a sample project on how to use TypeScript Annotations. Until then, here is a glimpse of how I think it will look.


```typescript
class ExampleAnnotation {
    constructor(private name: String = "") {
    }

    public getName() : String {
        return this.name;
    }
}
```

```typescript
@MyAnnotation()
class AnnotatedClass {
    @MyAnnotation("example")
    public annotatedFunction() {

    }

    public nonAnnotatedFunction() {

    }
}
```

```typescript
var instance = new AnnotatedClass();

console.log(AnnotatedClass.getAnnotations())
console.log(instance.getAnnotations())
console.log(instance.annotatedFunction.getAnnotations())
console.log(instance.annotatedFunction.getAnnotation(MyAnnotation).getName())
console.log(instance.nonAnnotatedFunction.getAnnotations())

```


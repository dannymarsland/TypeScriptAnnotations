(function (context) {
  var data = {
  "Module1.ExampleClass": {
    "type": {
      "name": "Module1.ExampleClass",
      "parent": "Test.Module.ExampleClass2",
      "type": "constructor"
    },
    "annotations": {
      "constructor": {
        "type": {
          "name": "Module1.ExampleClass",
          "parent": "Test.Module.ExampleClass2",
          "type": "constructor"
        },
        "annotations": {
          "classannon": {
            "annotation": "classannon",
            "params": {}
          }
        }
      },
      "exampleMember": {
        "type": {
          "name": "exampleMember",
          "type": "string",
          "isArray": true
        },
        "annotations": {
          "inject": {
            "annotation": "inject",
            "params": {}
          }
        }
      },
      "exampleMember55": {
        "type": {
          "name": "exampleMember55",
          "type": "boolean",
          "isArray": false
        },
        "annotations": {
          "annotation": {
            "annotation": "annotation",
            "params": {}
          }
        }
      },
      "myMethod": {
        "type": {
          "name": "myMethod",
          "type": "function",
          "returns": {
            "name": "string",
            "type": "string",
            "isArray": false
          }
        },
        "annotations": {
          "fuckingmethod": {
            "annotation": "fuckingmethod",
            "params": {}
          }
        }
      }
    }
  },
  "NoAnnotations": {
    "type": {
      "name": "NoAnnotations",
      "parent": null,
      "type": "constructor"
    },
    "annotations": {}
  },
  "Test.Module.ExampleClass2": {
    "type": {
      "name": "Test.Module.ExampleClass2",
      "parent": null,
      "type": "constructor"
    },
    "annotations": {
      "yeah": {
        "type": {
          "name": "yeah",
          "type": "boolean",
          "isArray": false
        },
        "annotations": {
          "annotation": {
            "annotation": "annotation",
            "params": {
              "123": "yeah"
            }
          },
          "inject": {
            "annotation": "inject",
            "params": {}
          }
        }
      }
    }
  }
};
  if (typeof module === "object" && typeof module.exports !== "undefined") {
    module.exports = data;
  } else {
    context["__annotations"] = data;
  }
})(this);
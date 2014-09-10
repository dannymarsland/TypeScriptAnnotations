Module1.ExampleClass.__annotationJson = {
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
        "amethod": {
          "annotation": "amethod",
          "params": {}
        }
      }
    }
  }
};
Module1.ExampleClass.__classDefinitionJson = {
  "name": "Module1.ExampleClass",
  "parent": "Test.Module.ExampleClass2",
  "type": "constructor"
};
NoAnnotations.__annotationJson = {
  "type": {
    "name": "NoAnnotations",
    "parent": null,
    "type": "constructor"
  },
  "annotations": {}
};
NoAnnotations.__classDefinitionJson = {
  "name": "NoAnnotations",
  "parent": null,
  "type": "constructor"
};
Test.Module.ExampleClass2.__annotationJson = {
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
};
Test.Module.ExampleClass2.__classDefinitionJson = {
  "name": "Test.Module.ExampleClass2",
  "parent": null,
  "type": "constructor"
};
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
          "amethod": {
            "annotation": "amethod",
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
// Attribution https://github.com/caridy/redefine-custom-elements/blob/main/src/index.ts

var __extends =
  (this && this.__extends) ||
  (function () {
    var extendStatics = function (d, b) {
      extendStatics =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (d, b) {
            d.__proto__ = b;
          }) ||
        function (d, b) {
          for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
        };
      return extendStatics(d, b);
    };
    return function (d, b) {
      if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
      extendStatics(d, b);
      function __() {
        this.constructor = d;
      }
      d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __());
    };
  })();
var __spreadArray =
  (this && this.__spreadArray) ||
  function (to, from, pack) {
    if (pack || arguments.length === 2)
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
var cer = customElements;
var NativeHTMLElement = HTMLElement;
var _a = NativeHTMLElement.prototype,
  nativeHasAttribute = _a.hasAttribute,
  nativeSetAttribute = _a.setAttribute,
  nativeRemoveAttribute = _a.removeAttribute,
  nativeGetAttribute = _a.getAttribute;
var ReflectApply = Reflect.apply,
  ReflectSetPrototypeOf = Reflect.setPrototypeOf,
  ReflectConstruct = Reflect.construct;
var ObjectDefineProperties = Object.defineProperties;
var _b = CustomElementRegistry.prototype,
  nativeGet = _b.get,
  nativeDefine = _b.define,
  nativeWhenDefined = _b.whenDefined;
var nativeNodeIsConnectedGetter = Object.getOwnPropertyDescriptor(Node.prototype, "isConnected").get;
function valueToString(value) {
  try {
    return String(value);
    // eslint-disable-next-line no-empty
  } catch (_a) {}
  return "";
}
function createDefinitionRecord(constructor) {
  // Since observedAttributes can't change, we approximate it by patching
  // set/removeAttribute on the user's class
  var _a = constructor.prototype,
    connectedCallback = _a.connectedCallback,
    disconnectedCallback = _a.disconnectedCallback,
    adoptedCallback = _a.adoptedCallback,
    attributeChangedCallback = _a.attributeChangedCallback,
    formAssociatedCallback = _a.formAssociatedCallback,
    formDisabledCallback = _a.formDisabledCallback,
    formResetCallback = _a.formResetCallback,
    formStateRestoreCallback = _a.formStateRestoreCallback;
  var observedAttributes = new Set(constructor.observedAttributes || []);
  var formAssociated = constructor.formAssociated || false;
  return {
    LatestCtor: constructor,
    connectedCallback: connectedCallback,
    disconnectedCallback: disconnectedCallback,
    adoptedCallback: adoptedCallback,
    formAssociatedCallback: formAssociatedCallback,
    formDisabledCallback: formDisabledCallback,
    formResetCallback: formResetCallback,
    formStateRestoreCallback: formStateRestoreCallback,
    attributeChangedCallback: attributeChangedCallback,
    observedAttributes: observedAttributes,
    formAssociated: formAssociated,
  };
}
function getObservedAttributesOffset(originalDefinition, instancedDefinition) {
  // natively, the attributes observed by the registered definition are going to be taken
  // care of by the browser, only the difference between the two sets has to be taken
  // care by the patched version.
  return new Set(
    __spreadArray([], originalDefinition.observedAttributes, true).filter(function (x) {
      return !instancedDefinition.observedAttributes.has(x);
    })
  );
}
// Helper to patch CE class setAttribute/getAttribute to implement
// attributeChangedCallback
function patchAttributes(instance, originalDefinition, instancedDefinition) {
  var observedAttributes = instancedDefinition.observedAttributes,
    attributeChangedCallback = instancedDefinition.attributeChangedCallback;
  if (observedAttributes.size === 0 || !attributeChangedCallback) {
    return;
  }
  var offset = getObservedAttributesOffset(originalDefinition, instancedDefinition);
  if (offset.size === 0) {
    return;
  }
  // instance level patches
  ObjectDefineProperties(instance, {
    setAttribute: {
      value: function setAttribute(name, value) {
        if (offset.has(name)) {
          var old = nativeGetAttribute.call(this, name);
          // maybe we want to call the super.setAttribute rather than the native one
          nativeSetAttribute.call(this, name, value);
          attributeChangedCallback.call(this, name, old, valueToString(value));
        } else {
          nativeSetAttribute.call(this, name, value);
        }
      },
      writable: true,
      enumerable: true,
      configurable: true,
    },
    removeAttribute: {
      value: function removeAttribute(name) {
        if (offset.has(name)) {
          var old = nativeGetAttribute.call(this, name);
          // maybe we want to call the super.removeAttribute rather than the native one
          nativeRemoveAttribute.call(this, name);
          attributeChangedCallback.call(this, name, old, null);
        } else {
          nativeRemoveAttribute.call(this, name);
        }
      },
      writable: true,
      enumerable: true,
      configurable: true,
    },
  });
}
// Helper to create stand-in element for each tagName registered that delegates
// out to the internal registry for the given element
function createPivotingClass(originalDefinition, tagName) {
  var _a;
  return (
    (_a = /** @class */ (function (_super) {
      __extends(PivotCtor, _super);
      function PivotCtor(definition, args) {
        // This constructor can only be invoked by:
        // a) the browser instantiating  an element from parsing or via document.createElement.
        // b) new UserClass.
        var _this = ReflectConstruct(_super, [], new.target) || this;
        // b) user's initiated instantiation via new Ctor() in a sandbox
        if (definition) {
          internalUpgrade(_this, originalDefinition, definition, args);
          return _this;
        }
        // Schedule or upgrade instance
        definition = definitionsByTag.get(tagName);
        if (definition) {
          // browser's initiated a controlled instantiation where we
          // were able to set up the internal registry and the definition.
          internalUpgrade(_this, originalDefinition, definition);
        } else {
          // This is the case in which there is no definition yet, and
          // we need to add it to the pending queue just in case it eventually
          // gets defined locally.
          pendingRegistryForElement.set(_this, originalDefinition);
          // We need to install the minimum HTMLElement prototype so that
          // this instance works like a regular element without a registered
          // definition; #internalUpgrade will eventually install the full CE prototype
          ReflectSetPrototypeOf(_this, patchedHTMLElement.prototype);
        }
        return _this;
      }
      PivotCtor.prototype.connectedCallback = function () {
        var _b;
        var definition = definitionForElement.get(this);
        if (definition) {
          // Delegate out to user callback
          (_b = definition.connectedCallback) === null || _b === void 0 ? void 0 : _b.call(this);
        } else {
          // Register for upgrade when defined (only when connected, so we don't leak)
          var awaiting = awaitingUpgrade.get(tagName);
          if (!awaiting) {
            awaitingUpgrade.set(tagName, (awaiting = new Set()));
          }
          awaiting.add(this);
        }
      };
      PivotCtor.prototype.disconnectedCallback = function () {
        var _b;
        var definition = definitionForElement.get(this);
        if (definition) {
          // Delegate out to user callback
          (_b = definition.disconnectedCallback) === null || _b === void 0 ? void 0 : _b.call(this);
        } else {
          // Un-register for upgrade when defined (so we don't leak)
          var awaiting = awaitingUpgrade.get(tagName);
          if (awaiting) {
            awaiting.delete(this);
          }
        }
      };
      PivotCtor.prototype.adoptedCallback = function () {
        var _b;
        // TODO: this needs more work
        var definition = definitionForElement.get(this);
        (_b = definition === null || definition === void 0 ? void 0 : definition.adoptedCallback) === null ||
        _b === void 0
          ? void 0
          : _b.call(this);
      };
      PivotCtor.prototype.formAssociatedCallback = function () {
        var _b;
        var definition = definitionForElement.get(this);
        (_b = definition === null || definition === void 0 ? void 0 : definition.formAssociatedCallback) === null ||
        _b === void 0
          ? void 0
          : _b.apply(this, arguments);
      };
      PivotCtor.prototype.formDisabledCallback = function () {
        var _b;
        var definition = definitionForElement.get(this);
        (_b = definition === null || definition === void 0 ? void 0 : definition.formDisabledCallback) === null ||
        _b === void 0
          ? void 0
          : _b.apply(this, arguments);
      };
      PivotCtor.prototype.formResetCallback = function () {
        var _b;
        var definition = definitionForElement.get(this);
        (_b = definition === null || definition === void 0 ? void 0 : definition.formResetCallback) === null ||
        _b === void 0
          ? void 0
          : _b.apply(this, arguments);
      };
      PivotCtor.prototype.formStateRestoreCallback = function () {
        var _b;
        var definition = definitionForElement.get(this);
        (_b = definition === null || definition === void 0 ? void 0 : definition.formStateRestoreCallback) === null ||
        _b === void 0
          ? void 0
          : _b.apply(this, arguments);
      };
      PivotCtor.prototype.attributeChangedCallback = function () {
        var _b;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        var definition = definitionForElement.get(this);
        // if both definitions are the same, then the observedAttributes is the same,
        // but if they are different, only if the runtime definition has the attribute
        // marked as observed, then it should invoke attributeChangedCallback.
        if (
          originalDefinition === definition ||
          (definition === null || definition === void 0 ? void 0 : definition.observedAttributes.has(args[0]))
        ) {
          (_b = definition.attributeChangedCallback) === null || _b === void 0 ? void 0 : _b.apply(this, args);
        }
      };
      return PivotCtor;
    })(NativeHTMLElement)),
    (_a.observedAttributes = originalDefinition.observedAttributes),
    (_a.formAssociated = originalDefinition.formAssociated),
    _a
  );
}
var upgradingInstance;
var definitionForElement = new WeakMap();
var pendingRegistryForElement = new WeakMap();
var definitionForConstructor = new WeakMap();
var pivotCtorByTag = new Map();
var definitionsByTag = new Map();
var definitionsByClass = new Map();
var definedPromises = new Map();
var definedResolvers = new Map();
var awaitingUpgrade = new Map();
// Helper to upgrade an instance with a CE definition using "constructor call trick"
function internalUpgrade(instance, originalDefinition, instancedDefinition, args) {
  var _a;
  ReflectSetPrototypeOf(instance, instancedDefinition.LatestCtor.prototype);
  definitionForElement.set(instance, instancedDefinition);
  // attributes patches when needed
  if (instancedDefinition !== originalDefinition) {
    patchAttributes(instance, originalDefinition, instancedDefinition);
  }
  // Tricking the construction path to believe that a new instance is being created,
  // that way it will execute the super initialization mechanism but the HTMLElement
  // constructor will reuse the instance by returning the upgradingInstance.
  // This is by far the most important piece of the puzzle
  upgradingInstance = instance;
  // TODO: do we need to provide a newTarget here as well? if yes, what should that be?
  ReflectConstruct(instancedDefinition.LatestCtor, args || []);
  var observedAttributes = instancedDefinition.observedAttributes,
    attributeChangedCallback = instancedDefinition.attributeChangedCallback;
  if (observedAttributes.size > 0 && attributeChangedCallback) {
    var offset = getObservedAttributesOffset(originalDefinition, instancedDefinition);
    if (offset.size > 0) {
      // Approximate observedAttributes from the user class, but only for the offset attributes
      offset.forEach(function (name) {
        if (nativeHasAttribute.call(instance, name)) {
          var newValue = nativeGetAttribute.call(instance, name);
          attributeChangedCallback.call(instance, name, null, newValue);
        }
      });
    }
  }
  // connectedCallback retroactively invocation
  // TODO: I'm not sure this is really needed...
  if (ReflectApply(nativeNodeIsConnectedGetter, instance, [])) {
    (_a = instancedDefinition.disconnectedCallback) === null || _a === void 0 ? void 0 : _a.call(instance);
  }
}
function getDefinitionForConstructor(constructor) {
  if (!constructor || !constructor.prototype || typeof constructor.prototype !== "object") {
    throw new TypeError("The referenced constructor is not a constructor.");
  }
  var definition = definitionForConstructor.get(constructor);
  if (!definition) {
    definition = createDefinitionRecord(constructor);
    definitionForConstructor.set(constructor, definition);
  }
  return definition;
}
var patchedHTMLElement = function HTMLElement() {
  var _newTarget = this && this instanceof HTMLElement ? this.constructor : void 0;
  var args = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    args[_i] = arguments[_i];
  }
  if (!_newTarget) {
    throw new TypeError(
      "Failed to construct 'HTMLElement': Please use the 'new' operator, this DOM object constructor cannot be called as a function."
    );
  }
  if (_newTarget === patchedHTMLElement) {
    throw new TypeError("Illegal constructor");
  }
  // This constructor is ONLY invoked when it is the user instantiating
  // an element via `new Ctor()` while `this.constructor` is a locally
  // registered constructor, otherwise it throws.
  // Upgrading case: the pivoting class constructor was run by the browser's
  // native custom elements and we're in the process of running the
  // "constructor-call trick" on the natively constructed instance, so just
  // return that here
  var pendingUpgradeInstance = upgradingInstance;
  if (pendingUpgradeInstance) {
    upgradingInstance = undefined;
    return pendingUpgradeInstance;
  }
  var constructor = this.constructor;
  // Construction case: we need to construct the pivoting instance and return it
  // This is possible when the user instantiate it via `new LatestCtor()`.
  var definition = definitionsByClass.get(constructor);
  if (!definition || !definition.PivotCtor) {
    throw new TypeError("Illegal constructor");
  }
  // This constructor is ONLY invoked when it is the user instantiating
  // an element via new Ctor while Ctor is the latest registered constructor.
  return new definition.PivotCtor(definition, args);
};
patchedHTMLElement.prototype = NativeHTMLElement.prototype;
// patching global registry associated to the global object
Object.assign(CustomElementRegistry.prototype, {
  get: function () {
    var _a;
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    if (this !== cer) {
      // This is more restricted than native behavior because in native this is
      // going to leak constructors from another windows. But right now, I don't
      // know the implications yet, the safe bet is to throw here.
      // TODO: this could leak pivots from another document, that's the concern.
      throw new TypeError("Illegal invocation");
    }
    var tagName = args[0];
    return (
      // SyntaxError if The provided name is not a valid custom element name.
      ReflectApply(nativeGet, this, args) &&
      ((_a = definitionsByTag.get(tagName)) === null || _a === void 0 ? void 0 : _a.LatestCtor)
    );
  },
  define: function () {
    var _a;
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    if (this !== cer) {
      // This is more restricted than native behavior because in native this is
      // normally a runtime error when attempting to define a class that inherit
      // from a constructor from another window. But right now, I don't know how
      // to do this runtime check, the safe bet is to throw here.
      throw new TypeError("Illegal invocation");
    }
    var tagName = args[0],
      constructor = args[1],
      options = args[2];
    // TODO: I think we can support this just fine...
    if (options && options.extends) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw new DOMException("NotSupportedError: ");
    }
    var PivotCtor = ReflectApply(nativeGet, this, [tagName]); // SyntaxError if The provided name is not a valid custom element name.
    // TODO: do we really need to lower case this?
    // tagName = tagName.toLowerCase();
    if (
      PivotCtor &&
      PivotCtor !== ((_a = definitionsByTag.get(tagName)) === null || _a === void 0 ? void 0 : _a.PivotCtor)
    ) {
      // This is just in case that there is something defined that is not a controlled pivot
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw new DOMException(
        "Failed to execute 'define' on 'CustomElementRegistry': the name \"".concat(
          tagName,
          '" has already been used with this registry'
        )
      );
    }
    var definition = getDefinitionForConstructor(constructor);
    if (definitionsByClass.get(constructor)) {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw new DOMException(
        "Failed to execute 'define' on 'CustomElementRegistry': this constructor has already been used with this registry"
      );
    }
    definitionsByTag.set(tagName, definition);
    definitionsByClass.set(constructor, definition);
    PivotCtor = pivotCtorByTag.get(tagName);
    if (!PivotCtor) {
      PivotCtor = createPivotingClass(definition, tagName);
      pivotCtorByTag.set(tagName, PivotCtor);
      // Register a pivoting class which will handle global registry initializations
      ReflectApply(nativeDefine, this, [tagName, PivotCtor]);
    }
    // For globally defined custom elements, the definition associated
    // to the UserCtor has a back-pointer to PivotCtor in case the user
    // new the UserCtor, so we know how to create the underlying element.
    definition.PivotCtor = PivotCtor;
    // Upgrade any elements created in this scope before define was called
    // which should be exhibit by LWC using a tagName (in a template)
    // before the same tagName is registered as a global, while others
    // are already created and waiting in the global context, that will
    // require immediate upgrade when the new global tagName is defined.
    var awaiting = awaitingUpgrade.get(tagName);
    if (awaiting) {
      awaitingUpgrade.delete(tagName);
      awaiting.forEach(function (element) {
        var originalDefinition = pendingRegistryForElement.get(element);
        if (originalDefinition) {
          pendingRegistryForElement.delete(element);
          internalUpgrade(element, originalDefinition, definition);
        }
      });
    }
    // Flush whenDefined callbacks
    var resolver = definedResolvers.get(tagName);
    if (resolver) {
      resolver(constructor);
    }
  },
  whenDefined: function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    if (this !== cer) {
      // This is more restricted than native behavior because in native this is
      // going to leak constructors from another windows when defined. But right
      // now, I don't know the implications yet, the safe bet is to throw here.
      // TODO: maybe returning a promise that will never fulfill is better.
      throw new TypeError("Illegal invocation");
    }
    var tagName = args[0];
    // TODO: the promise constructor could be leaked here when using multi-window
    // we probably need to do something here to return the proper type of promise
    // we need more investigation here.
    return ReflectApply(nativeWhenDefined, this, args).then(function () {
      var promise = definedPromises.get(tagName);
      if (!promise) {
        var definition = definitionsByTag.get(tagName);
        if (definition) {
          return Promise.resolve(definition.LatestCtor);
        }
        var resolve_1;
        promise = new Promise(function (r) {
          resolve_1 = r;
        });
        definedPromises.set(tagName, promise);
        definedResolvers.set(tagName, resolve_1);
      }
      return promise;
    });
  },
  constructor: patchedHTMLElement,
});
// patching HTMLElement constructor associated to the global object
// @ts-ignore
window.HTMLElement = patchedHTMLElement;

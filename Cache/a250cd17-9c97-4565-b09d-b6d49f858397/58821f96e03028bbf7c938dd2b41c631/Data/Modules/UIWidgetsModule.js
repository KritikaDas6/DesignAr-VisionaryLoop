/**
 * @module UIWidgetsModule
 * base module for the new UI widgets
 * @author Snap Inc.
 * @version 1.1.0
 */

var WidgetTypes = {
    UIPanel: 0,
    UIButton: 1,
    UIToggle: 2,
    UIColorPicker: 3,
    UIPopup: 4,
    UIDiscretePicker: 5,
    UIToggleGroup: 6
}

var TouchClaimTypes = {
    Reject: 0,
    Share: 1,
    Claim: 2,
};

/**
 * iterates through ScriptComponents of sceneObject
 * 
 * @param {SceneObject} sceneObj 
 * @param {string} propName 
 * @param {function(Component){}} filterFunc 
 * @returns Component || null
 */
function findScript(sceneObj, propName, filterFunc) {
    var components = sceneObj.getComponents("ScriptComponent");
    for (var i = 0; i < components.length; i++) {
        if (propName && components[i][propName] === undefined) {
            continue;
        }
        if (filterFunc && !filterFunc(components[i])) {
            continue;
        }
        return components[i];
    }
    return null;
}
/**
 * Finds script component that has specified property and suffies filter fuction
 * @param {SceneObject} sceneObj : target scene object
 * @param {string} propName : property to look for
 * @param {function} filterFunc : filter function
 * @param {boolean} allowSelf : this object allowed if true
 * @returns Component || null
 */
function findScriptUpwards(sceneObj, propName, filterFunc, allowSelf) {
    if (allowSelf) {
        var res = findScript(sceneObj, propName, filterFunc);
        if (res) {
            return res;
        }
    }
    if (sceneObj.hasParent()) {
        return findScriptUpwards(sceneObj.getParent(), propName, filterFunc, true);
    }
    return null;
}

/**
 * 
 * @param {SceneObject} sceneObject 
 * @param {string} name 
 * @returns 
 */
function getChildByName(sceneObject, name) {
    if (sceneObject.name == name) {
        return sceneObject;
    }
    var count = sceneObject.getChildrenCount();
    for (var i = 0; i < count; i++) {
        var child = getChildByName(sceneObject.getChild(i), name);
        if (child != null) {
            return child;
        }
    }
    return null;
}

/**
 * 
 * @param {ScriptComponent} scr 
 * @param {string} funcName 
 * @returns 
 */
function getPendingCalls(scr, funcName) {
    var dic = setDefault(scr, "_pendingCalls", {});
    return setDefault(dic, funcName, []);
}

/**
 * 
 * @param {ScriptComponent} scr 
 * @param {string} funcName 
 * @param {any} args 
 */
function politeCall(scr, funcName, args) {
    if (!scr[funcName]) {
        getPendingCalls(scr, funcName).push(args);
    } else {
        scr[funcName].apply(null, args);
    }
}

/**
 * 
 * @param {ScriptComponent} scr 
 * @param {string} funcName 
 * @param {function} func 
 */
function answerPoliteCalls(scr, funcName, func) {
    func = func || scr[funcName];
    var pending = getPendingCalls(scr, funcName);
    for (var i = 0; i < pending.length; i++) {
        func.apply(null, pending[i]);
    }
}
/**
 * 
 * @param {string} eventName 
 * @param {ScriptComponent} scriptComponent 
 * @returns function 
 */
function callbackFromScriptInputs(eventName, scriptComponent) {
    switch (scriptComponent.callbackType) {
        case 1: // Behavior
            return function () {
                var behaviors = scriptComponent[eventName + "Behaviors"];
                if (!behaviors) {
                    print("WARNING: no event with name: " + eventName);
                    return;
                }
                for (var i = 0; i < behaviors.length; i++) {
                    if (behaviors[i] && behaviors[i].api.trigger) {
                        behaviors[i].api.trigger();
                    }
                }
            }
        case 2:
            return function () {
                if (!global.behaviorSystem) {
                    print("The global behavior system has not been instantiated yet! Make sure a Behavior script is present somewhere!");
                    return;
                }
                var triggerNames = scriptComponent[eventName + "GlobalBehaviors"];
                for (var j = 0; j < triggerNames.length; j++) {
                    if (triggerNames[j].length == 0) {
                        print("You are trying to send an empty string custom trigger!");
                        continue;
                    }
                    global.behaviorSystem.sendCustomTrigger(triggerNames[j]);
                }
            }
        case 3: // Custom Functions
            return function (eventData) {
                var otherScript = scriptComponent.customFunctionScript;
                if (!otherScript) {
                    print("Does not have a Script Component with custom functions assigned, but you are trying to invoke custom callbacks!");
                    return;
                }
                var functionNames = scriptComponent[eventName + "FunctionNames"];
                for (var k = 0; k < functionNames.length; k++) {
                    if (functionNames[k].length == 0) {
                        print("You are trying to invoke an empty string function!");
                        continue;
                    }
                    if (!otherScript.api[functionNames[k]] && !otherScript[functionNames[k]]) {
                        print("Cannot find the " + functionNames[k] + " function in the assigned Script Component!");
                        continue;
                    }
                    if (otherScript.api[functionNames[k]]) {
                        otherScript.api[functionNames[k]](eventData);
                    } else {
                        otherScript[functionNames[k]](eventData)
                    }
                }
            }
        case 4: //Set Object Property 
            //tbd
            break;
    }
}

/**
 * 
 * @param {function} refreshFunc 
 */
function RefreshHelper(refreshFunc) {
    this._refreshFunc = refreshFunc;
    this._needsRefresh = false;
    this._isRefreshing = false;
}

RefreshHelper.prototype = {
    requestRefresh: function () {
        if (this._isRefreshing) {
            this._needsRefresh = true;
            return;
        }
        this._isRefreshing = true;
        this._needsRefresh = false;
        this._refreshFunc();
        this._isRefreshing = false;
        if (this._needsRefresh) {
            this.requestRefresh();
        }
    }
};

/**
 * class Animation Helper
 * @param {ScriptComponent} scriptComponent 
 * @param {number} duration 
 * @param {function} getter 
 * @param {function} setter 
 * @param {function} lerpFunc 
 * @param {*} easing 
 */
function AnimationHelper(scriptComponent, duration, getter, setter, lerpFunc, easing) {
    this.scriptComponent = scriptComponent;

    this.animationEvent = null;

    this.defaultDuration = duration;

    this.currentAnimationTime = 0;
    this.currentDuration = .05;
    this.completedFullAnimation = false;

    this.getterFunc = getter;
    this.setterFunc = setter;

    this.lerpFunc = lerpFunc;

    this.optionalEasing = easing;

    this.currentStartValue = 0;
    this.currentEndValue = 1;

}

AnimationHelper.prototype = {
    startAnimation: function (endValue, duration) {
        if (duration !== undefined) {
            this.currentDuration = duration;
        }

        // If the last animation was fully completed, reset the animation time to the script value
        if (this.completedFullAnimation) {
            this.resetAnimationTime();
            this.completedFullAnimation = false;
        }

        this.currentDuration = this.currentAnimationTime;
        this.currentAnimationTime = 0;

        this.currentStartValue = this.getterFunc
            ? this.getterFunc()
            : (1 - this.currentDuration);
        this.currentEndValue = endValue;

        // Setup the animation update event
        this.removeAnimationEvent();
        this.animationEvent = this.scriptComponent.createEvent("UpdateEvent");
        this.animationEvent.bind(this.update.bind(this));
    },

    resetAnimationTime: function () {
        this.currentAnimationTime = this.defaultDuration;
    },

    removeAnimationEvent: function () {
        if (this.animationEvent) {
            this.scriptComponent.removeEvent(this.animationEvent);
            this.animationEvent.enabled = false;
            this.animationEvent = null;
        }
    },

    getCurrentT: function () {
        return (this.currentDuration > 0) ? (this.currentAnimationTime / this.currentDuration) : 1.0;
    },

    setCurrentT: function (t) {
        this.currentAnimationTime = this.currentDuration * t;
    },

    easeTValue: function (t) {
        return (this.optionalEasing) ? this.optionalEasing(t) : t;
    },

    lerpTValue: function (t) {
        return (this.lerpFunc)
            ? this.lerpFunc(this.currentStartValue, this.currentEndValue, t)
            : this.currentStartValue + (this.currentEndValue - this.currentStartValue) * t;
    },

    applyTValue: function (t) {
        var easedValue = this.easeTValue(t);
        var lerpedValue = this.lerpTValue(easedValue);

        this.setterFunc(lerpedValue);
    },

    update: function (eventData) {
        this.currentAnimationTime += eventData.getDeltaTime();

        var t = this.getCurrentT();
        if (t >= 1.0) {
            this.completedFullAnimation = true;
            t = 1.0;
            this.setCurrentT(t);
            this.removeAnimationEvent();
        }

        this.applyTValue(t);
    },
};

// Helper functions to configure AnimationHelper
AnimationHelper.prototype.configureForScreenTransformSize = function (screenTransform, optionalEasing) {
    this.getterFunc = makeSizeGetter(screenTransform);
    this.setterFunc = makeSizeSetter(screenTransform);
    this.lerpFunc = vec3Lerp;
    this.optionalEasing = optionalEasing;
};

AnimationHelper.prototype.configureForScreenTransformRotation = function (screenTransform, optionalEasing) {
    this.getterFunc = makeRotationGetter(screenTransform);
    this.setterFunc = makeRotationSetter(screenTransform);
    this.lerpFunc = floatLerp;
    this.optionalEasing = optionalEasing;
};
/**
 * 
 * @param {ScreenTransform} screenTransform 
 * @param {function} optionalEasing 
 */
AnimationHelper.prototype.configureForScreenTransformAnchorPosition = function (screenTransform, optionalEasing) {
    this.getterFunc = makeRectCenterGetter(screenTransform.anchors);
    this.setterFunc = makeRectCenterSetter(screenTransform.anchors);
    this.lerpFunc = vec2Lerp;
    this.optionalEasing = optionalEasing;
};

AnimationHelper.prototype.configureForScreenTransformOffsetPosition = function (screenTransform, optionalEasing) {
    this.getterFunc = makeRectCenterGetter(screenTransform.offsets);
    this.setterFunc = makeRectCenterSetter(screenTransform.offsets);
    this.lerpFunc = vec2Lerp;
    this.optionalEasing = optionalEasing;
};

AnimationHelper.prototype.configureForMeshVisualColor = function (visual, optionalEasing) {
    this.getterFunc = makeMultiGetter(makeColorGetter, visual);
    this.setterFunc = makeMultiSetter(makeColorSetter, visual);
    this.lerpFunc = vec4Lerp;
    this.optionalEasing = optionalEasing;
};

// Helper function to return LERP'ed value
function floatLerp(a, b, t) {
    return a + t * (b - a);
}

function vec2Lerp(a, b, t) {
    return vec2.lerp(a, b, t);
}

function vec3Lerp(a, b, t) {
    return vec3.lerp(a, b, t);
}

function vec4Lerp(a, b, t) {
    return vec4.lerp(a, b, t);
}

// Getter / Setter generators 
function makeRectCenterGetter(rect) {
    return function () {
        return rect.getCenter();
    };
}

function makeRectCenterSetter(rect) {
    return function (v) {
        rect.setCenter(v);
    };
}

function makeSizeGetter(screenTransform) {
    return function () {
        return screenTransform.scale;
    };
}

function makeSizeSetter(screenTransform) {
    return function (v) {
        screenTransform.scale = v;
    };
}

const DEG_TO_RAD = 0.0174533;
var RAD_TO_DEG = 57.2958;

function makeRotationGetter(screenTransform) {
    return function () {
        return screenTransform.rotation.toEulerAngles().z * RAD_TO_DEG;
    };
}

function makeRotationSetter(screenTransform) {
    return function (v) {
        screenTransform.rotation = quat.fromEulerAngles(0.0, 0.0, v * DEG_TO_RAD);
    };
}

function makeColorGetter(visual) {
    return function () {
        return visual.mainPass.baseColor;
    };
}

function makeColorSetter(visual) {
    return function (v) {
        visual.mainPass.baseColor = v;
    };
}

function makeMultiGetter(getterMaker, args) {
    return getterMaker(Array.isArray(args) ? args[0] : args);
}

function makeMultiSetter(setterMaker, args) {
    if (!Array.isArray(args)) {
        return setterMaker(args);
    }
    if (args.length == 1) {
        return setterMaker(args[0]);
    }
    var setters = args.map(setterMaker);
    return function (v) {
        for (var i = 0; i < setters.length; i++) {
            setters[i](v);
        }
    };
}

// Easing Helpers
function easeOutBack(t) {
    const s = 1.70158;
    return (t = t - 1) * t * ((s + 1) * t + s) + 1;
}

function setDefault(obj, key, def) {
    var hasKey = Object.prototype.hasOwnProperty.call(obj, key);
    if (!hasKey) {
        obj[key] = def;
        return def;
    }
    return obj[key];
}

function removeFromArray(array, element) {
    var index = array.indexOf(element);
    if (index > -1) {
        array.splice(index, 1);
        return true;
    }
    return false;
}

/**
 * sets render layer of instantiated children to match parent
 * @param {SceneObject} sceneObject 
 * @param {LayerSet} layer 
 */
function setRenderLayerRecursively(sceneObject, layer) {
    sceneObject.layer = layer;
    var child;
    for (var i = 0; i < sceneObject.getChildrenCount(); i++) {
        child = sceneObject.getChild(i);
        child.layer = layer;
        setRenderLayerRecursively(child, layer);
    }
}
/**
 * sets render order of instantiated children to match parent
 * @param {SceneObject} sceneObject 
 * @param {int} renderOrder 
 */
function setRenderOrderRecursively(sceneObject, renderOrder) {
    var visual = sceneObject.getComponent("Visual");
    if (visual) {
        visual.setRenderOrder(renderOrder);
    }
    for (var i = 0; i < sceneObject.getChildrenCount(); i++) {
        setRenderOrderRecursively(sceneObject.getChild(i), renderOrder);
    }
}

/**
 * Searches through the children of `sceneObject` and returns the first child found with a matching name.
 * NOTE: This function recursively checks the entire child hierarchy and should not be used every frame.
 * It's recommended to only run this function once and store the result.
 * @param {SceneObject} sceneObject Parent object to search the children of
 * @param {string} childName Object name to search for
 * @returns {SceneObject?} Found object (if any)
 */
function findChildObjectWithName(sceneObject, childName) {
    var childCount = sceneObject.getChildrenCount();
    var child;
    var res;
    for (var i = 0; i < childCount; i++) {
        child = sceneObject.getChild(i);
        if (child.name == childName) {
            return child;
        }
        res = findChildObjectWithName(child, childName);
        if (res) {
            return res;
        }
    }
    return null;
}
/**
* Returns the first Component of `componentType` found in the object or its children.
* @template {keyof ComponentNameMap} T
* @param {SceneObject} object Object to search
* @param {T} componentType Component type name to search for
* @returns {ComponentNameMap[componentType]} Matching Component in `object` and its children
*/
function getComponentRecursive(object, componentType) {
    var component = object.getComponent(componentType);
    if (component) {
        return component;
    }
    var childCount = object.getChildrenCount();
    for (var i = 0; i < childCount; i++) {
        var result = getComponentRecursive(object.getChild(i), componentType);
        if (result) {
            return result;
        }
    }
    return null;
}

module.exports.version = "1.1.0";
module.exports.WidgetTypes = WidgetTypes;
module.exports.TouchClaimTypes = TouchClaimTypes;

module.exports.findScript = findScript;
module.exports.findScriptUpwards = findScriptUpwards;
module.exports.getChildByName = getChildByName;

module.exports.politeCall = politeCall;
module.exports.answerPoliteCalls = answerPoliteCalls;

module.exports.callbackFromScriptInputs = callbackFromScriptInputs;
module.exports.findChildObjectWithName = findChildObjectWithName;
module.exports.getComponentRecursive = getComponentRecursive;
module.exports.setRenderLayerRecursively = setRenderLayerRecursively;
module.exports.setRenderOrderRecursively = setRenderOrderRecursively;

module.exports.RefreshHelper = RefreshHelper;
module.exports.AnimationHelper = AnimationHelper;

//make into module 
module.exports.EasingHelpers = {
    easeOutBack: easeOutBack,
};
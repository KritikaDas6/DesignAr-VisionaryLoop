// UI Button.js
// Version: 9.0
// Event: On Awake
// Description: Trigger events and behaviors by pressing the button

// ----- USAGE -----
// Attach this script to a Scene Object with a Screen Transform Component.
// Assign a Screen Image Object to the "Background Object" parameter
// 
// ----- LOCAL API USAGE -----
// Valid Event Types: "onEnableInteractable", "onDisableInteractable", "onPressDown", "onPressUp", "onPress"
//
// Add callback function to event when button was pressed down
// script.onPressDown.add(callback)
//
// Remove callback function from event when button was pressed down
// script.onPressDown.remove(callback)
//
// Add callback function to event when button was pressed up
// script.onPressUp.add(callback)
//
// Remove callback function from  event when button was pressed up
// script.onPressUp.remove(callback)
//
// Add callback function to event when button is pressed
// script.onPress.add(callback)
//
// Remove callback function from event
// script.onPress.remove(callback)

// Manually enable interactable
// script.enableInteractable()
//
// Manually disable interactable
// script.disableInteractable()
//
// True if interactable
// script.isInteractable()
//
// True if pressed
// script.isPressed()
//
// Enable touch events
// script.enableTouchEvents()
//
// Disable touch events
// script.disableTouchEvents()
//
// Manually trigger Press Down (call only when touch events are disabled)
// script.pressDown()
//
// Manually trigger Press Up (call only when touch events are disabled)
// script.pressUp()
//
// Change this button's animation type to a newType ("Bounce", "Squish", "Tween", "AnchorPosition", "OffsetPosition", "Rotation", or "Scale")
// script.changeAnimationType(newType)
//
// Set the value of one of this UI Button’s transition types ("Color", "Texture", "Tween", "AnchorPosition", "OffsetPosition", "Rotation", or "Scale") for when it switches to a different state ("normal", "pressed", or "disabled")
// script.changeStateValue(state, type, newValue)
//
// Get the current color of the Button's Background
// script.getColor()
//
// Get the current texture of the Button's Background
// script.getTexture()

// Get the text component of this button
// script.getTextComponent()
//
// -----------------

//@input bool interactable = true
//@input int renderOrderOverride = 0 {"label" : "Render Order"}
//@ui {"widget":"separator"}

//@input string text {"label":"Button Text"}

//@ui {"widget":"separator"}

//@input bool useColors = true 
//@ui {"widget":"group_start", "label":"Background Colors", "showIf":"useColors"}
//@input vec4 normalColor = {1, 1, 1, 1} {"widget":"color"}
//@input vec4 pressedColor = {0.45, 0.85, 1, 1} {"widget":"color"}
//@input vec4 disabledColor = {0.5, 0.5, 0.5, 1} {"widget":"color"}
//@ui {"widget":"group_end"}

//@ui {"widget":"separator"}
//@input bool useTextures = false
//@ui {"widget":"group_start", "label":"Foreground Textures", "showIf":"useTextures"}
//@input Asset.Texture normalTexture
//@input Asset.Texture pressedTexture
//@input Asset.Texture disabledTexture
//@ui {"widget":"group_end"}


//@ui {"widget":"separator"}
//@input bool editAnimations = false
//@ui {"widget":"group_start", "label":"Animations", "showIf":"editAnimations"}
//@input int animation = 0 {"label":"Animation Type", "widget":"combobox", "values":[{"label":"None", "value":0}, {"label":"Bounce", "value":1}, {"label":"Squish", "value": 2}, {"label":"Tween", "value": 3}, {"label":"Transform", "value":4}]}

//@ui {"widget":"group_start", "label":"Transform Properties", "showIf":"animation", "showIfValue":4}
//@input string transformType = "OffsetPosition" {"widget":"combobox", "values":[{"label":"Offset Position", "value":"OffsetPosition"}, {"label":"Anchor Position", "value":"AnchorPosition"}, {"label":"Rotation", "value":"Rotation"}, {"label":"Scale", "value": "Scale"}]}

//@input vec2 normalAnchorPosition {"showIf":"transformType", "showIfValue":"AnchorPosition"}
//@input vec2 pressedAnchorPosition {"showIf":"transformType", "showIfValue":"AnchorPosition"}
//@input vec2 disabledAnchorPosition {"showIf":"transformType", "showIfValue":"AnchorPosition"}

//@input vec2 normalOffsetPosition {"showIf":"transformType", "showIfValue":"OffsetPosition"}
//@input vec2 pressedOffsetPosition {"showIf":"transformType", "showIfValue":"OffsetPosition"}
//@input vec2 disabledOffsetPosition {"showIf":"transformType", "showIfValue":"OffsetPosition"}

//@input float normalRotation {"showIf":"transformType", "showIfValue":"Rotation"}
//@input float pressedRotation {"showIf":"transformType", "showIfValue":"Rotation"}
//@input float disabledRotation {"showIf":"transformType", "showIfValue":"Rotation"}

//@input vec3 normalScale = {1.0, 1.0, 1.0} {"showIf":"transformType", "showIfValue":"Scale"}
//@input vec3 pressedScale {"showIf":"transformType", "showIfValue":"Scale"}
//@input vec3 disabledScale {"showIf":"transformType", "showIfValue":"Scale"}
//@ui {"widget":"group_end"}

//@input SceneObject sceneObjectWithTweens {"showIf":"animation", "showIfValue":3}
//@input string normalTween {"showIf":"animation", "showIfValue":3}
//@input string pressedTween {"showIf":"animation", "showIfValue":3}
//@input string disabledTween {"showIf":"animation", "showIfValue":3}
//@ui {"widget":"group_end"}

//@ui {"widget":"separator"}
//@input bool editEventCallbacks = false
//@ui {"widget":"group_start", "label":"Event Callbacks", "showIf":"editEventCallbacks"}
//@input int callbackType = 0 {"widget":"combobox", "values":[{"label":"None", "value":0}, {"label":"Behavior Script", "value": 1}, {"label":"Behavior Custom Trigger", "value":2}, {"label":"Custom Function", "value":3}]}

//@input Component.ScriptComponent[] onPressDownBehaviors {"label":"On Press Down Behaviors", "showIf":"callbackType", "showIfValue":1}
//@ui {"widget":"separator", "showIf":"callbackType", "showIfValue":1}
//@input Component.ScriptComponent[] onPressUpBehaviors {"label":"On Press Up Behaviors", "showIf":"callbackType", "showIfValue":1}
//@ui {"widget":"separator", "showIf":"callbackType", "showIfValue":1}
//@input Component.ScriptComponent[] onPressBehaviors {"label":"On Press Behaviors", "showIf":"callbackType", "showIfValue":1}

//@input string[] onPressDownGlobalBehaviors {"label":"On Press Down Custom Triggers", "showIf":"callbackType", "showIfValue":2}
//@ui {"widget":"separator", "showIf":"callbackType", "showIfValue":2}
//@input string[] onPressUpGlobalBehaviors {"label":"On Press Up Custom Triggers", "showIf":"callbackType", "showIfValue":2}
//@ui {"widget":"separator", "showIf":"callbackType", "showIfValue":2}
//@input string[] onPressGlobalBehaviors {"label":"On Press Custom Triggers", "showIf":"callbackType", "showIfValue":2}

//@input Component.ScriptComponent customFunctionScript {"showIf":"callbackType", "showIfValue":3}
//@input string[] onPressDownFunctionNames {"label":"On Press Down Functions", "showIf":"callbackType", "showIfValue":3}
//@ui {"widget":"separator", "showIf":"callbackType", "showIfValue":3}
//@input string[] onPressUpFunctionNames {"label":"On Press Up Functions", "showIf":"callbackType", "showIfValue":3}
//@ui {"widget":"separator", "showIf":"callbackType", "showIfValue":3}
//@input string[] onPressFunctionNames {"label":"On Press Functions", "showIf":"callbackType", "showIfValue":3}
//@ui {"widget":"group_end"}

//@ui {"widget":"separator"}
//@input bool editConnections = false  {"label":"Customize"}
//@ui {"widget":"group_start", "label":"Prefabs", "showIf":"editConnections"}
//@input Asset.ObjectPrefab backgroundPrefab {"hint" : "Object Prefab with an Image component to use as a button background"}
//@input Asset.ObjectPrefab foregroundPrefab {"hint" : "Object Prefab with an Image component to use as a foreground background"}
//@input Asset.ObjectPrefab textPrefab {"hint" : "Object Prefab with a Text component to display text"}
//@ui {"widget":"group_end"}

//@input bool editDebugSettings = false
//@ui {"widget":"group_start", "label":"Debug Statements", "showIf":"editDebugSettings"}
//@input bool printDebugStatements = false {"label": "Print Info"}
//@input bool printWarningStatements = true {"label": "Print Warnings"}
//@input bool disableTouchEventsInput = false {"label": "Disable Touch"}
//@ui {"widget":"group_end"}

// script modules
var events = require("Modules/EventModule");
var ui = require("Modules/UIWidgetsModule");
var DestructionHelper = require("Modules/DestructionHelper");
var manager = new DestructionHelper(script);

// events 
var onEnableInteractable = new events.EventWrapper();
var onDisableInteractable = new events.EventWrapper();

var onPressDown = new events.EventWrapper();
var onPressUp = new events.EventWrapper();
var onPress = new events.EventWrapper();

var onTouchStart = new events.EventWrapper();
var onTouchMove = new events.EventWrapper();
var onTouchEnd = new events.EventWrapper();

var interactionComponent = null;

// Local API
script.pressDown = pressDown;
script.pressUp = pressUp;
script.enableInteractable = enableInteractable;
script.disableInteractable = disableInteractable;
script.isPressed = isPressed;
script.isInteractable = isInteractable;
script.enableTouchEvents = enableTouchEvents;
script.disableTouchEvents = disableTouchEvents;
script.changeAnimationType = changeAnimationType;
script.changeStateValue = changeStateValue;
script.getStateValue = getStateValue;
script.getColor = getColor;
script.getTexture = getTexture;
script.getTextComponent = getTextComponent;
script.setText = setText;
script.initialized = false;

script.widgetType = ui.WidgetTypes.UIButton;

script.setAutoResetEnabled = setAutoResetEnabled;

script.ownerScript = null;

// touch api for control from parent widget
script.touchStart = touchStart;
script.touchEnd = touchEnd;
script.touchMove = touchMove;

// event wrappers to add callbacks from other scripts
script.onEnableInteractable = onEnableInteractable;
script.onDisableInteractable = onDisableInteractable;

script.onPressDown = onPressDown;
script.onPressUp = onPressUp;
script.onPress = onPress;

script.allowTouchEvents = !script.disableTouchEventsInput;

var sceneObject = script.getSceneObject();
// Is this widget interactable?
var interactable = script.interactable;

// Relevant Components
var backgroundObject;
var backgroundScreenTransform = null;
var backgroundImage = null;
var foregroundObject = null;
var foregroundImage = null;
var foregroundScreenTransform = null;
var textComponent = null;

// Is this UI Button currently pressed?
var pressed = false;

// Last frame time the button was pressed. Used to detect if the object was disabled and unpress on enable.
var lastPressTime = null;
var autoResetEnabled = true;

// Stored animation states
var animations = {};
var animationTime = 0.15;
var transitionTime = 0.15;


var transformAnimationHelper = new ui.AnimationHelper(script, animationTime, null, null, null, null);
var transitionAnimationHelper = new ui.AnimationHelper(script, transitionTime, null, null, null, null);

// Use for Tween Animation
var currentTween = null;

// Has this UI Button been triggered at least once before?
var initialTrigger = false;

var refreshHelper = new ui.RefreshHelper(initParams);

script.setOwner = setOwner;
script.notifyOnInitialize = notifyOnInitialize;

initParams();

/**
 * refresh 
 */
function refresh() {
    refreshHelper.requestRefresh();
}

/**
 * @param {function} callback 
 */
function notifyOnInitialize(callback) {
    callback(script);
}

/**
 *  Initialize all parameters
 */
function initParams() {
    if (script.initialized) {
        return;
    }
    if (!initButton()
        || !initBackground()
        || !initMaterial()
        || !initAnimations()
        || !initEvents()
        || !initInteractable()
        || !initInputCallbacks()
        || !initRenderOrder()
    ) {
        return;
    }
    ui.answerPoliteCalls(script, "notifyOnInitialize");

    checkOwner();
    initializeTouches();

    script.initialized = true;
}

/**
 * looks for the parent widget
 */
function seekOwner() {
    ui.findScriptUpwards(sceneObject, "acceptChildWidget", function (scr) {
        return scr.acceptChildWidget(script);
    });
}
/**
 * set script owner script
 * @param {ScriptComponent} ownerScript 
 */
function setOwner(ownerScript) {
    script.ownerScript = ownerScript;
    refresh();
}
/**
 * checks if owner script exists
 * @returns boolean
 */
function checkOwner() {
    if (!script.ownerScript) {
        seekOwner();
    }
    return !!script.ownerScript;
}
/**
 * 
 * @param {boolean} enabled 
 */
function setAutoResetEnabled(enabled) {
    autoResetEnabled = enabled;
}

function initializeTouches() {
    interactionComponent = getOrAddComponent(backgroundObject, "InteractionComponent");
    interactionComponent.onTouchStart.add(touchStart);
    interactionComponent.onTouchMove.add(touchMove);
    interactionComponent.onTouchEnd.add(touchEnd);
}

/**
 * Initialize Button parameters
 * @returns boolean
 */
function initButton() {
    // Obtain the Screen Transform of this Button
    thisScreenTransform = getOrAddComponent(sceneObject, "ScreenTransform");
    return true;
}

/**
 * Initialize Background parameters
 * @returns boolean
 */
function initBackground() {
    // Obtain the Image Scene Object in children
    backgroundObject = findOrInstantiate(sceneObject, "Background", script.backgroundPrefab);
    backgroundImage = getOrAddComponent(backgroundObject, "Image");
    // Obtain Screen Transform Component from the Background
    backgroundScreenTransform = getOrAddComponent(backgroundObject, "ScreenTransform");

    if (script.useTextures) {
        foregroundObject = findOrInstantiate(sceneObject, "Image", script.foregroundPrefab);
        foregroundObject.setParent(backgroundObject);
        foregroundImage = getOrAddComponent(foregroundObject, "Image");
    }

    textComponent = ui.getComponentRecursive(sceneObject, "Text");
    if (!textComponent) {
        var textObject = findOrInstantiate(backgroundObject, "Text", script.textPrefab);
        textComponent = textObject.getComponent("Text");
    }
    textComponent.getSceneObject().setParent(backgroundObject);
    textComponent.text = script.text === undefined ? "" : script.text;
    return true;
}

/**
 * clones main material on material mesh visual
 * @param {MaterialMeshVisual} meshVisual 
 * @returns Asset.Material
 */
function cloneAndReplaceMaterial(meshVisual) {
    var clone = meshVisual.mainMaterial.clone();
    meshVisual.mainMaterial = clone;
    return clone;
}

/**
 * Initialize material properties 
 * @returns boolean
 */
function initMaterial() {
    var backgroundMat = cloneAndReplaceMaterial(backgroundImage);
    // Initialize state colors
    if (!script.useColors) {
        script.normalColor = backgroundMat.mainPass.baseColor;
        script.pressedColor = backgroundMat.mainPass.baseColor;
        script.disabledColor = backgroundMat.mainPass.baseColor;
    }

    // Initialize extra color receivers
    var receivers = [backgroundImage];
    transitionAnimationHelper.configureForMeshVisualColor(receivers);

    // Initialize state textures

    if (script.useTextures) {
        var foregroundMat = cloneAndReplaceMaterial(foregroundImage);
        script.normalTexture = script.normalTexture || foregroundMat.mainPass.baseTex;
        script.pressedTexture = script.pressedTexture || foregroundMat.mainPass.baseTex;
        script.disabledTexture = script.disabledTexture || foregroundMat.mainPass.baseTex;
        setTexture(interactable ? script.normalTexture : script.disabledTexture);
    }
    return true;
}

/**
 * 
 * @returns Calculate animated rotation and scale values
 */

function initAnimations() {
    // Default easing curve used for animations
    const easingFunction = ui.EasingHelpers.easeOutBack;

    switch (script.animation) {
        case 1: // Bounce
            animations.normal = backgroundScreenTransform.scale;
            animations.pressed = animations.normal.uniformScale(0.8);
            animations.disabled = animations.normal;

            transformAnimationHelper.configureForScreenTransformSize(backgroundScreenTransform, easingFunction);
            break;
        case 2: // Squish
            animations.normal = backgroundScreenTransform.scale;
            animations.pressed = animations.normal.scale(new vec3(1.1, .8, 1));
            animations.disabled = animations.normal;

            transformAnimationHelper.configureForScreenTransformSize(backgroundScreenTransform, easingFunction);

            break;
        case 4: // Transform
            animations.normal = script["normal" + script.transformType];
            animations.pressed = script["pressed" + script.transformType];
            animations.disabled = script["disabled" + script.transformType];

            if (script.transformType == "OffsetPosition") {
                transformAnimationHelper.configureForScreenTransformOffsetPosition(backgroundScreenTransform, easingFunction);
            } else if (script.transformType == "AnchorPosition") {
                transformAnimationHelper.configureForScreenTransformAnchorPosition(backgroundScreenTransform, easingFunction);
            } else if (script.transformType == "Rotation") {
                transformAnimationHelper.configureForScreenTransformRotation(backgroundScreenTransform, easingFunction);
            } else if (script.transformType == "Scale") {
                transformAnimationHelper.configureForScreenTransformSize(backgroundScreenTransform, easingFunction);
            }
            break;
    }

    animations.currentAnimationState = "normal";
    return true;
}

/**
 * Initialize events and behaviors
 * @returns boolean
 */

function initEvents() {
    var updateEvent = script.createEvent("UpdateEvent");
    updateEvent.bind(onUpdate);
    return true;
}
/**
 * Initialize callbacks specified in script ui
 * @returns boolean
 */

function initInputCallbacks() {
    if (script.callbackType > 0) {
        onPressDown.add(ui.callbackFromScriptInputs("onPressDown", script));
        onPress.add(ui.callbackFromScriptInputs("onPress", script));
        onPressUp.add(ui.callbackFromScriptInputs("onPressUp", script));
    }
    return true;
}

/**
 * Initialize this Interactable
 * @returns boolean
 */
function initInteractable() {
    var state = interactable ? "normal" : "disabled";
    invokeVisualTransition(state);
    invokeAnimation(state, script.animation);
    return true;
}
/**
 * Disable all Touch Events
 */
function disableTouchEvents() {
    script.allowTouchEvents = false;
}

/**
 * Enable all Touch Events
 */
function enableTouchEvents() {
    script.allowTouchEvents = true;
}

/**
 * Called on Touch Start
 * @param {TouchStartEventArgs} eventData 
 * @returns 
 */
function touchStart(eventData) {
    if (!interactable) {
        return;
    }
    pressDown();
    onTouchStart.trigger(eventData);
}

/**
 * Called On Touch End
 * @param {TouchEndEventArgs} eventData 
 * @returns 
 */
function touchEnd(eventData) {
    if (!interactable) {
        return;
    }
    pressUp();
    onTouchEnd.trigger(eventData);
}

/**
 * Called On Touch Move
 * @param {TouchMoveEventArgs} eventData 
 * @returns 
 */
function touchMove(eventData) {
    if (!interactable) {
        return;
    }
    touchOffBoundsCheck(eventData);
    onTouchMove.trigger(eventData);
}

/**
 * Return true if button is currently being pressed, false otherwise
 * @returns boolean
 */
function isPressed() {
    return pressed;
}

/**
 * Return true if button is currently interactable, false otherwise
 * @returns boolean
 */
function isInteractable() {
    return interactable;
}

/**
 * Called every frame while button is updating
 * @param {UpdateEvent} eventData 
 * @returns 
 */
function onUpdate(eventData) {
    if (pressed) {
        if (autoResetEnabled) {
            var curTime = getTime();
            if (curTime - (lastPressTime + getDeltaTime()) > .1) {
                pressUp();
                return;
            }
            lastPressTime = curTime;
        }
        press();
    }
}

/**
 * Checks every frame if touch position is off this Screen Transform's boundaries. If so, Press Up
 * @param {TouchMoveEventArgs} eventData 
 */
function touchOffBoundsCheck(eventData) {
    if (!backgroundScreenTransform.containsScreenPoint(eventData.position)) {
        pressUp();
    }
}

/**
 * Press Down function
 */
function pressDown() {
    if (!interactable || (initialTrigger && pressed)) {
        return;
    }

    pressed = true;
    initialTrigger = true;
    lastPressTime = getTime();
    invokeVisualTransition("pressed");
    invokeAnimation("pressed", script.animation);

    onPressDown.trigger();
    printDebug("Press Down Event!");
}
/**
 * Press Up function
 */
function pressUp() {
    if (!interactable || (initialTrigger && !pressed)) {
        pressed = false;
        return;
    }
    pressed = false;
    initialTrigger = true;

    invokeVisualTransition("normal");
    invokeAnimation("normal", script.animation);

    onPressUp.trigger();
    printDebug("Press Up Event!");
}
/**
 * Called every frame while button is being pressed
 */

function press() {
    if (!interactable) {
        return;
    }
    onPress.trigger();
    printDebug("Press Event!");
}
/**
 * Disable this button
 */

function disableInteractable() {
    if (!interactable) {
        return;
    }
    interactable = false;

    invokeVisualTransition("disabled");
    invokeAnimation("disabled", script.animation);

    onDisableInteractable.trigger();
    printDebug("Disabled!");
}
/**
 * Enable this button
 */

function enableInteractable() {
    if (interactable) {
        return;
    }
    interactable = true;

    if (autoResetEnabled) {
        pressed = false;
    }

    var newState = (pressed) ? "pressed" : "normal";

    invokeVisualTransition(newState);
    invokeAnimation(newState, script.animation);

    onEnableInteractable.trigger();
    printDebug("Enabled!");
}

// Change the type of animation
function changeAnimationType(newType) {
    switch (newType) {
        case "None":
            script.animation = 0;
            break;
        case "Bounce":
            script.animation = 1;
            break;
        case "Squish":
            script.animation = 2;
            break;
        case "Tween":
            script.animation = 3;
            break;
        case "OffsetPosition":
            script.animation = 4;
            script.transformType = "OffsetPosition";
            break;
        case "AnchorPosition":
            script.animation = 4;
            script.transformType = "AnchorPosition";
            break;
        case "Rotation":
            script.animation = 4;
            script.transformType = "Rotation";
            break;
        case "Scale":
            script.animation = 4;
            script.transformType = "Scale";
            break;
        default:
            printWarning("trying to change the animation type to an invalid animation!");
            break;
    }

    initAnimations();
}

// Change one of the state parameters of this Button to a new value
function changeStateValue(state, type, newValue) {
    if (!script[state + type]) {
        printWarning("trying to change an invalid Button state on the Script Component!");
        return;
    }
    script[state + type] = newValue;
    initAnimations();
}

// Get one of the state parameters of this Button
function getStateValue(state, type) {
    if (!script[state + type]) {
        printWarning("trying to get an invalid Button state!");
        return;
    }
    return script[state + type];
}

// Invoke animation 
function invokeAnimation(animationState, animationType) {

    switch (animationType) {
        case 1: // Bounce
        case 2: // Squish
        case 4: // Transform
            var endState = animations[animationState];
            if (endState === undefined) {
                print("ERROR: missing animation state: " + animationState);
            } else {
                transformAnimationHelper.startAnimation(endState);
            }
            break;
        case 3: // Custom (Tween)
            if (currentTween) {
                global.tweenManager.stopTween(script.sceneObjectWithTweens, currentTween);
            }

            var animationTween = script[animationState + "Tween"];
            if (animationTween) {
                global.tweenManager.startTween(script.sceneObjectWithTweens, animationTween);
            }

            currentTween = animationTween;
            break;
    }
}

/**
 * Get the current color of the Background
 * @returns {vec4}
 */
function getColor() {
    return backgroundImage.mainPass.baseColor;
}

/**
 * Get the current texture of the Background
 * @returns {Asset.Texture}
 */
function getTexture() {
    return foregroundImage.mainPass.baseTex;
}

/**
 * Set texture
 * @param {Asset.Texture} texture 
 */
function setTexture(texture) {
    if (texture && script.useTextures) {
        foregroundImage.mainPass.baseTex = texture;
    }
}

/**
 * Set button text
 * @param {string} t 
 */
function setText(t) {
    if (textComponent) {
        textComponent.text = t;
    }
}

/**
 * get Text Component of this button
 * @returns {TextComponent}
 */
function getTextComponent() {
    return textComponent;
}

/**
 * Invoke visual transition (Color and/or Texture Swap)
 * @param {string} transitionState 
 */
function invokeVisualTransition(transitionState) {
    // Setup color lerp over time
    var endState = script[transitionState + "Color"];
    transitionAnimationHelper.startAnimation(endState);
    // Setup immediate Texture Swap
    var transitionTexture = script[transitionState + "Texture"];
    setTexture(transitionTexture);
}
/**
 * set render order of all children visuals
 * @returns {boolean}
 */
function initRenderOrder() {
    ui.setRenderOrderRecursively(sceneObject, script.renderOrderOverride);
    return true;
}
/**
 * checks if specified input provided and safely instantiates default prefab if not
 * @param {SceneObject} parent 
 * @param {string} name 
 * @param {ObjectPrefab} prefab 
 * @returns {SceneObject}
 */
function findOrInstantiate(parent, name, prefab) {
    var obj = ui.findChildObjectWithName(parent, name);
    if (!obj) {
        obj = manager.instantiatePrefab(prefab, parent);
        ui.setRenderLayerRecursively(obj, parent.layer);
        obj.layer = parent.layer;
        obj.name = name;
    }
    return obj;
}

/**
 * returns first component of type or safely creates new one
 * @param {SceneObject} obj 
 * @param {keyof ComponentNameMap} componentType 
 * @returns {Component}
 */
function getOrAddComponent(obj, componentType) {
    var component = obj.getComponent(componentType);
    if (isNull(component)) {
        printDebug(componentType + " component is not found, creating new " + componentType);
        return manager.createComponent(obj, componentType);
    }
    return component;
}
/**
 * Print debug messages
 * @param {any} message 
 */
function printDebug(message) {
    if (script.printDebugStatements) {
        print(sceneObject.name + " - " + message);
    }
}
/**
 * Print warning message
 * @param {any} message 
 */
function printWarning(message) {
    if (script.printWarningStatements) {
        print(sceneObject.name + " - WARNING, " + message);
    }
}

/**
 * Pointer.js
 * Version: 0.2.0
 * Description: Script for creating on-screen directional indicators ("arrows") to guide the user towards off-screen objects. 
 * Author: Bennyp3333 [https://benjamin-p.dev]
 * 
 * ==== Input ====
 * 
 * - Component.Camera worldCamera
 *   - The Perspective Camera used to calculate object visibility and positioning in the world.
 *     If not set, the script attempts to locate a default camera in the scene.
 * 
 * - Component.Camera pointerCamera
 *   - The camera used to render the arrows on-screen.
 * 
 * - Component.ScreenTransform screenRegion
 *   - A container for on-screen arrows. All arrow objects will be parented to this region.
 * 
 * - float arrowAlpha = 0.5
 *   - The maximum alpha value (opacity) for arrows when fully visible.
 * 
 * - float arrowSize = 2.0
 *   - The size of the arrows, defined as a uniform scale factor.
 * 
 * - Asset.Texture arrowTexture
 *   - The texture applied to the arrow indicators.
 * 
 * - Asset.Material arrowMaterial
 *   - The material applied to the arrow indicators.
 * 
 * - int nClosest
 *   - Limits the number of closest objects tracked by the script. Setting this to zero will display all arrows.
 * 
 * ==== Examples ====
 * 
 * // Adding Arrows:
 * var objectToTrack = script.getSceneObject();
 * var newArrow = script.addArrow(objectToTrack);
 * 
 * // Removing Arrows:
 * script.removeArrow(objectToTrack);
 * // or
 * script.removeArrow(newArrow);
 * 
 * ==== API ====
 * 
 * - Arrow(sceneObject):
 *   Represents an arrow linked to a scene object.
 * 
 *   - Methods:
 *     - fade(inOut, callback):
 *       Animates the arrow's opacity. Fades in (`inOut = true`) or fades out (`inOut = false`).
 *       - callback (function): Optional. Called after the fade animation completes.
 * 
 *     - setAlpha(alpha):
 *       Sets the arrow's opacity directly.
 *       - alpha (float): Value between 0 (fully transparent) and 1 (fully opaque).
 * 
 *     - kill(callback):
 *       Destroys the arrow and optionally calls a callback.
 * 
 *     - update():
 *       Updates the arrow's position, rotation, and visibility based on its linked object.
 * 
 * - script.addArrow(sceneObject):
 *   Creates an arrow for a specified SceneObject and adds it to the active arrow pool.
 * 
 * - script.removeArrow(sceneObjectOrArrow):
 *   Removes an arrow linked to a SceneObject or a specific Arrow instance.
 * 
 * - script.arrows:
 *   A dictionary containing all active arrows, indexed by their unique IDs.
 * 
 * ==== Notes ====
 * 
 * - Arrows fade in and out based on visibility conditions (on-screen or off-screen).
 * - Use `nClosest` to limit the number of arrows to avoid overwhelming the screen visually.
 */

//@input Component.Camera worldCamera
//@input Component.Camera pointerCamera
//@input Component.ScreenTransform screenRegion
//@ui {"widget":"separator"}
//@input float arrowAlpha = 0.5;
//@input float arrowSize = 2.0;
//@input Asset.Texture arrowTexture
//@input Asset.Material arrowMaterial
//@ui {"widget":"separator"}
//@input int nClosest
//@ui {"widget":"separator"}
//@input bool debug
//@input string debugName = "Pointer" {"showIf":"debug"}
//@input Component.Text debugText {"showIf":"debug"}

// Constants for edge offsets to ensure arrows don't overlap screen edges
var EDGE_OFFSETS = new vec2(0.1, 0.05);

// Store for arrow instances
script.arrows = {};

// Initialize parent object for arrows and other parameters
var arrowParent = script.screenRegion.getSceneObject();
var arrowAlpha = script.arrowAlpha;
var arrowSize = script.arrowSize;
var arrowTexture = script.arrowTexture;
var arrowMaterial = script.arrowMaterial;
var arrowIdx = 0;

var cameraComponent = script.worldCamera;
var cameraObject = null;
var cameraTransform = null;
var cameraAspectRatio = 9/16;

function init(){
    initCamera();
}

function initCamera(){
    if(!cameraComponent){
        cameraComponent = findFirstComponentByType(null, "Component.Camera");  
    }
    
    if(!cameraComponent){
        throw new Error("Camera not found! \nMake sure there is a camera in our scene or manually set the camera parameter in the Pointer script.");
    }
    
    cameraObject = cameraComponent.getSceneObject();
    cameraTransform = cameraObject.getTransform();
    
    cameraAspectRatio = cameraComponent.aspect;
    
    var deviceTrackingComponent = cameraObject.getComponent("Component.DeviceTracking");
    var deviceLocationTrackingComponent = cameraObject.getComponent("Component.DeviceLocationTrackingComponent");
    
    if(!deviceTrackingComponent && !deviceLocationTrackingComponent){
        throw new Error("Your main camera is currently missing a 'Device Tracking Component'.");
    }
    
    var isCameraPerspective = (cameraComponent.type == Camera.Type.Perspective);
    if(!isCameraPerspective){
        throw new Error("Wrong camera type! \nThe camera parameter must be a Perspective Camera, not an Orthographic Camera. \nNote: Do not use the Pointer Camera as the input.");
    }
    
    if(!script.pointerCamera.renderTarget){
        throw new Error("Pointer camera not rendering! \nMake sure there is a render target set for the pointer camera.");
    }
     
}

// Arrow class constructor for managing individual arrows
function Arrow(pointAt){
    this.id = arrowIdx++;
    this.initTime = getTime();
    
    this.withinScreen = false;
    this.isClose = false;
    this.visible = false;
    
    this.maxAlpha = arrowAlpha;
    this.currentAlpha = 0.0;
    
    this.tweens = [];
    
    this.pointAt = pointAt;
    
    this.createImage();  // Create arrow visuals
    this.setAlpha(0);
}

// Function to create the arrow image and setup visual properties
Arrow.prototype.createImage = function(){
    var cameraLayer = script.pointerCamera.renderLayer.numbers[0];
    this.imageObject = global.scene.createSceneObject("arrow_" + this.id);
    this.imageObject.setParent(arrowParent);
    this.imageObject.layer = LayerSet.fromNumber(cameraLayer);
    
    this.screenTransform = this.imageObject.createComponent("Component.ScreenTransform");
    this.screenTransform.anchors.setSize(vec2.zero());
    this.screenTransform.offsets.setSize(vec2.one().uniformScale(arrowSize));
    if(script.debug){
        this.screenTransform.enableDebugRendering = true;
    }
    
    this.image = this.imageObject.createComponent("Component.Image");
    this.image.addMaterial(arrowMaterial.clone());
    this.image.mainPass.baseTex = arrowTexture;
}

// Handles fade-in and fade-out animations for the arrow
Arrow.prototype.fade = function(inOut, callback = null){
    while(this.tweens.length > 0){
        this.tweens.pop().enabled = false;
    }
    
    var start = this.currentAlpha;
    var end = inOut ? this.maxAlpha : 0;
    
    this.tweens.push(simpleTween(0, 1, 0.25, 0, (tweenVal) => {
        var easedVal = easeOutQuad(tweenVal);
        var lerpedVal = MathUtils.lerp(start, end, easedVal);
        this.setAlpha(lerpedVal);
    }, () => {
        if(callback){ callback(); }
    }));
}

// Sets the arrow's transparency
Arrow.prototype.setAlpha = function(alpha){
    var currColor = this.image.mainPass.baseColor;
    currColor.a = alpha;
    this.image.mainPass.baseColor = currColor;
    this.currentAlpha = alpha;
}

// Function to remove the arrow with optional fade-out effect
Arrow.prototype.kill = function(callback){
    if(this.visible){
        this.fade(false, () => {
            this.imageObject.destroy();
            if(callback){
                callback();
            }
        });
        this.visible = false;
    }else{
        while(this.tweens.length > 0){
            this.tweens.pop().enabled = false;
        }
        this.imageObject.destroy();
        if(callback){
            callback();
        }
    }
}

// Updates arrow properties each frame
Arrow.prototype.update = function(){
    if(isNull(this.pointAt)){
        debugPrint("SceneObject that arrow " + this.id + " was referencing was destroyed.");
        deleteArrow(this);
        return;
    }
    
    //update position
    var pointAtPos = this.pointAt.getTransform().getWorldPosition();
    if(cameraComponent.isSphereVisible(pointAtPos, 0.01)){
        var screenPos = getScreenPos(this.pointAt);
        this.withinScreen = true;
    }else{
        var screenPos = getOffScreenPos(this.pointAt);
        this.withinScreen = false;
    }
    
    this.screenTransform.anchors.setCenter(screenPos);//TODO: offsets?
    
    //update rotation
    var angle = getRotationToCenter(screenPos);
    var imageRotation = quat.angleAxis(angle, vec3.forward());
    this.screenTransform.rotation = imageRotation;
    
    //update visibility
    var visibility = !this.withinScreen && this.isClose;
    if(visibility != this.visible){
        this.fade(visibility);
        this.visible = visibility;
    }
}

// Add an arrow pointing to a specific scene object
script.addArrow = function(sceneObject){
    var newArrow = new Arrow(sceneObject);
    script.arrows[newArrow.id] = newArrow;
    debugPrint("Arrow " + newArrow.id + " added.");
    checkUpdate();
}

// Remove an arrow based on scene object or arrow instance
script.removeArrow = function(sceneObjectOrArrow){
    if(sceneObjectOrArrow.isOfType("SceneObject")){
        for(let key in script.arrows){
            if(script.arrows[key].pointAt.isSame(sceneObjectOrArrow)){
                deleteArrow(script.arrows[key]);
            }
        }
    }else{
        deleteArrow(sceneObjectOrArrow);
    }
}

function deleteArrow(arrow){
    arrow.kill(() => {
        debugPrint("Arrow " + arrow.id + " removed.");
    });
    delete script.arrows[arrow.id];
    checkUpdate();
}

function getRelativePos(refObj, obj){
    var refTransform = refObj.getTransform();
    var objectTransform = obj.getTransform();
    var objectPos = objectTransform.getWorldPosition();
    
    var refMatrix = refTransform.getInvertedWorldTransform();

    var relativePos = refMatrix.multiplyPoint(objectPos);
    
    return relativePos;
}

function mapCircleToSquare(aspectRatio, unitVec2){
    var x = unitVec2.x;
    var y = unitVec2.y;
    
    if(aspectRatio < 1){
        x /= aspectRatio;
    }else{
        y *= aspectRatio;
    }

    var maxAbs = Math.max(Math.abs(x), Math.abs(y));

    if(maxAbs > 0){
        x /= maxAbs;
        y /= maxAbs;
    }

    return new vec2(x, y);
}

function getScreenPos(sceneObject){
    var worldPos = sceneObject.getTransform().getWorldPosition();
    
    var screenPos = cameraComponent.worldSpaceToScreenSpace(worldPos);
    var screenPosScaled = screenPos.sub(new vec2(0.5, 0.5)).scale(new vec2(2, -2));
    var screenPosClamped = clampToScreenEdge(screenPosScaled);
    
    return screenPosClamped;
}

function getOffScreenPos(sceneObject){
    var relativePos = getRelativePos(cameraObject, sceneObject);
    
    var rotTowards = vec3.forward().rotateTowards(relativePos, 1);
    var dir = rotTowards.sub(vec3.forward());

    var screenPos = mapCircleToSquare(cameraAspectRatio, new vec2(dir.x, dir.y));
    var screenPosClamped = clampToScreenEdge(screenPos);
    
    return screenPosClamped;
}

function clampToScreenEdge(screenPos){
    var clampedX = MathUtils.clamp(screenPos.x, EDGE_OFFSETS.x - 1, 1 - EDGE_OFFSETS.x);
    var clampedY = MathUtils.clamp(screenPos.y, EDGE_OFFSETS.y - 1, 1 - EDGE_OFFSETS.y);
    return new vec2(clampedX, clampedY);
}

function getRotationToCenter(screenPos){
    var directionToCenter = vec2.zero().sub(screenPos);
    var angleToCenter = Math.atan2(directionToCenter.y, directionToCenter.x);
    return angleToCenter;
}

function markNClosest(arrowsDict, n){
    for(let key in arrowsDict){ arrowsDict[key].isClose = false; }
    
    var cameraPosition = cameraObject.getTransform().getWorldPosition();
    var closest = [];
    
    for(let key in arrowsDict){
        var arrow = arrowsDict[key];
        var pointAtPos = arrow.pointAt.getTransform().getWorldPosition();
        var distance = cameraPosition.distanceSquared(pointAtPos);
        
        if(!arrow.withinScreen){
            closest.push({key: key, distance: distance});
        }

        if(n > 0 && closest.length > n){
            var maxIndex = 0;
            for(var i = 1; i < closest.length; i++){
                if(closest[i].distance > closest[maxIndex].distance){
                    maxIndex = i;
                }
            }
            closest.splice(maxIndex, 1);
        }
    }
    
    for(var i = 0; i < closest.length; i++){
        arrowsDict[closest[i].key].isClose = true;
    }
}

function updateArrows(){
    for(let key in script.arrows){
        script.arrows[key].update();
    }
    markNClosest(script.arrows, script.nClosest);
}

var updateEvent = script.createEvent("UpdateEvent");
updateEvent.enabled = false;
updateEvent.bind(updateArrows);

function checkUpdate(){
    if(Object.keys(script.arrows).length > 0){
        updateEvent.enabled = true;
    }else{
        updateEvent.enabled = false;
    }
}

function findFirstComponentByType(root, componentType) {
    if (root === null) {
        const rootObjectCount = global.scene.getRootObjectsCount();
        for (let i = 0; i < rootObjectCount; i++) {
            const rootObject = global.scene.getRootObject(i);
            const result = findFirstComponentByType(rootObject, componentType);
            if (result) {
                return result;
            }
        }
    } else {
        const components = root.getComponents(componentType);
        if (components.length > 0) {
            return components[0];
        }

        for (let i = 0; i < root.getChildrenCount(); i++) {
            const child = root.getChild(i);
            const result = findFirstComponentByType(child, componentType);
            if (result) {
                return result;
            }
        }
    }
    return null;
}

function simpleTween(startVal, endVal, time, delay, updateCallback, doneCallback){
    var acc = 0;
    var step = (endVal - startVal)/(30 * time);
    var inOut = endVal > startVal;
    var val = startVal;
    var tweenUpdate = script.createEvent("UpdateEvent");
    tweenUpdate.bind(function(eventData){
        if(acc >= delay){
            val += step;
            if((inOut && val >= endVal) || (!inOut && val <= endVal)){
                if(updateCallback){ updateCallback(endVal); }
                if(doneCallback){ doneCallback(endVal); }
                tweenUpdate.enabled = false;
            }else{
                if(updateCallback){ updateCallback(val); }
            }
        }else{
            acc += getDeltaTime();
        }
    });
    return tweenUpdate;
}

function easeOutQuad( t ) {
    return t * ( 2 - t );
}

function debugPrint(text){
    if(script.debug){
        var newLog = "Pointer: " + text;
        if(global.textLogger){ global.logToScreen(newLog); }
        if(script.debugText){ script.debugText.text = newLog; }
        print(newLog);
    }
}

global.Arrow = Arrow;
global.Pointer = script;

script.createEvent("OnStartEvent").bind(init);
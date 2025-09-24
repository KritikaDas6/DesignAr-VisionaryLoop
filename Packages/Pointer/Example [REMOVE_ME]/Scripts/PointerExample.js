//@input SceneObject testObject

var self = script.getSceneObject();
var cameraComponent = null;

var maxTestObjects = 5;
var testObjects = [];

function init(){
    cameraComponent = findFirstComponentByType(null, "Component.Camera");
    
    print("Tap screen to generate an object to point at!");
}

var tapEvent = script.createEvent("TapEvent");
tapEvent.bind(function(eventData){
    var tapPos = eventData.getTapPosition();
    var worldPos = cameraComponent.screenSpaceToWorldSpace(tapPos, 150);
    var newTestObj = createTestObject(worldPos);
    global.Pointer.addArrow(newTestObj);
});

function createTestObject(position){
    //copy test object
    var newTestObj = self.copyWholeHierarchy(script.testObject);
    
    //set position
    var newTestObjTrans = newTestObj.getTransform();
    newTestObjTrans.setWorldPosition(position);
    
    newTestObj.enabled = true;
    testObjects.push(newTestObj);
    
    if(testObjects.length > maxTestObjects){
        var testObjectToDestroy = testObjects.shift();
        global.Pointer.removeArrow(testObjectToDestroy);
        testObjectToDestroy.destroy();
    }
    
    return newTestObj;
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

script.createEvent("OnStartEvent").bind(init);
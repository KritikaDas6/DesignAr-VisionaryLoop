//@input SceneObject guideObject
//@input Component.Camera camera
//@input float distance = 50.0
//@input float verticalOffset = 10.0

function updateGuidePosition() {
    if (!script.guideObject || !script.camera) return;
    var camTransform = script.camera.getTransform();
    var camPos = camTransform.getWorldPosition();
    var camForward = camTransform.forward;
    var camUp = camTransform.up;
    // Calculate position: in front of camera, with a vertical offset
    var newPos = camPos.add(camForward.uniformScale(script.distance)).add(camUp.uniformScale(script.verticalOffset));
    script.guideObject.getTransform().setWorldPosition(newPos);
    // Make the guide always face the camera
    script.guideObject.getTransform().setWorldRotation(camTransform.getWorldRotation());
}

var updateEvent = script.createEvent("UpdateEvent");
updateEvent.bind(updateGuidePosition);

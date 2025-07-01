let inputSystem = global.inputSystem;

let onTap = inputSystem.registerListener(
    script,
    inputSystem.INPUT_TYPE_TAP,
    inputSystem.TAP_SOURCE_LEFT,
    () => {
        // This only runs once
        if (!cameraTexture) {
            cameraRequest = CameraModule.createCameraRequest();
            cameraRequest.cameraId = CameraModule.CameraId.Default_Color;

            cameraTexture = cameraModule.requestCamera(cameraRequest);
            cameraTextureProvider = cameraTexture.control;

            cameraTextureProvider.onNewFrame.add((cameraFrame) => {
                if (script.uiImage) {
                    script.uiImage.mainPass.baseTex = cameraTexture;
                }
            });
        }
    }
);



//let cameraModule = require('LensStudio:CameraModule');
//let cameraRequest;
//let cameraTexture;
//let cameraTextureProvider;
//
////@input Component.Image uiImage {"hint":"The image in the scene that will be showing the captured frame."}
//
//script.createEvent('OnStartEvent').bind(() => {
//  cameraRequest = CameraModule.createCameraRequest();
//  cameraRequest.cameraId = CameraModule.CameraId.Default_Color;
//
//  cameraTexture = cameraModule.requestCamera(cameraRequest);
//  cameraTextureProvider = cameraTexture.control;
//
//  cameraTextureProvider.onNewFrame.add((cameraFrame) => {
//    if (script.uiImage) {
//      script.uiImage.mainPass.baseTex = cameraTexture;
//    }
//  });
//});
let cameraModule = require('LensStudio:CameraModule');
let inputSystem = require('InputSystem'); // 👈 required to use Spectacles buttons

let cameraRequest;
let cameraTexture;
let cameraTextureProvider;

//@input Component.Image uiImage {"hint":"The image in the scene that will be showing the captured frame."}

// Listen for left button tap on Spectacles
inputSystem.registerListener(
    script,
    inputSystem.INPUT_TYPE_TAP,
    inputSystem.TAP_SOURCE_LEFT,
    () => {
        if (!cameraTexture) {
            cameraRequest = cameraModule.createCameraRequest();
            cameraRequest.cameraId = cameraModule.CameraId.Default_Color;

            cameraTexture = cameraModule.requestCamera(cameraRequest);
            cameraTextureProvider = cameraTexture.control;

            cameraTextureProvider.onNewFrame.add((cameraFrame) => {
                if (script.uiImage) {
                    script.uiImage.mainPass.baseTex = cameraTexture;
                }
            });

            // Optional: remove listener so it runs only once
            inputSystem.unregisterListener(script, inputSystem.INPUT_TYPE_TAP, inputSystem.TAP_SOURCE_LEFT);
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
let cameraModule = require('LensStudio:CameraModule');
let cameraRequest;
let cameraTexture;
let cameraTextureProvider;

//@input Component.Image uiImage {"hint":"The image in the scene that will be showing the captured frame."}

// Wait for the left button press to start the camera
script.createEvent('LeftButtonTapEvent').bind(function () {
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
    }
});



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
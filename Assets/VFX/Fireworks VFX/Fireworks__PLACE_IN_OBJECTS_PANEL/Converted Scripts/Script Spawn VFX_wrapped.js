function scriptBody(script){ 
// -----JS CODE-----

var vfxObjects = [];
var vfxAssets = [];

var numTaps = 0;

// Clone VFX assets  on init
for (var i = 0; i < script.MaxSystems; i++) {
    var newAsset = script.vfxAsset.clone();
    vfxAssets[i] = newAsset;
    
    vfxObjects[i] = global.scene.createSceneObject("vfx");
    var vfxComponent = vfxObjects[i].createComponent("Component.VFXComponent");
}


function onTapped(eventData)
{

    var tapPos = script.cam.screenSpaceToWorldSpace(eventData.getTapPosition(), 50);
    var id = numTaps % script.MaxSystems;
    
    // set vfx position tapPos
    vfxObjects[id].getTransform().setWorldPosition(tapPos);
    
    // Set the component to one of the cloned VFX assets
    var vfxComponent = vfxObjects[id].getComponent("Component.VFXComponent");    
    vfxComponent.asset = vfxAssets[id];
    
    vfxComponent.asset.properties.spawnTime = getTime();
    
    numTaps++;        

}

var event = script.createEvent("TapEvent");
event.bind(onTapped);

 }; module.exports = scriptBody;
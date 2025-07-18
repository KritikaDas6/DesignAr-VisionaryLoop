// -----JS CODE-----

// @input Asset.VFXAsset vfxAsset
// @input string propertyName
// @input bool resetValue
// @input int framesToReset { "showIf": "resetValue" }

var resetTriedCounter = 0;
var defVal = new vec2(-2.0, -2.0);
script.vfxAsset.properties[script.propertyName] = defVal;

function tryReset() {
    if (resetTriedCounter == script.framesToReset) {
        script.vfxAsset.properties[script.propertyName] = defVal;
        resetTriedCounter = 0;
        resetEventID.enabled = false;
    } else {
        resetTriedCounter++;
    }
}

var resetEventID = script.createEvent("UpdateEvent");
resetEventID.bind(tryReset)
resetEventID.enabled = false;

function delayedReset() {
    resetEventID.enabled = true;
}

function tapLogic(eventData) {
    var pos = eventData.getTapPosition()
    pos.y = 1.0-pos.y;
    script.vfxAsset.properties[script.propertyName] = pos;
    if (script.resetValue) {
        delayedReset();
    }
}

function touchLogic(eventData) {
    var pos = eventData.getTouchPosition()
    pos.y = 1.0-pos.y;
    script.vfxAsset.properties[script.propertyName] = pos;
    if (script.resetValue) {
        delayedReset();
    }
}

script.createEvent("TapEvent").bind(tapLogic);
script.createEvent("TouchMoveEvent").bind(touchLogic);

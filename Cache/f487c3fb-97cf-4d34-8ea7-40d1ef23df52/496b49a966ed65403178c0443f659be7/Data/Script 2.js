//@input Component.ScriptComponent targetScript

script.createEvent("TapEvent").bind(function () {
    if (script.targetScript && script.targetScript.api.onClick) {
        script.targetScript.api.onClick();
    }
});

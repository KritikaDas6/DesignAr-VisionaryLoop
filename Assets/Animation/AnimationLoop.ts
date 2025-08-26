@component
export class AnimationLoop extends BaseScriptComponent {
  
  @input
  private targetObject!: SceneObject; // SceneObject with Component.Image

  @input
  private startDelay: number = 2.95; // delay before animation starts (seconds)

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      const image = this.targetObject.getComponent("Component.Image") as Image;
      if (!image) { return; }

      const pass: any = image.getMaterial(0)?.getPass(0);
      const control: any = pass && (pass.customMap?.control || pass.baseTex?.control);
      if (!control) { return; }

      // Reset animation
      if (typeof control.reset === "function") { control.reset(); }

      // Start animation after delay
      const delayEvent = this.createEvent("DelayedCallbackEvent");
      delayEvent.bind(() => {
        if (typeof control.play === "function") {
          control.play(-1, 2.0); // -1 = loop infinitely, start at time 0.0
        }
      });
      delayEvent.reset(this.startDelay);
    });
  }
}
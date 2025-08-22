@component
export class AnimationLoop extends BaseScriptComponent {
  @input
  private revealObject: SceneObject;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      // Wait 2.95 seconds before starting the animation
      const startAnimationEvent = this.createEvent("DelayedCallbackEvent");
      startAnimationEvent.bind(() => {
        this.startLoopingAnimation();
        
        // Enable reveal object if specified
        if (this.revealObject) { this.revealObject.enabled = true; }
      });
      startAnimationEvent.reset(2.95);
    });
  }

  private startLoopingAnimation() {
    const image = this.getSceneObject().getComponent('Component.Image');
    if (!image) { return; }
    
    const pass: any = image.getMaterial(0).getPass(0);
    const control: any = (pass && (pass.customMap?.control || pass.baseTex?.control));
    if (!control) { return; }

    // Reset and start the animation in an infinite loop
    if (typeof control.reset === 'function') { control.reset(); }
    if (typeof control.play === 'function') { 
      // Play in infinite loop (-1 means infinite loop)
      control.play(-1, 0.0); 
    }
  }
}

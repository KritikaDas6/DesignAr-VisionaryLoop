@component
export class ChainedAnimations extends BaseScriptComponent {
  // (Optional) Audio that starts shortly after lens start
  @input("Asset.AudioTrackAsset")
  private audioTrack?: AudioTrackAsset;

  // First animated Image lives on THIS scene object
  // (same as your original script)
  @input
  private revealObject?: SceneObject;

  // Second animated Image lives on this SceneObject
  // (drag a SceneObject that has a Component.Image using a material with a "control")
  @input
  private secondAnimObject!: SceneObject;

  // Timing controls
  @input
  private switchTime: number = 2.95;      // when to pause #1 and start #2 (seconds)
  @input
  private secondDuration: number = 1.0;   // how long #2 runs before stopping (seconds)

  // If true, resume Animation #1 after #2 completes (from where it left off)
  @input
  private resumeFirstAfterSecond: boolean = false;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      // --- Find animation control #1 (from THIS SceneObject's Image)
      const img1 = this.getSceneObject().getComponent("Component.Image") as Image;
      const control1 = this.getControlFromImage(img1);
      if (!control1) { return; }

      // --- Find animation control #2 (from provided SceneObject)
      const img2 = this.secondAnimObject
        ? this.secondAnimObject.getComponent("Component.Image") as Image
        : null;
      const control2 = this.getControlFromImage(img2);

      // Initialize #1: reset & play immediately
      this.safeCall(control1, "reset");
      this.safeCall(control1, "play", -1, 0.0);

      // Optional reveal alignment whenever you want; leaving off until switch
      // Schedule the switch at t = switchTime
      const switchEvent = this.createEvent("DelayedCallbackEvent");
      switchEvent.bind(() => {
        // Pause #1
        this.safeCall(control1, "pause");

        // Reveal (if any)
        if (this.revealObject) { this.revealObject.enabled = true; }

        // Start #2 (if available)
        if (control2) {
          this.safeCall(control2, "reset");
          this.safeCall(control2, "play", -1, 0.0);

          // Stop #2 after secondDuration
          const stopSecondEvent = this.createEvent("DelayedCallbackEvent");
          stopSecondEvent.bind(() => {
            // Prefer pause; if stop exists, you can swap it
            this.safeCall(control2, "pause");
            // Optionally resume #1 after #2 finishes
            if (this.resumeFirstAfterSecond) {
              this.safeCall(control1, "play"); // resume from paused time
            }
          });
          stopSecondEvent.reset(this.secondDuration);
        }
      });
      switchEvent.reset(this.switchTime);

      // Optional: fire up audio with low latency shortly after start
      if (this.audioTrack) {
        const audio = this.getSceneObject().createComponent("Component.AudioComponent") as AudioComponent;
        audio.audioTrack = this.audioTrack;
        if (Audio?.PlaybackMode?.LowLatency !== undefined) {
          audio.playbackMode = Audio.PlaybackMode.LowLatency;
        }
        const audioEvent = this.createEvent("DelayedCallbackEvent");
        audioEvent.bind(() => audio.play(1));
        audioEvent.reset(0.1);
      }
    });
  }

  /** Safely extract the animation control handle from an Image's material. */
  private getControlFromImage(image?: Image | null): any | null {
    if (!image) { return null; }
    try {
      const mat = image.getMaterial(0);
      const pass: any = mat?.getPass(0);
      const control: any = pass && (pass.customMap?.control || pass.baseTex?.control);
      return control || null;
    } catch (e) {
      return null;
    }
  }

  /** Call a control method if it exists. */
  private safeCall(control: any, method: string, ...args: any[]) {
    if (control && typeof control[method] === "function") {
      try { control[method](...args); } catch (e) {/* noop */ }
    }
  }
}
@component
export class AnimationStop extends BaseScriptComponent {
  @input("Asset.AudioTrackAsset")
  private audioTrack: AudioTrackAsset;

  @input
  private revealObject: SceneObject;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      const image = this.getSceneObject().getComponent('Component.Image');
      if (!image) { return; }
      const pass: any = image.getMaterial(0).getPass(0);
      const control: any = (pass && (pass.customMap?.control || pass.baseTex?.control));
      if (!control) { return; }

      if (typeof control.reset === 'function') { control.reset(); }
      if (typeof control.play === 'function') { control.play(-1, 0.0); }

      const pauseEvent = this.createEvent("DelayedCallbackEvent");
      pauseEvent.bind(() => {
        if (typeof control.pause === 'function') { control.pause(); }
        if (this.revealObject) { this.revealObject.enabled = true; }
      });
      pauseEvent.reset(3.15);

      // Optional: start audio at t=3.0s
      if (this.audioTrack) {
        const audio = this.getSceneObject().createComponent("Component.AudioComponent") as AudioComponent;
        audio.audioTrack = this.audioTrack;
        // Prefer low-latency playback to better sync
        if (Audio?.PlaybackMode?.LowLatency !== undefined) {
          audio.playbackMode = Audio.PlaybackMode.LowLatency;
        }
        const audioEvent = this.createEvent("DelayedCallbackEvent");
        audioEvent.bind(() => audio.play(1));
        audioEvent.reset(0.1);
      }
    });
  }
}
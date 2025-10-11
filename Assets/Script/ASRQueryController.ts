
import { PinchButton_Modified } from "./PinchButton_Modified";
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";

/**
 * ASRQueryController - Handles voice recording and mic state switching
 */
@component
export class ASRQueryController extends BaseScriptComponent {
  // Scene references
  @input private button: PinchButton_Modified; // pinch button component
  @input private micDefaultObject: SceneObject; // idle mic icon
  @input private micActiveObject: SceneObject; // active mic icon
  @input private textDisplay: Text; // optional text display

  private asrModule: AsrModule = require("LensStudio:AsrModule"); // speech recognition module
  private isRecording = false;

  public onQueryEvent: Event<string> = new Event<string>(); // event hook

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.init.bind(this));
  }

  private init() {
    if (!this.button) {
      print("ASRQueryController: button not wired");
      return;
    }

    this.showDefaultMic();

    try {
      (this.button.onButtonPinched as any).removeAll?.();
    } catch (_) {}

    this.button.onButtonPinched.add(() => {
      this.getVoiceQuery()
        .then((query) => {
          print("ASR result: " + query);
          this.onQueryEvent.invoke(query);
          this.resetSession();
        })
        .catch((e) => {
          print("ASR canceled: " + e);
          this.resetSession();
        });
    });
  }

  private showDefaultMic() {
    if (this.micDefaultObject) this.micDefaultObject.enabled = true;
    if (this.micActiveObject) this.micActiveObject.enabled = false;
  }

  private showActiveMic() {
    if (this.micDefaultObject) this.micDefaultObject.enabled = false;
    if (this.micActiveObject) this.micActiveObject.enabled = true;
  }

  public resetSession() {
    try {
      this.asrModule.stopTranscribing();
    } catch (_) {}
    this.isRecording = false;

    if (this.textDisplay && this.textDisplay.text === "Listening...") {
      this.textDisplay.text = "";
    }

    this.showDefaultMic();

    if (this.button && (this.button as any).resetButton) {
      this.button.resetButton();
    }
  }

  public getVoiceQuery(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.asrModule.stopTranscribing();
      } catch (_) {}

      if (this.isRecording) {
        this.resetSession();
        reject("Already recording");
        return;
      }

      this.isRecording = true;
      this.showActiveMic();

      const opts = AsrModule.AsrTranscriptionOptions.create();
      opts.mode = AsrModule.AsrMode.HighAccuracy;
      opts.silenceUntilTerminationMs = 1500;

      opts.onTranscriptionUpdateEvent.add((out) => {
        if (this.textDisplay && out.text?.length > 0) {
          this.textDisplay.text = out.text;
        }
        if (out.isFinal) {
          this.resetSession();
          resolve(out.text);
        }
      });

      opts.onTranscriptionErrorEvent.add((err) => {
        this.resetSession();
        reject(err);
      });

      const guard = this.createEvent("DelayedCallbackEvent");
      guard.bind(() => {
        if (this.isRecording) {
          print("ASR timeout, forcing stop");
          this.resetSession();
          reject("timeout");
        }
      });
      guard.reset(8.0);

      if (this.textDisplay) this.textDisplay.text = "Listening...";
      this.asrModule.startTranscribing(opts);
    });
  }
}

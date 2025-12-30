
import { PinchButton } from "SpectaclesInteractionKit.lspkg/Components/UI/PinchButton/PinchButton";
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";

/**
 * ASRQueryController - Handles voice recording and mic state switching
 */
@component
export class ASRQueryController extends BaseScriptComponent {
  // Scene references
  @input private button: PinchButton; // pinch button component
  @input private micDefaultObject: SceneObject; // idle mic icon
  @input private micActiveObject: SceneObject; // active mic icon
  @input private textDisplay: Text; // optional text display

  private asrModule: AsrModule = require("LensStudio:AsrModule"); // speech recognition module
  private isRecording = false;

  public onQueryEvent: Event<string> = new Event<string>();
  public onTranscriptionUpdateEvent: Event<string> = new Event<string>();

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.init.bind(this));
  }

  private init() {
    if (!this.button) {
      print("ASRQueryController: ERROR - button not wired");
      return;
    }

    // Check if ASR module is available
    if (!this.asrModule) {
      print("ASRQueryController: ERROR - AsrModule not available. Check Lens Studio version and ASR module availability");
      return;
    }

    this.showDefaultMic();

    try {
      (this.button.onButtonPinched as any).removeAll?.();
    } catch (_) {}

    this.button.onButtonPinched.add(() => {
      print("ASRQueryController: Button pinched, starting voice query...");
      this.getVoiceQuery()
        .then((query) => {
          print("ASR result: " + query);
          this.onQueryEvent.invoke(query);
          this.resetSession();
        })
        .catch((e) => {
          print("ASRQueryController: ASR error/canceled - " + e);
          this.resetSession();
        });
    });
    
    print("ASRQueryController: Initialized successfully");
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

    // Note: resetButton() is not part of the standard PinchButton API
    // Only available on PinchButton_Modified, so we check and cast if it exists
    if (this.button && (this.button as any).resetButton) {
      (this.button as any).resetButton();
    }
  }

  public getVoiceQuery(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Validate ASR module
      if (!this.asrModule) {
        print("ASRQueryController: ERROR - AsrModule is null");
        reject("AsrModule not available");
        return;
      }

      try {
        this.asrModule.stopTranscribing();
      } catch (e) {
        print("ASRQueryController: Warning - Error stopping previous transcription: " + e);
      }

      if (this.isRecording) {
        print("ASRQueryController: Warning - Already recording, resetting session");
        this.resetSession();
        reject("Already recording");
        return;
      }

      this.isRecording = true;
      this.showActiveMic();
      print("ASRQueryController: Starting transcription...");

      try {
        const opts = AsrModule.AsrTranscriptionOptions.create();
        if (!opts) {
          print("ASRQueryController: ERROR - Failed to create AsrTranscriptionOptions");
          this.resetSession();
          reject("Failed to create transcription options");
          return;
        }

        opts.mode = AsrModule.AsrMode.HighAccuracy;
        opts.silenceUntilTerminationMs = 1500;

        opts.onTranscriptionUpdateEvent.add((out) => {
          if (out.text?.length > 0) {
            print("ASRQueryController: Transcription update: " + out.text);
            // Update internal text display if available
            if (this.textDisplay) {
              this.textDisplay.text = out.text;
            }
            // Fire event for external listeners (like ImageGenController)
            this.onTranscriptionUpdateEvent.invoke(out.text);
          }
          if (out.isFinal) {
            print("ASRQueryController: Final transcription: " + out.text);
            this.resetSession();
            resolve(out.text);
          }
        });

        opts.onTranscriptionErrorEvent.add((err) => {
          print("ASRQueryController: Transcription error: " + JSON.stringify(err));
          this.resetSession();
          reject(err);
        });

        const guard = this.createEvent("DelayedCallbackEvent");
        guard.bind(() => {
          if (this.isRecording) {
            print("ASRQueryController: Timeout, forcing stop");
            this.resetSession();
            reject("timeout");
          }
        });
        guard.reset(8.0);

        if (this.textDisplay) this.textDisplay.text = "Listening...";
        
        // Attempt to start transcribing
        try {
          this.asrModule.startTranscribing(opts);
          print("ASRQueryController: Transcription started successfully");
        } catch (startError) {
          print("ASRQueryController: ERROR - Failed to start transcribing: " + startError);
          this.resetSession();
          reject("Failed to start transcription: " + startError);
        }
      } catch (createError) {
        print("ASRQueryController: ERROR - Exception creating transcription options: " + createError);
        this.resetSession();
        reject("Failed to setup transcription: " + createError);
      }
    });
  }
}

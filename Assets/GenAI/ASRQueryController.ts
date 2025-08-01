import { PinchButton } from "SpectaclesInteractionKit/Components/UI/PinchButton/PinchButton";
import Event from "SpectaclesInteractionKit/Utils/Event";
import { LSTween } from "LSTween.lspkg/LSTween";

@component
export class ASRQueryController extends BaseScriptComponent {
  @input
  private button: PinchButton;
  @input
  private activityRenderMesh: RenderMeshVisual;
  @input
  private textDisplay: Text;
  private activityMaterial: Material;

  private asrModule: AsrModule = require("LensStudio:AsrModule");
  private isRecording: boolean = false;

  public onQueryEvent: Event<string> = new Event<string>();

  onAwake() {
    this.createEvent("OnStartEvent").bind(this.init.bind(this));
  }

  private init() {
    this.activityMaterial = this.activityRenderMesh.mainMaterial.clone();
    this.activityRenderMesh.clearMaterials();
    this.activityRenderMesh.mainMaterial = this.activityMaterial;
    this.activityMaterial.mainPass.in_out = 0;

    this.button.onButtonPinched.add(() => {
      this.getVoiceQuery().then((query) => {
        this.onQueryEvent.invoke(query);
      }).catch((err) => {
        print("ASR error: " + err);
      });
    });
  }

  public getVoiceQuery(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.isRecording) {
        this.animateVoiceIndicator(false);
        this.asrModule.stopTranscribing();
        this.isRecording = false;
        reject("Already recording, cancel recording");
        return;
      }

      this.isRecording = true;

      let asrSettings = AsrModule.AsrTranscriptionOptions.create();
      asrSettings.mode = AsrModule.AsrMode.HighAccuracy;
      asrSettings.silenceUntilTerminationMs = 1500; // reduced from 1500

      // Show placeholder instantly
      if (this.textDisplay) {
        this.textDisplay.text = "Listening...";
      }

      // Handle partial + final updates
      asrSettings.onTranscriptionUpdateEvent.add((asrOutput) => {
        if (this.textDisplay && asrOutput.text.length > 0) {
          this.textDisplay.text = asrOutput.text; // live transcription
        }

        if (asrOutput.isFinal) {
          this.isRecording = false;
          this.animateVoiceIndicator(false);
          this.asrModule.stopTranscribing();
          resolve(asrOutput.text);
        }
      });

      asrSettings.onTranscriptionErrorEvent.add((asrOutput) => {
        this.isRecording = false;
        this.animateVoiceIndicator(false);
        reject(asrOutput);
      });

      this.animateVoiceIndicator(true);
      this.asrModule.startTranscribing(asrSettings);
    });
  }

  private animateVoiceIndicator(on: boolean) {
    const duration = 100; // quicker animation
    if (on) {
      LSTween.rawTween(duration)
        .onUpdate((data) => {
          let percent = data.t as number;
          this.activityMaterial.mainPass.in_out = percent;
        })
        .start();
    } else {
      LSTween.rawTween(duration)
        .onUpdate((data) => {
          let percent = 1 - (data.t as number);
          this.activityMaterial.mainPass.in_out = percent;
        })
        .start();
    }
  }
}

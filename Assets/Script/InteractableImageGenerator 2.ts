

import { ImageGenerator } from "./ImageGenerator";
import { ASRQueryController } from "./ASRQueryController";

@component
export class InteractableImageGenerator extends BaseScriptComponent {
  // —— UI / config ——
  @ui.separator
  @ui.label("Example of using generative image APIs")
  @input
  @widget(
    new ComboBoxWidget([
      new ComboBoxItem("OpenAI", "OpenAI"),
      new ComboBoxItem("Gemini", "Gemini"),
    ])
  )
  private modelProvider: string = "OpenAI";

  @ui.separator
  @input private image: Image;
  @input private projectionImage: Image;
  @input private textDisplay: Text;
  @input private asrQueryController: ASRQueryController;
  @input private spinner: SceneObject;
  @input private nextButton: SceneObject;
  @input private micOff: SceneObject;
  @input private micOn: SceneObject;

  // —— internals ——
  private imageGenerator: ImageGenerator = null;
  private readonly base64Key = "confirmedImageB64";
  private isGenerating = false;
  private lastPrompt = "";

  // ===== persistence helpers =====
  private getStore(): GeneralDataStore | null {
    const pss = (global as any).persistentStorageSystem;
    if (!pss || !pss.store) {
      print("⚠️ PersistentStorageSystem not available");
      return null;
    }
    return pss.store as GeneralDataStore;
  }

  private setConfirmVisible(on: boolean) {
    if (this.nextButton) this.nextButton.enabled = on;
  }

  private saveImageToStorage() {
    const store = this.getStore();
    if (!store) return;

    const baseTex = this.image?.mainMaterial?.mainPass?.baseTex as Texture;
    if (!baseTex) {
      print("⚠️ No texture to save");
      return;
    }

    Base64.encodeTextureAsync(
      baseTex,
      (encoded: string) => {
        try {
          store.putString(this.base64Key, encoded);
          store.putString("last_save_ts", String(Math.floor(getTime())));
          if (this.textDisplay) this.textDisplay.text = "Created!";
        } catch (e) {
          print("❌ putString error: " + e);
        }
      },
      () => {
        print("❌ encode failed");
        if (this.textDisplay) this.textDisplay.text = "Save failed";
      },
      CompressionQuality.LowQuality,
      EncodingType.Jpg
    );
  }

  private restoreImageFromStorage() {
    const store = this.getStore();
    if (!store || !store.has(this.base64Key)) {
      this.setConfirmVisible(false);
      return;
    }

    const b64 = store.getString(this.base64Key);
    Base64.decodeTextureAsync(
      b64,
      (tex: Texture) => {
        if (this.image?.mainMaterial?.mainPass) {
          this.image.mainMaterial.mainPass.baseTex = tex;
        }
        if (this.projectionImage?.mainMaterial?.mainPass) {
          this.projectionImage.mainMaterial.mainPass.baseTex = tex;
        }
        if (this.textDisplay) this.textDisplay.text = "";
        this.setConfirmVisible(true);
      },
      () => {
        print("❌ decode failed");
        if (this.textDisplay) this.textDisplay.text = "Load failed";
        this.setConfirmVisible(false);
      }
    );
  }

  // ===== lifecycle =====
  onAwake() {
    this.imageGenerator = new ImageGenerator(this.modelProvider);

    // clone and share a safe material between the two Image components
    if (this.image && this.image.mainMaterial) {
      const imgMat = this.image.mainMaterial.clone();
      this.image.clearMaterials();
      this.image.mainMaterial = imgMat;

      if (this.projectionImage) {
        this.projectionImage.clearMaterials();
        this.projectionImage.mainMaterial = imgMat;
      }
    }

    this.createEvent("OnStartEvent").bind(() => {
      if (this.spinner) this.spinner.enabled = false;
      if (this.micOff) this.micOff.enabled = true;
      if (this.micOn) this.micOn.enabled = false;
      this.setConfirmVisible(false);

      // restore saved texture if present
      this.restoreImageFromStorage();

      // hook ASR
      if (this.asrQueryController && this.asrQueryController.onQueryEvent) {
        this.asrQueryController.onQueryEvent.add((query: string) => {
          if (this.isGenerating) {
            // ignore while generating
            try { this.asrQueryController.resetSession(); } catch (_) {}
            return;
          }

          const trimmed = (query || "").trim();
          const prompt = trimmed.length > 0 ? trimmed : this.lastPrompt;
          if (!prompt) {
            print("say a prompt once to seed lastPrompt");
            try { this.asrQueryController.resetSession(); } catch (_) {}
            return;
          }
          this.createImage(prompt);
        });
      }
    });
  }

  // ===== generation =====
  private createImage(prompt: string) {
    if (this.isGenerating) return;
    this.isGenerating = true;

    // record the prompt up front so a retry works even if this run fails
    this.lastPrompt = (prompt || "").trim();

    if (this.spinner) this.spinner.enabled = true;
    this.setConfirmVisible(false);
    if (this.textDisplay) this.textDisplay.text = "Generating: " + this.lastPrompt;

    // show mic off while busy
    if (this.micOn) this.micOn.enabled = false;
    if (this.micOff) this.micOff.enabled = true;

    this.imageGenerator
      .generateImage(this.lastPrompt)
      .then((tex: Texture) => {
        // apply texture
        if (this.image?.mainMaterial?.mainPass) {
          this.image.mainMaterial.mainPass.baseTex = tex;
        }
        if (this.projectionImage?.mainMaterial?.mainPass) {
          this.projectionImage.mainMaterial.mainPass.baseTex = tex;
        }

        // ui state
        if (this.textDisplay) this.textDisplay.text = this.lastPrompt;
        this.setConfirmVisible(true);

        // persist
        this.saveImageToStorage();
      })
      .catch((error) => {
        print("Error generating image: " + error);
        if (this.textDisplay) this.textDisplay.text = "Sorry something went wrong... Please try again!";
        this.setConfirmVisible(false);

        // immediately re-arm the mic so you can try again
        try { this.asrQueryController?.resetSession(); } catch (_) {}
        if (this.micOn) this.micOn.enabled = false; // idle visual
        if (this.micOff) this.micOff.enabled = true;
      })
      .finally(() => {
        if (this.spinner) this.spinner.enabled = false;
        this.isGenerating = false;

        // tiny cooldown so the next pinch isn't swallowed
        const rearm = this.createEvent("DelayedCallbackEvent");
        rearm.bind(() => {
          try { this.asrQueryController?.resetSession(); } catch (_) {}
          if (this.micOn) this.micOn.enabled = false; // stays off until user pinches again
          if (this.micOff) this.micOff.enabled = true;
        });
        rearm.reset(0.05);
      });
  }
}

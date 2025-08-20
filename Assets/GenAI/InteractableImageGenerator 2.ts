
import { ImageGenerator } from "./ImageGenerator";
import { ASRQueryController } from "./ASRQueryController";

@component
export class InteractableImageGenerator extends BaseScriptComponent {
  // === Inspector inputs ===
  @input private image: Image;
  @input private projectionImage: Image;
  @input private textDisplay: Text;
  @input private asrQueryController: ASRQueryController;
  @input private spinner: SceneObject;
  @input private nextButton: SceneObject; // not used for autosave, kept for later

  // === Internals ===
  private imageGenerator: ImageGenerator = null;
  private readonly base64Key = "confirmedImageB64";

  // Debug settings
  private readonly showBuildStamp = true;

  // ----------------------------------------
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
    print("Confirm visible: " + on);
  }

  onAwake() {
    // Build stamp (debug)
    if (this.showBuildStamp) {
      const stamp = "Build stamp: " + Math.floor(getTime());
      print("🔧 " + stamp);
      if (this.textDisplay) this.textDisplay.text = stamp;
    }

    // Image generator
    this.imageGenerator = new ImageGenerator("Gemini");

    // Clone material for safe swapping
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
      this.setConfirmVisible(false);

      // --- PCS probe: prove persistence works ---
      const store = this.getStore();
      if (!store) {
        print("❗ PCS store is null in OnStartEvent");
      } else {
        const probeKey = "pcs_probe_counter";
        const oldVal = store.has(probeKey) ? store.getString(probeKey) : "0";
        const nextVal = String((parseInt(oldVal) || 0) + 1);
        store.putString(probeKey, nextVal);
        const readBack = store.getString(probeKey);
        print(`🧪 PCS probe old=${oldVal} new=${nextVal} readBack=${readBack}`);
      }
      // -------------------------------------------

      // Restore stored image
      this.restoreImageFromStorage();

      // Mic → generate image
      if (this.asrQueryController && this.asrQueryController.onQueryEvent) {
        this.asrQueryController.onQueryEvent.add((query: string) => {
          this.createImage(query);
        });
      }
    });
  }

  private createImage(prompt: string) {
    if (this.spinner) this.spinner.enabled = true;
    this.setConfirmVisible(false);
    if (this.textDisplay) this.textDisplay.text = prompt;

    this.imageGenerator
      .generateImage(prompt)
      .then((tex: Texture) => {
        if (this.image?.mainMaterial?.mainPass) {
          this.image.mainMaterial.mainPass.baseTex = tex;
        }
        if (this.projectionImage?.mainMaterial?.mainPass) {
          this.projectionImage.mainMaterial.mainPass.baseTex = tex;
        }

        if (this.textDisplay) this.textDisplay.text = prompt;
        if (this.spinner) this.spinner.enabled = false;

        // Show confirm button UI state
        this.setConfirmVisible(true);
        print("🖼️ New image generated; Confirm shown.");

        // === AUTOSAVE: debug ===
        print("⚙️ autosaveAfterGenerate=true → saving now");
        this.saveImageToStorage();
      })
      .catch((err) => {
        print("❌ Error generating image: " + err);
        if (this.textDisplay) this.textDisplay.text = "Error Generating Image";
        if (this.spinner) this.spinner.enabled = false;
        this.setConfirmVisible(false);
      });
  }

  private saveImageToStorage() {
    const store = this.getStore();
    if (!store) return;

    const baseTex = this.image?.mainMaterial?.mainPass?.baseTex as Texture;
    if (!baseTex) {
      print("⚠️ No texture to save.");
      return;
    }

    print("💾 Encoding texture for PCS save...");
    Base64.encodeTextureAsync(
      baseTex,
      (encoded: string) => {
        const approxKB = (encoded.length / 1024).toFixed(1);
        print(`💾 Encoded OK, length=${encoded.length} (~${approxKB} KB)`);

        try {
          store.putString(this.base64Key, encoded);

          const hasAfter = store.has(this.base64Key);
          const lenAfter = hasAfter ? (store.getString(this.base64Key)?.length || 0) : 0;
          print(`✅ putString done. hasAfter=${hasAfter} storedLen=${lenAfter}`);

          // Tiny sentinel
          store.putString("last_save_ts", String(Math.floor(getTime())));
          print("✅ Tiny sentinel write OK");

          if (this.textDisplay) this.textDisplay.text = "Saved!";
          this.setConfirmVisible(true);
        } catch (e) {
          print("❌ putString threw: " + e);
          if (this.textDisplay) this.textDisplay.text = "Save failed";
        }
      },
      () => {
        print("❌ Failed to encode image");
        if (this.textDisplay) this.textDisplay.text = "Save failed";
      },
      CompressionQuality.LowQuality,
      EncodingType.Jpg
    );
  }

  private restoreImageFromStorage() {
    const store = this.getStore();
    if (!store) return;

    if (!store.has(this.base64Key)) {
      print("ℹ️ No saved image in PCS.");
      this.setConfirmVisible(false);
      return;
    }

    const b64 = store.getString(this.base64Key);
    print(`📦 Restoring image from PCS (len=${b64 ? b64.length : 0})...`);

    Base64.decodeTextureAsync(
      b64,
      (tex: Texture) => {
        if (this.image?.mainMaterial?.mainPass) {
          this.image.mainMaterial.mainPass.baseTex = tex;
        }
        if (this.projectionImage?.mainMaterial?.mainPass) {
          this.projectionImage.mainMaterial.mainPass.baseTex = tex;
        }
        print("♻️ Restored image from PCS.");
        if (this.textDisplay) this.textDisplay.text = "Loaded saved image";
        this.setConfirmVisible(true);
      },
      () => {
        print("❌ Failed to decode stored image; hiding Confirm.");
        if (this.textDisplay) this.textDisplay.text = "Load failed";
        this.setConfirmVisible(false);
      }
    );
  }
}

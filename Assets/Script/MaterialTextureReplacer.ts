import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";

/**
 * MaterialTextureReplacer
 *
 * When the user interacts with the SceneObject, replaces the referenced material's texture with a different texture (toggle).
 */
@component
export class MaterialTextureReplacer extends BaseScriptComponent {
  @input
  @hint("Interactable component to listen for interaction events")
  interactable: Interactable;

  @input
  @hint("Material whose texture will be replaced")
  targetMaterial: Material;

  @input
  @hint("Original texture for the material")
  originalTexture: Texture;

  @input
  @hint("Replacement texture for the material")
  replacementTexture: Texture;

  private isReplaced: boolean = false;

  onAwake() {
    if (!this.interactable || !this.targetMaterial || !this.originalTexture || !this.replacementTexture) {
      print("MaterialTextureReplacer: Please assign all required inputs in the Inspector.");
      return;
    }
    // Set initial state
    this.targetMaterial.mainPass.baseTex = this.originalTexture;
    // Listen for interaction
    this.interactable.onTriggerStart.add(this.onInteract.bind(this));
  }

  private onInteract(event) {
    this.isReplaced = !this.isReplaced;
    this.targetMaterial.mainPass.baseTex = this.isReplaced ? this.replacementTexture : this.originalTexture;
  }
} 
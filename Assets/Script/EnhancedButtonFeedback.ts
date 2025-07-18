import { ButtonFeedback } from "../SpectaclesInteractionKit/Components/Helpers/ButtonFeedback";

/**
 * EnhancedButtonFeedback
 *
 * Extends ButtonFeedback to add a feature: when the user pinches the button, it swaps meshIdleMaterial with swapMaterial. The swap toggles back and forth on each pinch.
 */
@component
export class EnhancedButtonFeedback extends ButtonFeedback {
  @input
  @hint("Material to swap with meshIdleMaterial on pinch")
  swapMaterial: Material;

  private isSwapped: boolean = false;
  private originalIdleMaterial: Material;

  onAwake() {
    // Call parent onAwake
    super.onAwake && super.onAwake();
    // Store the original idle material
    this.originalIdleMaterial = this.meshIdleMaterial;
    // Listen for pinch (trigger) event
    var interactable = this["interactable"];
    if (interactable) {
      interactable.onTriggerStart.add(this.onPinch.bind(this));
    }
  }

  private onPinch(event) {
    this.isSwapped = !this.isSwapped;
    if (this.isSwapped) {
      this.meshIdleMaterial = this.swapMaterial;
    } else {
      this.meshIdleMaterial = this.originalIdleMaterial;
    }
    // Update the button state to reflect the new idle material
    this["changeButtonState"] && this["changeButtonState"](this.meshIdleMaterial);
  }
} 
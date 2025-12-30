/**
 * ConfirmImageButton.ts
 * 
 * Button script for confirming the generated image.
 * Transitions to Projection state when pressed.
 */

import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { GameManager } from "../../Controllers/GameManager";
import { ImageGenController } from "../../Controllers/ImageGenController";

@component
export class ConfirmImageButton extends BaseScriptComponent {
    
    @input
    @allowUndefined
    @hint("The interactable component for this button (optional, will try to find on same object)")
    interactable: Interactable;
    
    @input
    @allowUndefined
    @hint("ImageGenController to hide displayImage (optional, will try to find)")
    imageGenController: ImageGenController;
    
    private gameManager: GameManager | null = null;
    
    onAwake() {
        this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
    }
    
    private onStart() {
        this.gameManager = GameManager.getInstance();
        
        if (!this.interactable) {
            // Try to get interactable from same object
            this.interactable = this.sceneObject.getComponent(Interactable.getTypeName()) as Interactable;
        }
        
        if (!this.interactable) {
            print("ConfirmImageButton: No interactable found on " + this.sceneObject.name);
            return;
        }
        
        // ImageGenController is optional - if not provided, we'll skip hiding displayImage
        // User can wire it manually in Inspector if needed
        
        // Bind to trigger end event
        this.interactable.onTriggerEnd.add(() => {
            print("ConfirmImageButton: Button pressed - going to Projection");
            
            // Hide displayImage and textHint immediately
            if (this.imageGenController) {
                this.imageGenController.hideDisplayImage();
            }
            
            // Hide textHint via GameManager
            if (this.gameManager) {
                this.gameManager.hideTextHint();
                this.gameManager.goToProjection();
            } else {
                print("ConfirmImageButton: GameManager not available");
            }
        });
        
        print("ConfirmImageButton: Initialized");
    }
}


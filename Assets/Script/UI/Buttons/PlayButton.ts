/**
 * PlayButton.ts
 * 
 * Simple button script for the Intro play button.
 * Transitions to Image Gen state when pressed.
 */

import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { GameManager } from "../../Controllers/GameManager";

@component
export class PlayButton extends BaseScriptComponent {
    
    @input
    @hint("The interactable component for this button")
    interactable: Interactable;
    
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
            print("PlayButton: No interactable found on " + this.sceneObject.name);
            return;
        }
        
        // Bind to trigger end event
        this.interactable.onTriggerEnd.add(() => {
            print("PlayButton: Button pressed - going to Image Gen");
            if (this.gameManager) {
                this.gameManager.goToImageGen();
            } else {
                print("PlayButton: GameManager not available");
            }
        });
        
        print("PlayButton: Initialized");
    }
}


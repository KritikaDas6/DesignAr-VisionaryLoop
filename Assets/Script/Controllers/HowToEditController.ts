/**
 * HowToEditController.ts
 * 
 * Controls the multi-step "How To Edit" tutorial.
 * Manages stepping through guide images within a single SceneObject.
 */

import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { GameManager } from "./GameManager";
import { GameState, StateChangeEvent } from "../Core/GameState";
import { PersistentStorageManager } from "../Storage/PersistentStorageManager";
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";
import { BaseController } from "../Utilities/Base/BaseController";
import { ButtonManager } from "../UI/Buttons/ButtonManager";

@component
export class HowToEditController extends BaseController {
    
    // ===== Tutorial Objects =====
    @ui.group_start("Tutorial Objects")
    @input
    @hint("First tutorial SceneObject (shown in HOW_TO_EDIT state)")
    tutorialObject1: SceneObject;
    
    @input
    @hint("Second tutorial SceneObject (shown in HOW_TO_EDIT state)")
    tutorialObject2: SceneObject;
    @ui.group_end
    
    // ===== Tutorial Steps (Optional - for multi-step tutorials) =====
    @ui.group_start("Tutorial Steps (Optional)")
    @input
    @hint("Array of SceneObjects, one for each tutorial step (guide images)")
    tutorialSteps: SceneObject[];
    
    @input
    @hint("Current step index (0-based)")
    currentStepIndex: number = 0;
    @ui.group_end
    
    // ===== Navigation Buttons =====
    @ui.group_start("Navigation")
    @input
    @hint("Next button interactable")
    nextButtonInteractable: Interactable;
    
    @input
    @hint("Done button interactable (optional, separate from Next)")
    doneButtonInteractable: Interactable;
    
    @input
    @hint("Previous button interactable (optional)")
    previousButtonInteractable: Interactable;
    
    @input
    @hint("Next button SceneObject (to hide on last step)")
    nextButtonObject: SceneObject;
    
    @input
    @hint("Previous button SceneObject (to hide on first step)")
    previousButtonObject: SceneObject;
    
    @input
    @hint("Done button SceneObject (to show on last step)")
    doneButtonObject: SceneObject;
    @ui.group_end
    
    // ===== Events =====
    private onStepChangedEvent = new Event<number>();
    public readonly onStepChanged = this.onStepChangedEvent.publicApi();
    
    private onTutorialCompleteEvent = new Event<void>();
    public readonly onTutorialComplete = this.onTutorialCompleteEvent.publicApi();
    
    onAwake() {
        super.onAwake();
        this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
    }
    
    private onUpdate() {
        // CRITICAL: Continuously check and disable buttons when not in HOW_TO_EDIT state
        // This prevents buttons from being enabled by other scripts or scene hierarchy
        if (!this.gameManager || this.gameManager.currentState !== GameState.HOW_TO_EDIT) {
            // Not in HOW_TO_EDIT state - force disable all buttons
            if (this.previousButtonObject && this.previousButtonObject.enabled) {
                this.previousButtonObject.enabled = false;
            }
            if (this.nextButtonObject && this.nextButtonObject.enabled) {
                this.nextButtonObject.enabled = false;
            }
            if (this.doneButtonObject && this.doneButtonObject.enabled) {
                this.doneButtonObject.enabled = false;
            }
        }
    }
    
    protected initialize(): void {
        
        // Setup navigation buttons
        this.setupNextButton();
        this.setupDoneButton();
        this.setupPreviousButton();
        
        // Subscribe to state changes to show/hide tutorial objects
        if (this.gameManager) {
            this.gameManager.onStateChange.add((event: StateChangeEvent) => {
                this.log.info("State changed - from " + event.previousState + " to " + event.newState);
                if (event.newState === GameState.HOW_TO_EDIT) {
                    this.log.info("Entering HOW_TO_EDIT state - resetting to first step");
                    // Reset to first step and show it
                    this.reset();
                } else {
                    // Hide tutorial objects when NOT in HOW_TO_EDIT state
                    this.log.info("Not in HOW_TO_EDIT state - hiding tutorial objects");
                    this.hideTutorialObjects();
                    // Also hide the root if it exists
                    const howToEdit_State = this.gameManager.getHowToEdit_State();
                    if (howToEdit_State) {
                        howToEdit_State.enabled = false;
                        this.log.info("Hid howToEdit_State (not in HOW_TO_EDIT state)");
                    }
                }
            });
            
            // Also check current state on start (in case we're already in HOW_TO_EDIT)
            if (this.gameManager.currentState === GameState.HOW_TO_EDIT) {
                this.log.info("Already in HOW_TO_EDIT state on start - resetting to first step");
                this.reset();
            } else {
                // Not in HOW_TO_EDIT - hide everything
                this.hideTutorialObjects();
                const howToEdit_State = this.gameManager.getHowToEdit_State();
                if (howToEdit_State) {
                    howToEdit_State.enabled = false;
                    this.log.info("Hid howToEdit_State on start (not in HOW_TO_EDIT state)");
                }
            }
        }
        
        // Check tutorial status (always starts from step 0)
        this.checkTutorialStatus();
        
        // Initialize display
        if (this.tutorialObject1 && this.tutorialObject2) {
            // Using tutorial objects
            // Don't change their enabled state on initialization - preserve their scene state
            // They'll be shown/hidden correctly when entering HOW_TO_EDIT state
            this.log.debug("Using tutorialObject1 and tutorialObject2");
            this.log.debug("tutorialObject1 initial enabled: " + (this.tutorialObject1 ? this.tutorialObject1.enabled : "null"));
            this.log.debug("tutorialObject2 initial enabled: " + (this.tutorialObject2 ? this.tutorialObject2.enabled : "null"));
        } else if (this.tutorialSteps && this.tutorialSteps.length > 0) {
            // Using tutorialSteps array - disable all steps first, then show only first step
            this.initializeSteps();
        }
        
        // Don't update display on start - wait for state change to HOW_TO_EDIT
        // This ensures proper initialization when the state is actually entered
        
        this.log.info("Initialized");
        if (this.tutorialSteps && this.tutorialSteps.length > 0) {
            this.log.info("Using step-based tutorial with " + this.getTotalSteps() + " steps");
        }
    }
    
    /**
     * Show/hide tutorial objects based on current step
     * Step 0 = tutorialObject1, Step 1 = tutorialObject2
     * CRITICAL: Only manage tutorial objects when in HOW_TO_EDIT state
     */
    private showTutorialObjects() {
        // CRITICAL: Only manage tutorial objects when in HOW_TO_EDIT state
        if (!this.gameManager || this.gameManager.currentState !== GameState.HOW_TO_EDIT) {
            this.log.info("showTutorialObjects - Not in HOW_TO_EDIT state, hiding tutorial objects");
            this.hideTutorialObjects();
            return;
        }
        
        this.log.debug("showTutorialObjects called - current step: " + this.currentStepIndex);
        
        // Ensure parent is enabled first (if tutorial objects are under howToEdit_State)
        if (this.gameManager) {
            const howToEdit_State = this.gameManager.getHowToEdit_State();
            if (howToEdit_State && !howToEdit_State.enabled) {
                howToEdit_State.enabled = true;
                this.log.debug("Enabled howToEdit_State");
            }
        }
        
        // Show only the current tutorial object, hide the other
        // IMPORTANT: Keep parent hierarchy enabled, only toggle the tutorial objects themselves
        // This preserves the original scene setup that worked
        
        if (this.tutorialObject1) {
            const shouldShow1 = (this.currentStepIndex === 0);
            
            // Always ensure parent is enabled (don't disable it)
            const parent = this.tutorialObject1.getParent();
            if (parent && !parent.enabled) {
                parent.enabled = true;
                this.log.debug("Enabled tutorialObject1 parent: " + parent.name);
            }
            
            // Only toggle the tutorial object itself
            this.tutorialObject1.enabled = shouldShow1;
            this.log.debug("tutorialObject1 enabled set to: " + shouldShow1);
            
            if (shouldShow1) {
                // Enable all children recursively
                this.enableAllChildren(this.tutorialObject1);
                this.log.debug("Showing tutorialObject1: " + this.tutorialObject1.name);
            } else {
                this.log.debug("Hiding tutorialObject1");
            }
        } else {
            this.log.warn("tutorialObject1 is null!");
        }
        
        if (this.tutorialObject2) {
            const shouldShow2 = (this.currentStepIndex === 1);
            this.log.debug("tutorialObject2 shouldShow2: " + shouldShow2 + " (currentStepIndex: " + this.currentStepIndex + ")");
            
            // Always ensure parent is enabled (don't disable it)
            const parent = this.tutorialObject2.getParent();
            if (parent && !parent.enabled) {
                parent.enabled = true;
                this.log.debug("Enabled tutorialObject2 parent: " + parent.name);
            }
            
            // Only toggle the tutorial object itself
            this.tutorialObject2.enabled = shouldShow2;
            this.log.debug("tutorialObject2 enabled set to: " + shouldShow2 + ", actual enabled: " + this.tutorialObject2.enabled);
            
            if (shouldShow2) {
                // Enable all children recursively
                this.enableAllChildren(this.tutorialObject2);
                this.log.debug("Showing tutorialObject2: " + this.tutorialObject2.name);
            } else {
                this.log.debug("Hiding tutorialObject2");
            }
        } else {
            this.log.warn("tutorialObject2 is null!");
        }
    }
    
    /**
     * Recursively enable all children of a SceneObject
     */
    private enableAllChildren(obj: SceneObject) {
        if (!obj) return;
        let enabledCount = 0;
        for (let i = 0; i < obj.children.length; i++) {
            if (obj.children[i]) {
                obj.children[i].enabled = true;
                enabledCount++;
                this.enableAllChildren(obj.children[i]);
            }
        }
        if (enabledCount > 0) {
            this.log.debug("Enabled " + enabledCount + " children of " + obj.name);
        }
    }
    
    /**
     * Hide both tutorial objects
     */
    private hideTutorialObjects() {
        if (this.tutorialObject1) {
            this.tutorialObject1.enabled = false;
            this.log.debug("Hid tutorialObject1");
        }
        if (this.tutorialObject2) {
            this.tutorialObject2.enabled = false;
            this.log.debug("Hid tutorialObject2");
        }
    }
    
    /**
     * Initialize all tutorial steps - disable all of them first
     */
    private initializeSteps() {
        if (this.tutorialSteps) {
            for (let i = 0; i < this.tutorialSteps.length; i++) {
                if (this.tutorialSteps[i]) {
                    this.tutorialSteps[i].enabled = false;
                }
            }
            this.log.debug("Disabled all " + this.tutorialSteps.length + " tutorial steps");
        }
    }
    
    /**
     * Setup next button
     */
    private setupNextButton() {
        ButtonManager.setupButton(this.nextButtonInteractable, () => {
            this.nextStep();
        });
    }
    
    /**
     * Setup done button (separate from next)
     */
    private setupDoneButton() {
        ButtonManager.setupButton(this.doneButtonInteractable, () => {
            this.completeTutorial();
        });
    }
    
    /**
     * Setup previous button
     */
    private setupPreviousButton() {
        ButtonManager.setupButton(this.previousButtonInteractable, () => {
            this.previousStep();
        });
    }
    
    /**
     * Check if tutorial has been completed before
     * (Tutorial always starts from step 0 when shown)
     */
    private checkTutorialStatus() {
        const storage = PersistentStorageManager.getInstance();
        if (storage && storage.hasTutorialBeenCompleted()) {
            this.log.info("User has completed tutorial before");
        }
        // Always start from step 0 - we don't save/restore step progress
        this.currentStepIndex = 0;
    }
    
    /**
     * Get total number of tutorial steps
     */
    public getTotalSteps(): number {
        // If using tutorial objects (tutorialObject1 and tutorialObject2), return 2
        if (this.tutorialObject1 && this.tutorialObject2) {
            return 2;
        }
        // Otherwise, use tutorialSteps array
        return this.tutorialSteps ? this.tutorialSteps.length : 0;
    }
    
    /**
     * Get current step index (0-based)
     */
    public getCurrentStep(): number {
        return this.currentStepIndex;
    }
    
    /**
     * Check if on first step
     */
    public isFirstStep(): boolean {
        return this.currentStepIndex === 0;
    }
    
    /**
     * Check if on last step
     */
    public isLastStep(): boolean {
        return this.currentStepIndex >= this.getTotalSteps() - 1;
    }
    
    /**
     * Go to next step
     */
    public nextStep() {
        if (this.isLastStep()) {
            this.log.debug("Already on last step");
            return;
        }
        
        this.log.debug("Moving from step " + (this.currentStepIndex + 1) + " to step " + (this.currentStepIndex + 2));
        this.currentStepIndex++;
        this.log.debug("Current step index is now: " + this.currentStepIndex);
        this.log.debug("Total steps: " + this.getTotalSteps());
        
        this.updateDisplay();
        this.onStepChangedEvent.invoke(this.currentStepIndex);
        
        this.log.debug("Moved to step " + (this.currentStepIndex + 1));
    }
    
    /**
     * Go to previous step
     */
    public previousStep() {
        if (this.isFirstStep()) {
            this.log.debug("Already on first step");
            return;
        }
        
        this.currentStepIndex--;
        this.updateDisplay();
        this.onStepChangedEvent.invoke(this.currentStepIndex);
        
        this.log.debug("Moved to step " + (this.currentStepIndex + 1));
    }
    
    /**
     * Go to specific step
     */
    public goToStep(stepIndex: number) {
        if (stepIndex < 0 || stepIndex >= this.getTotalSteps()) {
            this.log.warn("Invalid step index " + stepIndex);
            return;
        }
        
        this.currentStepIndex = stepIndex;
        this.updateDisplay();
        this.onStepChangedEvent.invoke(this.currentStepIndex);
    }
    
    /**
     * Reset to first step
     */
    public reset() {
        this.log.info("Resetting to first step");
        this.currentStepIndex = 0;
        // Disable all steps first
        this.initializeSteps();
        // Then show only the first step
        this.updateDisplay();
    }
    
    /**
     * Complete the tutorial and proceed
     */
    public completeTutorial() {
        this.log.info("Tutorial completed");
        
        // Hide tutorial objects first
        this.hideTutorialObjects();
        this.log.debug("Hid tutorial objects");
        
        // Hide How to Edit state root
        if (this.gameManager) {
            const howToEdit_State = this.gameManager.getHowToEdit_State();
            if (howToEdit_State) {
                howToEdit_State.enabled = false;
                this.log.debug("Hid howToEdit_State: " + howToEdit_State.name);
            } else {
                this.log.warn("howToEdit_State is null in GameManager!");
            }
        } else {
            this.log.warn("gameManager is null!");
        }
        
        // Save completion status
        const storage = PersistentStorageManager.getInstance();
        if (storage) {
            storage.setTutorialCompleted(true);
        }
        
        // Fire completion event
        this.onTutorialCompleteEvent.invoke();
        
        // Transition to tracing state (GameManager will handle state transition)
        if (this.gameManager) {
            this.gameManager.goToTracing();
        }
    }
    
    /**
     * Update the display for current step
     */
    private updateDisplay() {
        // If using tutorial objects (tutorialObject1 and tutorialObject2), show/hide them
        if (this.tutorialObject1 && this.tutorialObject2) {
            this.showTutorialObjects();
        } else if (this.tutorialSteps) {
            // Otherwise, use tutorialSteps array
            for (let i = 0; i < this.tutorialSteps.length; i++) {
                if (this.tutorialSteps[i]) {
                    const shouldShow = (i === this.currentStepIndex);
                    this.tutorialSteps[i].enabled = shouldShow;
                    if (shouldShow) {
                        this.log.debug("Enabled step " + (i + 1) + " of " + this.tutorialSteps.length);
                    }
                }
            }
        }
        
        // Update navigation button visibility
        this.updateNavigationButtons();
    }
    
    /**
     * Update navigation button visibility
     * CRITICAL: Only manage buttons when in HOW_TO_EDIT state
     */
    private updateNavigationButtons() {
        // CRITICAL: Only manage buttons when in HOW_TO_EDIT state
        if (!this.gameManager || this.gameManager.currentState !== GameState.HOW_TO_EDIT) {
            // Not in HOW_TO_EDIT state - hide all buttons
            if (this.previousButtonObject) {
                this.previousButtonObject.enabled = false;
            }
            if (this.nextButtonObject) {
                this.nextButtonObject.enabled = false;
            }
            if (this.doneButtonObject) {
                this.doneButtonObject.enabled = false;
            }
            this.log.debug("updateNavigationButtons - Not in HOW_TO_EDIT state, hiding all buttons");
            return;
        }
        
        // In HOW_TO_EDIT state - manage button visibility based on step
        // Previous button - hide on first step
        if (this.previousButtonObject) {
            this.previousButtonObject.enabled = !this.isFirstStep();
        }
        
        // Next button - hide on last step (show done instead)
        if (this.nextButtonObject) {
            this.nextButtonObject.enabled = !this.isLastStep();
        }
        
        // Done button - show only on last step
        if (this.doneButtonObject) {
            this.doneButtonObject.enabled = this.isLastStep();
        }
        
        this.log.debug("updateNavigationButtons - Step " + (this.currentStepIndex + 1) + ", Next: " + (this.nextButtonObject ? this.nextButtonObject.enabled : "null") + ", Back: " + (this.previousButtonObject ? this.previousButtonObject.enabled : "null") + ", Done: " + (this.doneButtonObject ? this.doneButtonObject.enabled : "null"));
    }
    
}


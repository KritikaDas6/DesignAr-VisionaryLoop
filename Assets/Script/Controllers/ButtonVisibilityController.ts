/**
 * ButtonVisibilityController.ts
 * 
 * Handles button visibility management for GameManager.
 * Extracted from GameManager to separate concerns.
 */

// SceneObject is a global type in Lens Studio, no import needed
import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { Logger, LoggerInstance } from "../Utilities/Logging/Logger";
import { ObjectNames } from "../Core/Constants/ObjectNames";

export interface ButtonVisibilityReferences {
    ProjectButton?: SceneObject;
    confirmButton?: SceneObject;
    resetButton?: SceneObject;
    confirmButtonInteractable?: Interactable;
    resetButtonInteractable?: Interactable;
    nextButton?: SceneObject;
    backButton?: SceneObject;
    doneButton?: SceneObject;
    projection_State?: SceneObject;
    howToEdit_State?: SceneObject;
    projectedImageObject?: SceneObject;
}

export class ButtonVisibilityController {
    private log: LoggerInstance;
    private refs: ButtonVisibilityReferences;

    constructor(refs: ButtonVisibilityReferences) {
        this.log = Logger.create("ButtonVisibilityController");
        this.refs = refs;
    }

    /**
     * Set project button visibility
     */
    public setProjectButtonVisible(visible: boolean): void {
        if (this.refs.ProjectButton) {
            this.refs.ProjectButton.enabled = visible;
            this.log.debug("setProjectButtonVisible(" + visible + ")");
        }
    }

    /**
     * Set confirm and reset buttons visibility
     */
    public setConfirmResetButtonsVisible(visible: boolean): void {
        if (this.refs.confirmButton) {
            this.refs.confirmButton.enabled = visible;
        }
        if (this.refs.resetButton) {
            this.refs.resetButton.enabled = visible;
        }
        if (this.refs.confirmButtonInteractable) {
            this.refs.confirmButtonInteractable.enabled = visible;
        }
        if (this.refs.resetButtonInteractable) {
            this.refs.resetButtonInteractable.enabled = visible;
        }
        
        // Fallback: If buttons aren't assigned, search for them by name
        if (!visible && (!this.refs.confirmButton || !this.refs.resetButton)) {
            this.disableConfirmResetButtonsByName();
        }
        
        this.log.debug("setConfirmResetButtonsVisible(" + visible + ")");
    }

    /**
     * Fallback: Disable Confirm/Reset buttons by searching for them by name
     */
    private disableConfirmResetButtonsByName(): void {
        const searchLocations: SceneObject[] = [];
        if (this.refs.projection_State) searchLocations.push(this.refs.projection_State);
        if (this.refs.projectedImageObject) searchLocations.push(this.refs.projectedImageObject);
        
        const buttonNames = [...ObjectNames.BUTTONS.CONFIRM, ...ObjectNames.BUTTONS.RESET];
        
        for (const root of searchLocations) {
            if (!root) continue;
            for (const name of buttonNames) {
                const button = this.findButtonByName(root, name);
                if (button) {
                    button.enabled = false;
                    this.disableButtonChildren(button);
                }
            }
        }
    }

    /**
     * Recursively find a button by name
     */
    private findButtonByName(parent: SceneObject, name: string): SceneObject | null {
        if (!parent) return null;
        
        // Check direct children first
        for (let i = 0; i < parent.children.length; i++) {
            if (parent.children[i].name === name) {
                return parent.children[i];
            }
        }
        
        // Recursively search children
        for (let i = 0; i < parent.children.length; i++) {
            const found = this.findButtonByName(parent.children[i], name);
            if (found) return found;
        }
        
        return null;
    }

    /**
     * Recursively disable Button_Confirm and Button_Decline and their children
     */
    private disableButtonChildren(obj: SceneObject): void {
        if (!obj) return;
        obj.enabled = false;
        for (let i = 0; i < obj.children.length; i++) {
            this.disableButtonChildren(obj.children[i]);
        }
    }

    /**
     * Set HowToEdit navigation buttons visibility
     */
    public setHowToEditButtonsVisible(visible: boolean): void {
        if (this.refs.nextButton) {
            this.refs.nextButton.enabled = visible;
        }
        if (this.refs.backButton) {
            this.refs.backButton.enabled = visible;
        }
        if (this.refs.doneButton) {
            this.refs.doneButton.enabled = visible;
        }
        
        // Fallback: If buttons aren't assigned, search for them by name
        if (!visible && (!this.refs.nextButton || !this.refs.backButton || !this.refs.doneButton)) {
            this.disableHowToEditButtonsByName();
        }
        
        this.log.debug("setHowToEditButtonsVisible(" + visible + ")");
    }

    /**
     * Fallback: Disable HowToEdit buttons by searching for them by name
     */
    private disableHowToEditButtonsByName(): void {
        const searchLocations: SceneObject[] = [];
        if (this.refs.howToEdit_State) searchLocations.push(this.refs.howToEdit_State);
        if (this.refs.projectedImageObject) searchLocations.push(this.refs.projectedImageObject);
        
        const buttonNames = [...ObjectNames.BUTTONS.NEXT, ...ObjectNames.BUTTONS.BACK, ...ObjectNames.BUTTONS.DONE];
        
        for (const root of searchLocations) {
            if (!root) continue;
            for (const name of buttonNames) {
                const button = this.findButtonByName(root, name);
                if (button) {
                    button.enabled = false;
                    this.disableButtonChildren(button);
                }
            }
        }
    }
}


/**
 * ProjectionUIHandler.ts
 * 
 * Handles button setup and UI management for ProjectionController.
 * Extracted from WorldQueryHit_Modified to separate concerns.
 */

import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { GameManager } from "../Controllers/GameManager";
import { GameState } from "../Core/GameState";
import { isButtonType, isGuideType } from "../Core/Constants/ObjectNames";

export interface ProjectionUIHandlerCallbacks {
    onPlaceButtonClicked?: () => void;
    onConfirmButtonClicked?: () => void;
    onResetButtonClicked?: () => void;
    enableAllChildren?: (obj: SceneObject) => void;
    disableAllChildren?: (obj: SceneObject) => void;
}

export interface ProjectionUIHandlerState {
    buttonsShown: boolean;
    placeButtonHidden: boolean;
}

export class ProjectionUIHandler {
    private projectButtonInteractable: Interactable | null;
    private gameManager: GameManager | null;
    private targetObject: SceneObject;
    private callbacks: ProjectionUIHandlerCallbacks;
    private state: ProjectionUIHandlerState;
    private log: any; // Logger instance

    constructor(
        projectButtonInteractable: Interactable | null,
        gameManager: GameManager | null,
        targetObject: SceneObject,
        callbacks: ProjectionUIHandlerCallbacks,
        state: ProjectionUIHandlerState,
        log: any
    ) {
        this.projectButtonInteractable = projectButtonInteractable;
        this.gameManager = gameManager;
        this.targetObject = targetObject;
        this.callbacks = callbacks;
        this.state = state;
        this.log = log;
    }

    /**
     * Setup project button handler
     */
    public setupPlaceButton(): void {
        if (!this.projectButtonInteractable) {
            this.log.error("ProjectionUIHandler: projectButtonInteractable not assigned!");
            return;
        }
        
        if (!this.projectButtonInteractable.onTriggerEnd) {
            this.log.error("ProjectionUIHandler: projectButtonInteractable.onTriggerEnd is undefined!");
            return;
        }
        
        this.log.debug("ProjectionUIHandler: Setting up project button handler...");
        this.projectButtonInteractable.onTriggerEnd.add(() => {
            this.log.info("ProjectionUIHandler: ===== STEP 2: PROJECT BUTTON CLICKED =====");
            
            // CRITICAL: Hide place button immediately via GameManager
            if (this.gameManager) {
                this.gameManager.setProjectButtonVisible(false);
            }
            
            if (this.callbacks.onPlaceButtonClicked) {
                this.callbacks.onPlaceButtonClicked();
            }
        });
        this.log.info("ProjectionUIHandler: ✓ Project button handler set up successfully");
    }

    /**
     * Setup confirm button handler
     */
    public setupConfirmButton(): void {
        const interactableToUse = this.gameManager ? this.gameManager.confirmButtonInteractable : null;
        
        if (!interactableToUse) {
            this.log.warn("ProjectionUIHandler: WARNING - confirmButtonInteractable not assigned");
            return;
        }
        
        if (interactableToUse.onTriggerEnd && interactableToUse.onTriggerEnd.add) {
            interactableToUse.onTriggerEnd.add(() => {
                this.log.info("ProjectionUIHandler: ===== STEP 4: CONFIRM BUTTON CLICKED - Proceeding to edit state =====");
                if (this.gameManager) {
                    // Hide confirm/reset buttons via GameManager
                    this.gameManager.setConfirmResetButtonsVisible(false);
                    this.gameManager.setProjectButtonVisible(false);
                    this.state.buttonsShown = false;
                    
                    // CRITICAL: Explicitly hide ProjectionGuide before transitioning
                    const projectionGuide = (this.gameManager as any).projectionGuide;
                    if (projectionGuide && projectionGuide.enabled) {
                        projectionGuide.enabled = false;
                        this.log.debug("ProjectionUIHandler: ✓ Hid ProjectionGuide before transition");
                    }
                    
                    // Transition to edit state
                    this.gameManager.onImagePlaced();
                    this.gameManager.goToHowToEdit();
                    this.log.info("ProjectionUIHandler: ✓ Transitioned to edit state - ProjectionGuide hidden, HowToEditState shown");
                }
            });
            this.log.info("ProjectionUIHandler: ✓ Confirm button handler set up successfully");
        } else {
            this.log.error("ProjectionUIHandler: ERROR - confirmButtonInteractable.onTriggerEnd is not available");
        }
    }

    /**
     * Setup reset button handler
     */
    public setupResetButton(): void {
        const interactableToUse = this.gameManager ? this.gameManager.resetButtonInteractable : null;
        
        if (!interactableToUse) {
            this.log.warn("ProjectionUIHandler: WARNING - resetButtonInteractable not assigned");
            return;
        }
        
        if (interactableToUse.onTriggerEnd && interactableToUse.onTriggerEnd.add) {
            interactableToUse.onTriggerEnd.add(() => {
                this.log.info("ProjectionUIHandler: ===== STEP 4: RESET BUTTON CLICKED - Going back to STEP 1 =====");
                if (this.callbacks.onResetButtonClicked) {
                    this.callbacks.onResetButtonClicked();
                }
                if (this.gameManager) {
                    this.gameManager.setProjectButtonVisible(false);
                    this.gameManager.setConfirmResetButtonsVisible(false);
                    this.gameManager.onRepositionRequested(); // Go back to SURFACE_DETECTION (STEP 1)
                }
            });
            this.log.info("ProjectionUIHandler: ✓ Reset button handler set up successfully");
        } else {
            this.log.error("ProjectionUIHandler: ERROR - resetButtonInteractable.onTriggerEnd is not available");
        }
    }

    /**
     * Show surface detection UI (place button)
     */
    public showSurfaceDetectionUI(): void {
        if (!this.gameManager) {
            this.log.warn("ProjectionUIHandler: GameManager not available");
            return;
        }
        
        const projection_State = (this.gameManager as any).projection_State;
        const projection_StateEnabled = projection_State ? projection_State.enabled : false;
        
        this.log.debug("ProjectionUIHandler: showSurfaceDetectionUI() - projection_State enabled: " + projection_StateEnabled);
        
        if (!projection_StateEnabled) {
            if (projection_State) {
                projection_State.enabled = true;
                this.log.warn("ProjectionUIHandler: ✗✗✗ ERROR - projection_State is disabled! Enabling it now... ✗✗✗");
            } else {
                this.log.error("ProjectionUIHandler: ✗✗✗ ERROR - projection_State is not assigned in GameManager! ✗✗✗");
                return;
            }
        }
        
        // Show project button
        const isLocked = this.gameManager.isLocked;
        if (this.projectButtonInteractable) {
            this.projectButtonInteractable.enabled = !isLocked;
            this.gameManager.setProjectButtonVisible(!isLocked);
            this.log.debug("ProjectionUIHandler: ✓ projectButtonInteractable enabled: " + this.projectButtonInteractable.enabled + " (locked: " + isLocked + ")");
        } else {
            this.log.error("ProjectionUIHandler: ✗✗✗ ERROR - projectButtonInteractable is not assigned in ProjectionController! ✗✗✗");
        }
        
        this.log.debug("ProjectionUIHandler: ===== showSurfaceDetectionUI() COMPLETE =====");
    }

    /**
     * Show confirm and reset buttons
     */
    public showConfirmAndResetButtons(): void {
        if (this.state.buttonsShown) {
            return; // Already shown
        }
        
        if (this.gameManager) {
            this.gameManager.setConfirmResetButtonsVisible(true);
            this.state.buttonsShown = true;
            this.log.debug("ProjectionUIHandler: ✓ Showed confirm and reset buttons");
        }
    }

    /**
     * Enable all children, but respect button visibility state
     */
    public enableAllChildrenSafe(obj: SceneObject, currentState: GameState): void {
        if (!obj) return;
        
        // CRITICAL: If we're in HOW_TO_EDIT state, don't process children
        if (currentState === GameState.HOW_TO_EDIT) {
            if (!obj.enabled) {
                obj.enabled = true;
            }
            return;
        }
        
        const isInHowToEditState = false;
        
        for (let i = 0; i < obj.children.length; i++) {
            const child = obj.children[i];
            const childName = child.name;
            
            // Check if this is a confirm/reset button
            const isConfirmResetButton = isButtonType(childName, 'CONFIRM') || isButtonType(childName, 'RESET');
            
            if (isConfirmResetButton) {
                // Only disable if buttons shouldn't be shown
                if (!this.state.buttonsShown) {
                    child.enabled = false;
                    if (this.callbacks.disableAllChildren) {
                        this.callbacks.disableAllChildren(child);
                    }
                }
                continue;
            }
            
            // CRITICAL: Exclude HowToEdit buttons
            const childNameLower = childName.toLowerCase();
            const isHowToEditButton = 
                childNameLower.includes("nextbutton") || childNameLower.includes("button_next") || childNameLower === "next" ||
                childNameLower.includes("backbutton") || childNameLower.includes("button_back") || childNameLower === "back" || childNameLower === "previous" ||
                childNameLower.includes("donebutton") || childNameLower.includes("button_done") || childNameLower === "done" ||
                (childNameLower.includes("done") && (childNameLower.includes("button") || childNameLower.includes("btn")));
            
            if (isHowToEditButton) {
                if (!isInHowToEditState) {
                    child.enabled = false;
                    if (this.callbacks.disableAllChildren) {
                        this.callbacks.disableAllChildren(child);
                    }
                    this.log.debug("ProjectionUIHandler: enableAllChildrenSafe - Excluded HowToEdit button: " + childName);
                    continue;
                } else {
                    child.enabled = true;
                    this.enableAllChildrenSafe(child, currentState);
                    continue;
                }
            }
            
            // CRITICAL: Exclude HowToEditState
            const isHowToEditState = isGuideType(childName, 'HOW_TO_EDIT') ||
                (this.gameManager && this.gameManager.getHowToEdit_State && child === this.gameManager.getHowToEdit_State());
            
            if (isHowToEditState) {
                if (!isInHowToEditState) {
                    child.enabled = false;
                    if (this.callbacks.disableAllChildren) {
                        this.callbacks.disableAllChildren(child);
                    }
                    this.log.debug("ProjectionUIHandler: enableAllChildrenSafe - Excluded HowToEditState: " + childName);
                    continue;
                }
            }
            
            child.enabled = true;
            this.enableAllChildrenSafe(child, currentState);
        }
    }

    /**
     * Enable all children (legacy method)
     */
    public enableAllChildren(obj: SceneObject): void {
        if (!obj) return;
        for (let i = 0; i < obj.children.length; i++) {
            const child = obj.children[i];
            const childName = child.name;
            const childNameLower = childName.toLowerCase();
            
            // CRITICAL: Skip buttons that are managed by GameManager
            if (isButtonType(childName, 'CONFIRM') || isButtonType(childName, 'RESET')) {
                continue;
            }
            
            if (isButtonType(childName, 'PLACE')) {
                continue;
            }
            
            const isHowToEditButton = 
                isButtonType(childName, 'NEXT') || isButtonType(childName, 'BACK') || isButtonType(childName, 'DONE');
            
            if (isHowToEditButton) {
                continue;
            }
            
            // CRITICAL: Skip guide objects
            const isProjectionGuide = isGuideType(childName, 'PROJECTION') ||
                (childNameLower.includes("projection") && childNameLower.includes("guide"));
            
            if (isProjectionGuide) {
                continue;
            }
            
            const isHowToEditState = isGuideType(childName, 'HOW_TO_EDIT') ||
                childNameLower.includes("howtoedit") || childNameLower.includes("how_to_edit");
            
            if (isHowToEditState) {
                continue;
            }
            
            const isImageGenGuide = isGuideType(childName, 'IMAGE_GEN') ||
                (childNameLower.includes("guide") && !childNameLower.includes("projection") && !childNameLower.includes("howtoedit"));
            
            if (isImageGenGuide) {
                continue;
            }
            
            child.enabled = true;
            this.enableAllChildren(child);
        }
    }

    /**
     * Disable all children
     */
    public disableAllChildren(obj: SceneObject): void {
        if (!obj) return;
        for (let i = 0; i < obj.children.length; i++) {
            obj.children[i].enabled = false;
            this.disableAllChildren(obj.children[i]);
        }
    }

    /**
     * Disable HowToEdit buttons in hierarchy
     */
    public disableHowToEditButtonsInHierarchy(obj: SceneObject): void {
        if (!obj) return;
        const childName = obj.name;
        const childNameLower = childName.toLowerCase();
        
        const isHowToEditButton = 
            childNameLower.includes("next") && (childNameLower.includes("button") || childNameLower === "next") ||
            childNameLower.includes("back") && (childNameLower.includes("button") || childNameLower === "back" || childNameLower === "previous") ||
            childNameLower.includes("done") && (childNameLower.includes("button") || childNameLower.includes("btn") || childNameLower === "done");
        
        if (isHowToEditButton) {
            if (obj.enabled) {
                obj.enabled = false;
                this.disableAllChildren(obj);
                this.log.debug("ProjectionUIHandler: disableHowToEditButtonsInHierarchy - Disabled: " + childName);
            }
            return;
        }
        
        // Recursively check children
        for (let i = 0; i < obj.children.length; i++) {
            this.disableHowToEditButtonsInHierarchy(obj.children[i]);
        }
    }

    /**
     * Get state
     */
    public getState(): ProjectionUIHandlerState {
        return this.state;
    }

    /**
     * Set buttons shown flag
     */
    public setButtonsShown(shown: boolean): void {
        this.state.buttonsShown = shown;
    }
}


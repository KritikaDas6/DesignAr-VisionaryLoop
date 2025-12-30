/**
 * UIVisibilityController.ts
 * 
 * Handles UI visibility management for GameManager.
 * Extracted from GameManager to separate concerns.
 */

// SceneObject is a global type in Lens Studio, no import needed
import { GameState, ImageGenSubState } from "../Core/GameState";
import { Logger, LoggerInstance } from "../Utilities/Logging/Logger";
import { isButtonType, isGuideType } from "../Core/Constants/ObjectNames";

export interface UIVisibilityReferences {
    intro_State?: SceneObject;
    imageGen_State?: SceneObject;
    projection_State?: SceneObject;
    howToEdit_State?: SceneObject;
    tracing_State?: SceneObject;
    imageGenGuide?: SceneObject;
    micButtonContainer?: SceneObject;
    generatingSpinner?: SceneObject;
    imagePreviewContainer?: SceneObject;
    textHint?: SceneObject;
    imageConfirmButton?: SceneObject;
    projectionGuide?: SceneObject;
    guideBackground?: SceneObject;
    projectedImageObject?: SceneObject;
}

export class UIVisibilityController {
    private log: LoggerInstance;
    private refs: UIVisibilityReferences;
    private disableContainerFrameButtons: (obj: SceneObject) => void;

    constructor(
        refs: UIVisibilityReferences,
        disableContainerFrameButtons: (obj: SceneObject) => void
    ) {
        this.log = Logger.create("UIVisibilityController");
        this.refs = refs;
        this.disableContainerFrameButtons = disableContainerFrameButtons;
    }

    /**
     * Hide all state root objects
     */
    public hideAllStates(): void {
        const states: (SceneObject | undefined)[] = [
            this.refs.intro_State,
            this.refs.imageGen_State,
            this.refs.projection_State,
            this.refs.howToEdit_State,
            this.refs.tracing_State
        ];
        
        states.forEach(root => {
            if (root) root.enabled = false;
        });
        
        // Hide guide objects on initialization
        if (this.refs.howToEdit_State) {
            this.refs.howToEdit_State.enabled = false;
            this.log.debug("Hid howToEdit_State on initialization");
        }
        if (this.refs.projectionGuide) {
            this.refs.projectionGuide.enabled = false;
            this.log.debug("Hid projectionGuide on initialization");
        }
        if (this.refs.guideBackground) {
            this.refs.guideBackground.enabled = false;
            this.log.debug("Hid guideBackground on initialization");
        }
    }

    /**
     * Exit a state - cleanup UI
     */
    public exitState(state: GameState): void {
        switch (state) {
            case GameState.INTRO:
                if (this.refs.intro_State) this.refs.intro_State.enabled = false;
                break;
                
            case GameState.IMAGE_GEN:
                if (this.refs.imageGen_State) this.refs.imageGen_State.enabled = false;
                if (this.refs.projection_State) this.refs.projection_State.enabled = false;
                // Don't disable projectedImageObject - it needs to stay visible in HOW_TO_EDIT and TRACING
                break;
                
            case GameState.HOW_TO_EDIT:
                // Hide HowToEditState and shared background when leaving HOW_TO_EDIT
                if (this.refs.howToEdit_State) this.refs.howToEdit_State.enabled = false;
                if (this.refs.guideBackground) this.refs.guideBackground.enabled = false;
                break;
                
            case GameState.TRACING:
                if (this.refs.tracing_State) this.refs.tracing_State.enabled = false;
                break;
        }
    }

    /**
     * Enter a state - setup UI
     */
    public enterState(state: GameState): void {
        switch (state) {
            case GameState.INTRO:
                if (this.refs.intro_State) this.refs.intro_State.enabled = true;
                // Hide projected image in intro
                if (this.refs.projectedImageObject) this.refs.projectedImageObject.enabled = false;
                break;
                
            case GameState.IMAGE_GEN:
                if (this.refs.imageGen_State) this.refs.imageGen_State.enabled = true;
                // Also enable projection root UI (they're now combined)
                if (this.refs.projection_State) this.refs.projection_State.enabled = true;
                // Hide HowToEditState during IMAGE_GEN (it will show when entering HOW_TO_EDIT)
                if (this.refs.howToEdit_State) {
                    this.refs.howToEdit_State.enabled = false;
                    this.log.debug("Hid howToEdit_State (entering IMAGE_GEN)");
                }
                break;
                
            case GameState.HOW_TO_EDIT:
                // Hide ProjectionGuide and show HowToEditState (they share the same background)
                if (this.refs.projectionGuide) {
                    this.refs.projectionGuide.enabled = false;
                    this.log.debug("Hid projectionGuide (entering HOW_TO_EDIT)");
                }
                if (this.refs.howToEdit_State) {
                    this.refs.howToEdit_State.enabled = true;
                    this.log.debug("Enabled howToEdit_State (entering HOW_TO_EDIT)");
                }
                // Keep shared background visible
                if (this.refs.guideBackground) {
                    this.refs.guideBackground.enabled = true;
                    this.log.debug("Enabled guideBackground (shared background)");
                }
                // Note: HowToEditController will manage button visibility based on step
                if (this.refs.projectedImageObject) {
                    this.refs.projectedImageObject.enabled = true;
                    // Disable ContainerFrame buttons (close and follow) - they should never show
                    this.disableContainerFrameButtons(this.refs.projectedImageObject);
                }
                break;
                
            case GameState.TRACING:
                if (this.refs.tracing_State) this.refs.tracing_State.enabled = true;
                if (this.refs.projectedImageObject) {
                    this.refs.projectedImageObject.enabled = true;
                    // Disable ContainerFrame buttons (close and follow) - they should never show
                    this.disableContainerFrameButtons(this.refs.projectedImageObject);
                }
                break;
        }
    }

    /**
     * Handle sub-state specific UI changes
     */
    public handleSubStateUI(subState: string, currentState: GameState): void {
        // Image Gen sub-states (now includes projection)
        if (currentState === GameState.IMAGE_GEN) {
            // Image generation UI
            const showGuide = subState === ImageGenSubState.READY_TO_RECORD || subState === ImageGenSubState.PREVIEW;
            const showMic = subState === ImageGenSubState.READY_TO_RECORD || 
                           subState === ImageGenSubState.RECORDING ||
                           subState === ImageGenSubState.PREVIEW;
            const showSpinner = subState === ImageGenSubState.GENERATING;
            const showPreview = subState === ImageGenSubState.PREVIEW;
            
            if (this.refs.imageGenGuide) {
                this.refs.imageGenGuide.enabled = showGuide;
                this.log.debug("imageGenGuide enabled: " + showGuide + " (subState: " + subState + ")");
            }
            if (this.refs.micButtonContainer) this.refs.micButtonContainer.enabled = showMic;
            if (this.refs.generatingSpinner) this.refs.generatingSpinner.enabled = showSpinner;
            if (this.refs.imagePreviewContainer) this.refs.imagePreviewContainer.enabled = showPreview;
            
            // Text hint - show only in PREVIEW (hide when entering projection)
            if (this.refs.textHint) {
                this.refs.textHint.enabled = showPreview;
            }
            
            // Confirm button - show only in PREVIEW (when image is generated/restored)
            if (this.refs.imageConfirmButton) {
                this.refs.imageConfirmButton.enabled = showPreview;
            }
            
            // Projection UI (within IMAGE_GEN state)
            const showProjectionUI = subState === ImageGenSubState.SURFACE_DETECTION || subState === ImageGenSubState.PLACED;
            
            // Ensure projection_State stays enabled for buttons to be visible
            this.log.debug("Checking projection_State - showProjectionUI: " + showProjectionUI + ", projection_State exists: " + (this.refs.projection_State !== null && this.refs.projection_State !== undefined));
            if (this.refs.projection_State && showProjectionUI) {
                if (!this.refs.projection_State.enabled) {
                    this.refs.projection_State.enabled = true;
                    this.log.info("Enabled projection_State for sub-state: " + subState);
                    this.log.debug("projection_State name: " + this.refs.projection_State.name);
                    this.log.debug("projection_State children count: " + this.refs.projection_State.children.length);
                } else {
                    this.log.debug("projection_State already enabled for sub-state: " + subState);
                }
            } else {
                if (!this.refs.projection_State) {
                    this.log.error("projection_State is not assigned in GameManager!");
                } else {
                    this.log.debug("projection_State not enabled - subState: " + subState + " (showProjectionUI: " + showProjectionUI + ")");
                }
            }
            
            // ProjectionGuide and HowToEditState are siblings sharing the same background
            if (this.refs.projectionGuide) {
                this.refs.projectionGuide.enabled = showProjectionUI;
                this.log.debug("ProjectionGuide enabled: " + showProjectionUI + " (subState: " + subState + ")");
            }
            if (this.refs.howToEdit_State) {
                this.refs.howToEdit_State.enabled = false; // Hide HowToEditState during projection
                this.log.debug("HowToEditState hidden (subState: " + subState + ")");
            }
            
            // CRITICAL: Hide imageGenGuide during projection states
            if (this.refs.imageGenGuide && (subState === ImageGenSubState.SURFACE_DETECTION || subState === ImageGenSubState.PLACED)) {
                this.refs.imageGenGuide.enabled = false;
                this.log.debug("imageGenGuide hidden (subState: " + subState + ")");
            }
            
            // Show shared background when projection UI is shown
            if (this.refs.guideBackground) {
                this.refs.guideBackground.enabled = showProjectionUI;
                this.log.debug("GuideBackground enabled: " + showProjectionUI + " (subState: " + subState + ")");
            }
            
            // Enable projected image only when actually projecting
            if (this.refs.projectedImageObject) {
                const shouldShowImage = subState === ImageGenSubState.PLACED;
                if (shouldShowImage) {
                    if (!this.refs.projectedImageObject.enabled) {
                        this.refs.projectedImageObject.enabled = true;
                        this.enableAllChildren(this.refs.projectedImageObject, currentState, subState);
                    }
                    this.disableContainerFrameButtons(this.refs.projectedImageObject);
                } else if (subState === ImageGenSubState.SURFACE_DETECTION) {
                    // During SURFACE_DETECTION, enable the object so ProjectionController can show preview
                    if (!this.refs.projectedImageObject.enabled) {
                        this.refs.projectedImageObject.enabled = true;
                        this.log.debug("Enabled projectedImageObject for SURFACE_DETECTION preview");
                    }
                    this.disableContainerFrameButtons(this.refs.projectedImageObject);
                } else if (!shouldShowImage && this.refs.projectedImageObject.enabled) {
                    // Disable projected image when not in projection sub-states
                    this.refs.projectedImageObject.enabled = false;
                }
            }
        }
    }

    /**
     * Recursively enable all children of an object
     * EXCLUDES Button_Confirm, Button_Decline, place button, and ProjectionGuide
     */
    public enableAllChildren(obj: SceneObject, currentState: GameState, currentSubState: string): void {
        if (!obj) return;
        for (let i = 0; i < obj.children.length; i++) {
            const child = obj.children[i];
            const childName = child.name;
            
            // CRITICAL: Skip Button_Confirm and Button_Decline - they should be managed by ProjectionController
            if (isButtonType(childName, 'CONFIRM') || isButtonType(childName, 'RESET')) {
                child.enabled = false;
                this.disableButtonChildren(child);
                continue;
            }
            
            // CRITICAL: Skip place button - it should only be shown during SURFACE_DETECTION
            if (isButtonType(childName, 'PLACE')) {
                child.enabled = false;
                this.disableButtonChildren(child);
                continue;
            }
            
            // CRITICAL: Skip ProjectionGuide - it should only be shown during SURFACE_DETECTION and PLACED
            const childNameLower = childName.toLowerCase();
            const isProjectionGuide = child === this.refs.projectionGuide || 
                isGuideType(childName, 'PROJECTION') ||
                childNameLower.includes("projection") && childNameLower.includes("guide");
            
            if (isProjectionGuide) {
                child.enabled = false;
                this.disableButtonChildren(child);
                continue;
            }
            
            // CRITICAL: Skip HowToEditState - it should only be shown during HOW_TO_EDIT state
            const isHowToEditState = child === this.refs.howToEdit_State || 
                isGuideType(childName, 'HOW_TO_EDIT') ||
                childNameLower.includes("howtoedit") || childNameLower.includes("how_to_edit");
            
            if (isHowToEditState) {
                child.enabled = false;
                this.disableButtonChildren(child);
                continue;
            }
            
            // CRITICAL: Skip imageGenGuide - it should only be shown during READY_TO_RECORD and PREVIEW
            const isImageGenGuide = child === this.refs.imageGenGuide ||
                isGuideType(childName, 'IMAGE_GEN') ||
                (childNameLower.includes("guide") && !childNameLower.includes("projection") && !childNameLower.includes("howtoedit"));
            
            if (isImageGenGuide) {
                const shouldShowImageGenGuide = currentSubState === ImageGenSubState.READY_TO_RECORD || 
                                               currentSubState === ImageGenSubState.PREVIEW;
                child.enabled = shouldShowImageGenGuide;
                if (!shouldShowImageGenGuide) {
                    this.disableButtonChildren(child);
                }
                continue;
            }
            
            child.enabled = true;
            this.enableAllChildren(child, currentState, currentSubState);
        }
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
}


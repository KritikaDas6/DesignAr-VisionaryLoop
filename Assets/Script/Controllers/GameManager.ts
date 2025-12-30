/**
 * GameManager.ts
 * 
 * Central state machine for the DesignAR VisionaryLoop experience.
 * Manages state transitions, UI visibility, and coordinates between controllers.
 */

import { GameState, ImageGenSubState, ProjectionSubState, StateChangeEvent } from "../Core/GameState";
import { PersistentStorageManager } from "../Storage/PersistentStorageManager";
import { ContainerFrame } from "../Interaction/ContainerFrameLocker";
import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";
import { Logger, LoggerInstance } from "../Utilities/Logging/Logger";
import { ObjectNames, isButtonType, isGuideType } from "../Core/Constants/ObjectNames";
import { StateManager } from "./StateManager";
import { UIVisibilityController } from "./UIVisibilityController";
import { ButtonVisibilityController } from "./ButtonVisibilityController";

@component
export class GameManager extends BaseScriptComponent {
    private log: LoggerInstance;
    
    // ===== Controllers =====
    private stateManager: StateManager;
    private uiVisibilityController: UIVisibilityController;
    private buttonVisibilityController: ButtonVisibilityController;
    
    // ===== Scene Object References =====
    @ui.group_start("Intro State")
    @input
    @allowUndefined
    @hint("Root object for Intro state UI")
    intro_State: SceneObject;
    @ui.group_end
    
    @ui.group_start("Image Gen State")
    @input
    @allowUndefined
    @hint("Root object for Image Generation state UI")
    imageGen_State: SceneObject;
    
    @input
    @allowUndefined
    @hint("How-to guide shown during ready to record")
    imageGenGuide: SceneObject;
    
    @input
    @allowUndefined
    @hint("Mic button container (ready to record)")
    micButtonContainer: SceneObject;
    
    @input
    @allowUndefined
    @hint("Spinner/loading indicator")
    generatingSpinner: SceneObject;
    
    @input
    @allowUndefined
    @hint("Image preview container with confirm/regenerate buttons")
    imagePreviewContainer: SceneObject;
    
    @input
    @allowUndefined
    @hint("Confirm button for generated image")
    imageConfirmButton: SceneObject;
    
    @input
    @allowUndefined
    @hint("Text hint/display showing prompt (hides when entering projection)")
    textHint: SceneObject;
    
    @ui.group_end
    
    @ui.group_start("Projection State")
    @input
    @allowUndefined
    @hint("Root object for Projection state UI")
    projection_State: SceneObject;
    
    @input
    @allowUndefined
    @hint("How-to guide shown during surface detection (sibling of HowToEditState, shares Guide_BG)")
    projectionGuide: SceneObject;
    
    @input
    @allowUndefined
    @hint("Shared background for ProjectionGuide and HowToEditState (Guide_BG)")
    guideBackground: SceneObject;
    
    @input
    @allowUndefined
    @hint("Project button for projection")
    ProjectButton: SceneObject;
    
    @input
    @allowUndefined
    @hint("Confirm button SceneObject (for placement confirmation)")
    confirmButton: SceneObject;
    
    @input
    @allowUndefined
    @hint("Reset button SceneObject (for placement reset)")
    resetButton: SceneObject;
    
    @input
    @allowUndefined
    @hint("Confirm button Interactable component")
    public confirmButtonInteractable: Interactable;
    
    @input
    @allowUndefined
    @hint("Reset button Interactable component")
    resetButtonInteractable: Interactable;
    
    @input
    @allowUndefined
    @hint("The projected image object")
    projectedImageObject: SceneObject;
    
    @input
    @allowUndefined
    @hint("ContainerFrame component on the projected image (optional - will search if not provided)")
    projectedImageContainerFrame: ContainerFrame;
    @ui.group_end
    
    @ui.group_start("How To Edit State")
    @input
    @allowUndefined
    @hint("Root object for How To Edit tutorial (sibling of ProjectionGuide, shares Guide_BG)")
    howToEdit_State: SceneObject;
    
    @input
    @allowUndefined
    @hint("Next button SceneObject (for tutorial navigation)")
    nextButton: SceneObject;
    
    @input
    @allowUndefined
    @hint("Back button SceneObject (for tutorial navigation)")
    backButton: SceneObject;
    
    @input
    @allowUndefined
    @hint("Done button SceneObject (for tutorial completion)")
    doneButton: SceneObject;
    @ui.group_end
    
    @ui.group_start("Tracing State")
    @input
    @allowUndefined
    @hint("Root object for Tracing state UI")
    tracing_State: SceneObject;
    @ui.group_end
    
    // ===== State =====
    private _isLocked: boolean = false;
    private _imageOpacity: number = 1.0;
    
    // ===== Events =====
    private onStateChangeEvent = new Event<StateChangeEvent>();
    public readonly onStateChange = this.onStateChangeEvent.publicApi();
    
    private onSubStateChangeEvent = new Event<string>();
    public readonly onSubStateChange = this.onSubStateChangeEvent.publicApi();
    
    private onLockChangeEvent = new Event<boolean>();
    public readonly onLockChange = this.onLockChangeEvent.publicApi();
    
    private onOpacityChangeEvent = new Event<number>();
    public readonly onOpacityChange = this.onOpacityChangeEvent.publicApi();
    
    // ===== Singleton =====
    private static instance: GameManager | null = null;
    
    public static getInstance(): GameManager | null {
        return GameManager.instance;
    }
    
    // ===== Getters =====
    public get currentState(): GameState {
        return this.stateManager ? this.stateManager.getCurrentState() : GameState.INTRO;
    }
    
    public get currentSubState(): string {
        return this.stateManager ? this.stateManager.getCurrentSubState() : "";
    }
    
    public get isLocked(): boolean {
        return this._isLocked;
    }
    
    public get imageOpacity(): number {
        return this._imageOpacity;
    }
    
    public getHowToEdit_State(): SceneObject | null {
        return this.howToEdit_State;
    }
    
    // ===== Lifecycle =====
    onAwake() {
        GameManager.instance = this;
        this.log = Logger.create("GameManager");
        this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
    }
    
    private onStart() {
        this.log.info("Initializing...");
        
        // Initialize controllers
        this.initializeControllers();
        
        // Load session data (for tutorial completion status and image history)
        const storage = PersistentStorageManager.getInstance();
        if (storage) {
            storage.loadSession();
            storage.loadImageHistory();
        }
        
        // Hide all states first to ensure clean startup
        this.uiVisibilityController.hideAllStates();
        
        // Hide projected image on startup
        if (this.projectedImageObject) {
            this.projectedImageObject.enabled = false;
            // Disable ContainerFrame buttons even if image is disabled (in case it gets enabled later)
            this.disableContainerFrameButtons(this.projectedImageObject);
            this.log.debug("Disabled projectedImageObject on startup");
        } else {
            this.log.warn("projectedImageObject not assigned!");
        }
        
        // Always start at INTRO
        this.setState(GameState.INTRO);
        
        // Set up update loop to continuously disable ContainerFrame buttons
        // This ensures buttons stay disabled even when ContainerFrame auto-shows on hover
        this.createEvent("UpdateEvent").bind(() => {
            // Always check and disable buttons if projected image exists (even if disabled, in case it gets enabled)
            if (this.projectedImageObject) {
                this.disableContainerFrameButtons(this.projectedImageObject);
            }
        });
    }
    
    /**
     * Initialize all controllers
     */
    private initializeControllers(): void {
        // Initialize StateManager
        this.stateManager = new StateManager({
            onStateExit: (state: GameState) => {
                this.uiVisibilityController.exitState(state);
            },
            onStateEnter: (state: GameState) => {
                this.uiVisibilityController.enterState(state);
                // Special handling for IMAGE_GEN state
                if (state === GameState.IMAGE_GEN) {
                    this.setSubState(ImageGenSubState.READY_TO_RECORD);
                }
            },
            onSubStateChange: (subState: string) => {
                this.uiVisibilityController.handleSubStateUI(subState, this.currentState);
                // Handle button visibility based on sub-state
                this.handleSubStateButtonVisibility(subState);
            }
        });
        
        // Initialize UIVisibilityController
        this.uiVisibilityController = new UIVisibilityController(
            {
                intro_State: this.intro_State,
                imageGen_State: this.imageGen_State,
                projection_State: this.projection_State,
                howToEdit_State: this.howToEdit_State,
                tracing_State: this.tracing_State,
                imageGenGuide: this.imageGenGuide,
                micButtonContainer: this.micButtonContainer,
                generatingSpinner: this.generatingSpinner,
                imagePreviewContainer: this.imagePreviewContainer,
                textHint: this.textHint,
                imageConfirmButton: this.imageConfirmButton,
                projectionGuide: this.projectionGuide,
                guideBackground: this.guideBackground,
                projectedImageObject: this.projectedImageObject
            },
            (obj) => this.disableContainerFrameButtons(obj)
        );
        
        // Initialize ButtonVisibilityController
        this.buttonVisibilityController = new ButtonVisibilityController({
            ProjectButton: this.ProjectButton,
            confirmButton: this.confirmButton,
            resetButton: this.resetButton,
            confirmButtonInteractable: this.confirmButtonInteractable,
            resetButtonInteractable: this.resetButtonInteractable,
            nextButton: this.nextButton,
            backButton: this.backButton,
            doneButton: this.doneButton,
            projection_State: this.projection_State,
            howToEdit_State: this.howToEdit_State,
            projectedImageObject: this.projectedImageObject
        });
    }
    
    /**
     * Handle button visibility based on sub-state
     */
    private handleSubStateButtonVisibility(subState: string): void {
        if (this.currentState === GameState.IMAGE_GEN) {
            if (subState === ImageGenSubState.SURFACE_DETECTION) {
                // SURFACE_DETECTION: Only show Project button, hide all others
                this.buttonVisibilityController.setConfirmResetButtonsVisible(false);
                this.buttonVisibilityController.setHowToEditButtonsVisible(false);
                this.log.debug("SURFACE_DETECTION - hiding Confirm/Reset and HowToEdit buttons");
            } else if (subState === ImageGenSubState.PLACED) {
                // PLACED: Hide Project button, Confirm/Reset visibility managed by ProjectionController
                this.buttonVisibilityController.setProjectButtonVisible(false);
                this.buttonVisibilityController.setHowToEditButtonsVisible(false);
                this.log.debug("PLACED - hiding Project and HowToEdit buttons, Confirm/Reset managed by ProjectionController");
            } else {
                // Other sub-states: Hide all projection buttons
                this.buttonVisibilityController.setProjectButtonVisible(false);
                this.buttonVisibilityController.setConfirmResetButtonsVisible(false);
                this.buttonVisibilityController.setHowToEditButtonsVisible(false);
                this.log.debug("Other sub-state - hiding all projection buttons");
            }
        }
    }
    
    /**
     * Start fresh - reset to intro
     */
    public startFresh() {
        this.log.info("Starting fresh");
        this.setState(GameState.INTRO);
    }
    
    /**
     * Recursively enable all children of an object (delegates to UIVisibilityController)
     */
    private enableAllChildren(obj: SceneObject) {
        if (this.uiVisibilityController) {
            this.uiVisibilityController.enableAllChildren(obj, this.currentState, this.currentSubState);
        }
    }
    
    /**
     * Find and disable ContainerFrame buttons on the projected image
     * This ensures close and follow buttons never show, even when ContainerFrame auto-shows on hover
     * Also overrides showVisual() to prevent it from enabling buttons
     */
    private disableContainerFrameButtons(obj: SceneObject) {
        if (!obj) return;
        
        // Helper function to disable buttons on a ContainerFrame instance
        const disableButtonsOnContainerFrame = (containerFrame: any) => {
            if (!containerFrame) return;
            
            // CRITICAL: Set the showCloseButton and showFollowButton properties to false FIRST
            // This prevents showVisual() from enabling the buttons even when the frame shows
            containerFrame.showCloseButton = false;
            containerFrame.showFollowButton = false;
            
            // Disable the buttons using the ContainerFrame methods
            if (typeof containerFrame.enableCloseButton === "function") {
                containerFrame.enableCloseButton(false);
            }
            if (typeof containerFrame.enableFollowButton === "function") {
                containerFrame.enableFollowButton(false);
            }
            
            // Also directly disable the button objects if they exist (most aggressive)
            // This is done continuously in the update loop, so we don't need to override showVisual()
            if (containerFrame.closeButton && containerFrame.closeButton.object) {
                containerFrame.closeButton.object.enabled = false;
            }
            if (containerFrame.followButton && containerFrame.followButton.object) {
                containerFrame.followButton.object.enabled = false;
            }
        };
        
        // First, try using the direct reference if provided
        if (this.projectedImageContainerFrame) {
            try {
                disableButtonsOnContainerFrame(this.projectedImageContainerFrame);
                return; // Found via direct reference
            } catch (e) {
                // Error accessing, continue to search
            }
        }
        
        // Try to find ContainerFrame component by type name
        try {
            const containerFrame = obj.getComponent(ContainerFrame.getTypeName()) as ContainerFrame;
            if (containerFrame) {
                disableButtonsOnContainerFrame(containerFrame);
                return; // Found it, no need to search children
            }
        } catch (e) {
            // Not found by type name, try generic approach
        }
        
        // Fallback: Check if this object has a ContainerFrame component via ScriptComponent
        try {
            const scriptComponent = obj.getComponent("Component.ScriptComponent") as any;
            if (scriptComponent) {
                // Check if it's a ContainerFrame by looking for the enableCloseButton method
                if (typeof scriptComponent.enableCloseButton === "function" && 
                    typeof scriptComponent.enableFollowButton === "function") {
                    disableButtonsOnContainerFrame(scriptComponent);
                    return; // Found it, no need to search children
                }
            }
        } catch (e) {
            // Not a ContainerFrame or error accessing, continue searching
        }
        
        // Recursively check children
        for (let i = 0; i < obj.children.length; i++) {
            this.disableContainerFrameButtons(obj.children[i]);
        }
    }
    
    
    /**
     * Set the current state (delegates to StateManager)
     */
    public setState(newState: GameState) {
        if (this.stateManager) {
            this.stateManager.setState(newState, (event: StateChangeEvent) => {
                this.onStateChangeEvent.invoke(event);
            });
        }
    }
    
    /**
     * Set sub-state within current state (delegates to StateManager)
     */
    public setSubState(subState: string) {
        if (this.stateManager) {
            this.stateManager.setSubState(subState, (subState: string) => {
                this.onSubStateChangeEvent.invoke(subState);
            });
        }
    }
    
    // ===== Public Actions =====
    
    /**
     * Go to home/intro (from hand menu)
     * If there's a saved image, show it in preview mode instead of intro
     * If in projection state (PLACED or SURFACE_DETECTION), reset placement and enter SURFACE_DETECTION
     */
    public goHome() {
        // Check if we're in IMAGE_GEN state with a placed or surface detection state
        // If so, reset placement and enter SURFACE_DETECTION (find surface mode)
        if (this.currentState === GameState.IMAGE_GEN && 
            (this.currentSubState === ImageGenSubState.PLACED || 
             this.currentSubState === ImageGenSubState.SURFACE_DETECTION)) {
            this.log.info("goHome() - Resetting placement and entering SURFACE_DETECTION");
            
            // Reset container frame size and content scale to default (14, 14) when going home from projection state
            if (this.projectedImageContainerFrame) {
                const defaultSize = new vec2(14, 14);
                this.projectedImageContainerFrame.resetInnerSizeAndContent(defaultSize);
                this.log.info("goHome() - Reset container frame size and content scale to default: " + defaultSize.x + ", " + defaultSize.y);
            }
            
            // Reset to SURFACE_DETECTION - this will trigger ProjectionController to reset placement
            this.setSubState(ImageGenSubState.SURFACE_DETECTION);
            // Ensure projected image is enabled for surface detection
            if (this.projectedImageObject) {
                this.projectedImageObject.enabled = true;
            }
            return; // Don't go to INTRO/PREVIEW - stay in SURFACE_DETECTION
        }
        
        // Not in projection state - normal home behavior
        // Always hide the projected image when going home
        if (this.projectedImageObject) {
            this.projectedImageObject.enabled = false;
        }
        
        // Check if there's a saved image - if so, show preview instead of intro
        const storage = PersistentStorageManager.getInstance();
        if (storage && storage.hasImageHistory()) {
            // Go to IMAGE_GEN state with PREVIEW sub-state to show the saved image
            this.setState(GameState.IMAGE_GEN);
            this.setSubState(ImageGenSubState.PREVIEW);
        } else {
            // No saved image, go to intro
            this.setState(GameState.INTRO);
        }
    }
    
    /**
     * Go to image generation (from hand menu or regenerate)
     */
    public goToImageGen() {
        if (this.imageGen_State) {
            this.imageGen_State.enabled = true;
        }
        this.setState(GameState.IMAGE_GEN);
    }
    
    /**
     * Go to projection after confirming image (now just sets sub-state within IMAGE_GEN)
     */
    public goToProjection() {
        this.log.info("goToProjection() called - entering SURFACE_DETECTION");
        
        // CRITICAL: Hide all buttons except Project button when entering projection state
        // Hide Confirm/Reset buttons (they should only show after placement)
        this.setConfirmResetButtonsVisible(false);
        
        // Hide HowToEdit buttons (they should only show in HOW_TO_EDIT state)
        this.setHowToEditButtonsVisible(false);
        
        // Explicitly hide HowToEditState before showing ProjectionGuide
        if (this.howToEdit_State) {
            this.howToEdit_State.enabled = false;
            this.log.debug("goToProjection - hid howToEdit_State");
        }
        
        // CRITICAL: Hide imageGenGuide when entering projection (it should only show in READY_TO_RECORD and PREVIEW)
        if (this.imageGenGuide) {
            this.imageGenGuide.enabled = false;
            this.log.debug("goToProjection - hid imageGenGuide");
        }
        
        if (this.currentState === GameState.IMAGE_GEN) {
            this.log.debug("Already in IMAGE_GEN state, disabling imageGen_State and setting SURFACE_DETECTION");
            if (this.imageGen_State) {
                this.imageGen_State.enabled = false;
                this.log.debug("imageGen_State disabled: " + !this.imageGen_State.enabled);
            }
            this.setSubState(ImageGenSubState.SURFACE_DETECTION);
        } else {
            this.log.debug("Not in IMAGE_GEN, transitioning to IMAGE_GEN first");
            // If not in IMAGE_GEN, go to it first
            this.setState(GameState.IMAGE_GEN);
            if (this.imageGen_State) {
                this.imageGen_State.enabled = false;
                this.log.debug("imageGen_State disabled: " + !this.imageGen_State.enabled);
            }
            this.setSubState(ImageGenSubState.SURFACE_DETECTION);
        }
        this.log.debug("goToProjection() complete - currentSubState: " + this.currentSubState);
    }
    
    /**
     * Go to how-to-edit tutorial after confirming placement
     */
    public goToHowToEdit() {
        this.log.info("goToHowToEdit - transitioning from projection to edit state");
        
        // STEP 4: Confirm projection - Hide ProjectionGuide and buttons, show HowToEditState
        if (this.projectionGuide) {
            this.projectionGuide.enabled = false;
            this.log.debug("goToHowToEdit - Hid projectionGuide");
        }
        
        // Disable projection_State first (but image should not be a child of it)
        if (this.projection_State) {
            this.projection_State.enabled = false;
            this.log.debug("goToHowToEdit - Hid projection_State");
        }
        
        // Transition to HOW_TO_EDIT state
        // enterState will handle showing HowToEditState and shared background
        this.setState(GameState.HOW_TO_EDIT);
        
        // CRITICAL: Explicitly hide ProjectionGuide and place button BEFORE enabling children
        // This prevents them from being re-enabled by enableAllChildren
        if (this.projectionGuide && this.projectionGuide.enabled) {
            this.projectionGuide.enabled = false;
            this.log.debug("goToHowToEdit - Hid projectionGuide before enabling children");
        }
        
        // Ensure projected image is enabled after state transition
        // (enterState should handle this, but double-check to be safe)
        // NOTE: We enable the object but DON'T call enableAllChildren to avoid re-enabling ProjectionGuide/place button
        if (this.projectedImageObject) {
            this.projectedImageObject.enabled = true;
            // DON'T call enableAllChildren here - it might re-enable ProjectionGuide and place button
            // Instead, only enable specific children that should be visible in HOW_TO_EDIT state
            this.disableContainerFrameButtons(this.projectedImageObject);
            this.log.debug("goToHowToEdit - Ensured projected image is enabled (skipped enableAllChildren to prevent re-enabling ProjectionGuide)");
        }
        
        // CRITICAL: Double-check that ProjectionGuide and place button are still hidden
        if (this.projectionGuide && this.projectionGuide.enabled) {
            this.projectionGuide.enabled = false;
            this.log.debug("goToHowToEdit - Force-hid projectionGuide after enabling projectedImageObject");
        }
    }
    
    /**
     * Go to tracing mode after completing tutorial
     */
    public goToTracing() {
        if (this.howToEdit_State) {
            this.howToEdit_State.enabled = false;
        }
        this.setState(GameState.TRACING);
    }
    
    /**
     * Set lock state (session only, not persisted)
     */
    public setLocked(locked: boolean) {
        this._isLocked = locked;
        this.onLockChangeEvent.invoke(locked);
    }
    
    /**
     * Toggle lock state
     */
    public toggleLock() {
        this.setLocked(!this._isLocked);
    }
    
    /**
     * Set image opacity (session only, not persisted)
     */
    public setImageOpacity(opacity: number) {
        this._imageOpacity = Math.max(0, Math.min(1, opacity));
        this.onOpacityChangeEvent.invoke(this._imageOpacity);
    }
    
    /**
     * Hide text hint (called when confirming image to proceed to projection)
     */
    public hideTextHint() {
            if (this.textHint) {
                this.textHint.enabled = false;
            }
    }
    
    // ===== Image Gen Helpers =====
    
    /**
     * Called when user starts recording
     */
    public onRecordingStarted() {
        if (this.currentState === GameState.IMAGE_GEN) {
            this.setSubState(ImageGenSubState.RECORDING);
        }
    }
    
    /**
     * Called when generation starts
     */
    public onGenerationStarted() {
        if (this.currentState === GameState.IMAGE_GEN) {
            this.setSubState(ImageGenSubState.GENERATING);
        }
    }
    
    /**
     * Called when image is ready for preview
     */
    public onImageReady() {
        if (this.currentState === GameState.IMAGE_GEN) {
            this.setSubState(ImageGenSubState.PREVIEW);
        }
    }
    
    /**
     * Called when user wants to regenerate (via mic)
     * This is now handled automatically - user just uses mic again
     */
    public onRegenerateRequested() {
        if (this.currentState === GameState.IMAGE_GEN) {
            // Show Image Gen UI when regenerating
            if (this.imageGen_State) {
                this.imageGen_State.enabled = true;
            }
            // Go back to ready to record - mic will be visible
            this.setSubState(ImageGenSubState.READY_TO_RECORD);
        }
    }
    
    // ===== Projection Helpers =====
    
    /**
     * Called when image is placed on surface
     */
    public onImagePlaced() {
        if (this.currentState === GameState.IMAGE_GEN) {
            this.setSubState(ImageGenSubState.PLACED);
        }
    }
    
    /**
     * Called when user wants to reposition
     */
    public onRepositionRequested() {
        if (this.currentState === GameState.IMAGE_GEN) {
            this.setSubState(ImageGenSubState.SURFACE_DETECTION);
        }
    }
    
    // ===== Button Visibility Management =====
    
    /**
     * Set project button visibility (delegates to ButtonVisibilityController)
     */
    public setProjectButtonVisible(visible: boolean): void {
        if (this.buttonVisibilityController) {
            this.buttonVisibilityController.setProjectButtonVisible(visible);
        }
    }
    
    /**
     * Set confirm and reset buttons visibility (delegates to ButtonVisibilityController)
     */
    public setConfirmResetButtonsVisible(visible: boolean): void {
        if (this.buttonVisibilityController) {
            this.buttonVisibilityController.setConfirmResetButtonsVisible(visible);
        }
    }
    
    /**
     * Set HowToEdit navigation buttons visibility (delegates to ButtonVisibilityController)
     */
    public setHowToEditButtonsVisible(visible: boolean): void {
        if (this.buttonVisibilityController) {
            this.buttonVisibilityController.setHowToEditButtonsVisible(visible);
        }
    }
    
}


/**
 * ProjectionController.ts
 * 
 * Main controller for surface detection, image placement, and projection UI.
 * Orchestrates WorldQueryHit_Modified, PlacementController, and ProjectionUIHandler modules.
 * 
 * SIMPLIFIED FLOW:
 * STEP 1: SURFACE_DETECTION - Preview mode, hit tests run, object follows surfaces
 * STEP 2: Project Button Clicked → isPlaced = true, object locks to current preview position
 * STEP 3: Confirm/Reset buttons show (only once, tracked by buttonsShown flag)
 * STEP 4: 
 *   - Confirm → Proceed to next step (goToHowToEdit)
 *   - Reset → Go back to STEP 1 (resetPlacement, SURFACE_DETECTION)
 */

import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";
import { GameManager } from "./GameManager";
import { GameState, ImageGenSubState } from "../Core/GameState";
import { WorldQueryHit_Modified, WorldQueryHit_ModifiedState } from "../Interaction/WorldQueryHit_Modified";
import { PlacementController, PlacementControllerState } from "../Interaction/PlacementController";
import { ProjectionUIHandler, ProjectionUIHandlerState } from "../Interaction/ProjectionUIHandler";
import { Logger, LoggerInstance } from "../Utilities/Logging/Logger";

@component
export class ProjectionController extends BaseScriptComponent {
    private log: LoggerInstance;
    
    // ===== Controllers =====
    private worldQueryHit_Modified: WorldQueryHit_Modified;
    private placementController: PlacementController;
    private projectionUIHandler: ProjectionUIHandler;
    
    // ===== Inputs =====
    @input indexToSpawn: number;
    @input targetObject: SceneObject;
    @input objectsToSpawn: SceneObject[];
    @input filterEnabled: boolean;
    @input camera: Camera;
    @input
    @hint("Z rotation offset for floor surfaces (in degrees)")
    floorRotationZ: number = 0;
    @input
    @hint("Z rotation offset for ceiling surfaces (in degrees)")
    ceilingRotationZ: number = 0;
    @input project: SceneObject;
    @input
    @hint("Project button interactable (for click handler)")
    projectButtonInteractable: Interactable;
    
    // ===== State =====
    private gameManager: GameManager | null = null;
    private isActive: boolean = false;
    private _lastSubState: string = "";
    
    // Shared state objects
    private worldQueryHit_ModifiedState: WorldQueryHit_ModifiedState;
    private placementState: PlacementControllerState;
    private uiHandlerState: ProjectionUIHandlerState;
    
    onAwake() {
        this.log = Logger.create("ProjectionController");
        
        if (!this.targetObject) {
            this.targetObject = this.sceneObject;
        }
        
        if (!this.targetObject) {
            this.log.error("Please set Target Object input");
            return;
        }
        
        const transform = this.targetObject.getTransform();
        
        // Initialize shared state
        this.worldQueryHit_ModifiedState = {
            isPlaced: false,
            isClicked: false,
            resetCooldownTime: 0,
            ignoreNextHitTest: false,
            allowAutoPositioning: false,
            lastPosition: null,
            lastRotation: null
        };
        
        this.placementState = {
            isPlaced: false,
            isClicked: false,
            hasPositionedImage: false,
            lastPosition: null,
            lastRotation: null,
            allowAutoPositioning: false,
            resetCooldownTime: 0,
            ignoreNextHitTest: false
        };
        
        this.uiHandlerState = {
            buttonsShown: false,
            placeButtonHidden: false
        };
        
        // Initialize controllers
        this.initializeControllers();
        
        // Enable target object for preview
        this.targetObject.enabled = true;
        this.positionAtDefaultLocation();
        
        this.setObjectEnabled(this.indexToSpawn);
        this.log.info("Initialized - targetObject: " + this.targetObject.name + ", enabled: " + this.targetObject.enabled);
        
        if (!this.project) {
            this.project.enabled = true;
        }
        
        this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
        this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
    }
    
    /**
     * Sync state between modules
     */
    private syncState(): void {
        // Sync placement state
        this.worldQueryHit_ModifiedState.isPlaced = this.placementState.isPlaced;
        this.worldQueryHit_ModifiedState.isClicked = this.placementState.isClicked;
        this.worldQueryHit_ModifiedState.allowAutoPositioning = this.placementState.allowAutoPositioning;
        this.worldQueryHit_ModifiedState.resetCooldownTime = this.placementState.resetCooldownTime;
        this.worldQueryHit_ModifiedState.ignoreNextHitTest = this.placementState.ignoreNextHitTest;
        this.worldQueryHit_ModifiedState.lastPosition = this.placementState.lastPosition;
        this.worldQueryHit_ModifiedState.lastRotation = this.placementState.lastRotation;
    }
    
    /**
     * Initialize all controllers
     */
    private initializeControllers(): void {
        // Initialize WorldQueryHit_Modified
        this.worldQueryHit_Modified = new WorldQueryHit_Modified(
            this.camera,
            this.targetObject,
            this.filterEnabled,
            this.floorRotationZ,
            this.ceilingRotationZ,
            {
                onSurfaceHit: (position: vec3, normal: vec3) => {
                    // Update placement controller with position
                    const rotation = this.worldQueryHit_ModifiedState.lastRotation;
                    if (rotation) {
                        this.placementController.updatePosition(position, rotation);
                    }
                },
                onNoSurfaceHit: () => {
                    // Handle no surface hit if needed
                }
            },
            this.worldQueryHit_ModifiedState,
            this.log
        );
        
        // Sync state between modules
        this.syncState();
        
        // Initialize PlacementController
        this.placementController = new PlacementController(
            this.targetObject,
            this.project,
            {
                onPlacementChanged: (isPlaced: boolean) => {
                    // Sync state between modules
                    this.worldQueryHit_ModifiedState.isPlaced = isPlaced;
                    this.worldQueryHit_ModifiedState.isClicked = isPlaced;
                    this.placementState.isPlaced = isPlaced;
                    this.placementState.isClicked = isPlaced;
                    if (isPlaced && this.gameManager) {
                        this.gameManager.onImagePlaced();
                    }
                },
                onReset: () => {
                    // Sync state
                    this.syncState();
                    if (this.gameManager) {
                        this.gameManager.onRepositionRequested();
                    }
                },
                enableAllChildren: (obj: SceneObject) => {
                    this.projectionUIHandler.enableAllChildren(obj);
                },
                positionAtDefaultLocation: () => {
                    this.positionAtDefaultLocation();
                }
            },
            this.placementState,
            this.log
        );
        
        // Initialize ProjectionUIHandler
        this.projectionUIHandler = new ProjectionUIHandler(
            this.projectButtonInteractable,
            null, // Will be set in onStart
            this.targetObject,
            {
                onPlaceButtonClicked: () => {
                    this.placementController.place();
                    this.syncState(); // Sync state after placement
                    this.uiHandlerState.buttonsShown = false; // Reset flag so buttons will be shown in STEP 3
                },
                onConfirmButtonClicked: () => {
                    // Handled by ProjectionUIHandler
                },
                onResetButtonClicked: () => {
                    this.placementController.reset();
                    this.syncState(); // Sync state after reset
                },
                enableAllChildren: (obj: SceneObject) => {
                    this.projectionUIHandler.enableAllChildren(obj);
                },
                disableAllChildren: (obj: SceneObject) => {
                    this.projectionUIHandler.disableAllChildren(obj);
                }
            },
            this.uiHandlerState,
            this.log
        );
    }
    
    private onStart() {
        this.log.info("===== onStart() BEGIN =====");
        this.gameManager = GameManager.getInstance();
        
        if (!this.gameManager) {
            this.log.error("✗✗✗ ERROR - GameManager is null! ✗✗✗");
            return;
        }
        
        this.log.info("GameManager found, currentState: " + this.gameManager.currentState + ", currentSubState: " + this.gameManager.currentSubState);
        
        // Update ProjectionUIHandler with GameManager reference
        (this.projectionUIHandler as any).gameManager = this.gameManager;
        
        // Setup buttons
        this.log.debug("Setting up project button...");
        this.projectionUIHandler.setupPlaceButton();
        
        this.log.debug("Setting up confirm and reset buttons...");
        this.projectionUIHandler.setupConfirmButton();
        this.projectionUIHandler.setupResetButton();
        
        // Subscribe to GameManager events
        this.log.debug("Subscribing to GameManager events...");
        this.subscribeToGameManagerEvents();
        
        // Initialize UI (hide all buttons initially)
        this.log.debug("Initializing UI (hiding all buttons)...");
        this.initializeUI();
        
        // Force-disable all buttons immediately
        this.log.debug("Force-disabling all buttons on initialization...");
        if (this.gameManager) {
            this.gameManager.setProjectButtonVisible(false);
            this.gameManager.setConfirmResetButtonsVisible(false);
        }
        
        // Check if already in projection state
        if (this.gameManager && this.gameManager.currentState === GameState.IMAGE_GEN) {
            const currentSubState = this.gameManager.currentSubState;
            this.log.debug("Checking if already in projection state: " + currentSubState);
            if (currentSubState === ImageGenSubState.SURFACE_DETECTION || currentSubState === ImageGenSubState.PLACED) {
                this.log.info("✓ Already in projection state on initialization - handling state: " + currentSubState);
                this.handleSubStateChange(currentSubState);
            } else {
                this.log.debug("Not in projection state yet, waiting for state change event");
            }
        }
        
        this.log.info("===== onStart() COMPLETE =====");
    }
    
    /**
     * Subscribe to GameManager events
     */
    private subscribeToGameManagerEvents(): void {
        if (!this.gameManager) return;
        
        // Subscribe to state changes
        this.gameManager.onStateChange.add((event) => {
            if (event.newState === GameState.INTRO) {
                this.resetPlacementState();
            }
            
            if (event.previousState === GameState.INTRO && event.newState === GameState.IMAGE_GEN) {
                this.log.info("Entering IMAGE_GEN from INTRO - resetting state");
                this.isActive = false;
                this._lastSubState = "";
            }
        });
        
        // Subscribe to sub-state changes
        this.gameManager.onSubStateChange.add((subState) => {
            this.log.debug("Received onSubStateChange event: " + subState);
            if (this.gameManager!.currentState === GameState.IMAGE_GEN) {
                this.handleSubStateChange(subState);
            }
        });
        
        // Subscribe to lock changes
        this.gameManager.onLockChange.add((locked) => {
            this.handleLockChange(locked);
        });
    }
    
    /**
     * Handle sub-state change
     */
    private handleSubStateChange(subState: string): void {
        this.log.debug("handleSubStateChange() called - subState: " + subState);
        const previousSubState = this._lastSubState;
        this._lastSubState = subState;
        
        if (subState === ImageGenSubState.SURFACE_DETECTION) {
            this.onEnterProjectionState();
        } else if (subState === ImageGenSubState.PLACED) {
            this.onSubStateChanged(subState);
        }
    }
    
    /**
     * Enter projection state
     */
    private onEnterProjectionState(): void {
        const currentSubState = this.gameManager ? this.gameManager.currentSubState : "";
        this.log.debug("onEnterProjectionState - currentSubState: " + currentSubState);
        
        const placementState = this.placementController.getState();
        const isResettingFromPlaced = this._lastSubState === ImageGenSubState.PLACED;
        
        // When entering SURFACE_DETECTION, ALWAYS reset to preview mode
        // This ensures the object is not attached/locked from previous sessions
        if (currentSubState === ImageGenSubState.SURFACE_DETECTION) {
            // ALWAYS reset container frame size and content scale to default (14, 14) when entering SURFACE_DETECTION
            // This ensures the frame and content are reset even if coming from a scaled state
            if (this.gameManager && this.gameManager.projectedImageContainerFrame) {
                const defaultSize = new vec2(14, 14);
                this.gameManager.projectedImageContainerFrame.resetInnerSizeAndContent(defaultSize);
                this.log.info("onEnterProjectionState - Reset container frame size and content scale to default: " + defaultSize.x + ", " + defaultSize.y);
            }
            
            // ALWAYS reset placement when entering SURFACE_DETECTION to ensure preview mode
            // This handles cases where previous state had isPlaced/isClicked = true
            this.log.info("onEnterProjectionState - Resetting to preview mode for SURFACE_DETECTION");
            this.placementController.manualPlace();
        }
        
        // Enable target object for preview
        if (this.targetObject) {
            this.log.debug("onEnterProjectionState - Enabling targetObject for preview");
            this.targetObject.enabled = true;
            this.projectionUIHandler.enableAllChildren(this.targetObject);
        }
    }
    
    /**
     * Handle sub-state changed
     */
    private onSubStateChanged(subState: string): void {
        this.log.debug("onSubStateChanged - subState: " + subState);
        
        if (subState === ImageGenSubState.SURFACE_DETECTION) {
            this.projectionUIHandler.showSurfaceDetectionUI();
        } else if (subState === ImageGenSubState.PLACED) {
            // Hide place button, show confirm/reset buttons
            if (this.gameManager) {
                this.gameManager.setProjectButtonVisible(false);
            }
        }
    }
    
    /**
     * Handle lock change
     */
    private handleLockChange(locked: boolean): void {
        // Update button visibility based on lock state
        if (this.gameManager && this.gameManager.currentSubState === ImageGenSubState.SURFACE_DETECTION) {
            if (this.projectButtonInteractable) {
                this.projectButtonInteractable.enabled = !locked;
            }
        }
    }
    
    /**
     * Reset placement state
     */
    private resetPlacementState(): void {
        this.log.info("Resetting placement state (going home)");
        
        // Reset placement with clearPosition=true to start fresh
        this.placementController.reset(true);
        
        // Reset container frame size and content scale to default (14, 14)
        if (this.gameManager && this.gameManager.projectedImageContainerFrame) {
            const defaultSize = new vec2(14, 14);
            this.gameManager.projectedImageContainerFrame.resetInnerSizeAndContent(defaultSize);
            this.log.info("Reset container frame size and content scale to default: " + defaultSize.x + ", " + defaultSize.y);
        }
        
        // Position object at default location
        this.positionAtDefaultLocation();
        
        if (this.gameManager) {
            this.gameManager.setProjectButtonVisible(false);
            this.gameManager.setConfirmResetButtonsVisible(false);
        }
        
        this.uiHandlerState.buttonsShown = false;
    }
    
    /**
     * Initialize UI
     */
    private initializeUI(): void {
        if (this.gameManager) {
            this.gameManager.setProjectButtonVisible(false);
            this.gameManager.setConfirmResetButtonsVisible(false);
        }
    }
    
    /**
     * Position object at default location
     */
    private positionAtDefaultLocation(): void {
        if (!this.camera) return;
        
        const cameraTransform = this.camera.getTransform();
        const cameraPosition = cameraTransform.getWorldPosition();
        const cameraDirection = cameraTransform.back;
        const distance = 3.0;
        const position = new vec3(
            cameraPosition.x + cameraDirection.x * distance,
            cameraPosition.y + cameraDirection.y * distance,
            cameraPosition.z + cameraDirection.z * distance
        );
        
        this.targetObject.getTransform().setWorldPosition(position);
        const directionToCamera = new vec3(-cameraDirection.x, -cameraDirection.y, -cameraDirection.z);
        this.targetObject.getTransform().setWorldRotation(quat.lookAt(directionToCamera, vec3.up()));
        this.placementState.hasPositionedImage = true;
        this.placementState.lastPosition = position;
    }
    
    /**
     * Update loop
     */
    onUpdate() {
        // Wait for onStart to complete
        if (!this.gameManager) {
            return;
        }
        
        // CRITICAL: Check state FIRST before any other logic
        const currentState = this.gameManager.currentState as any;
        if (currentState === GameState.HOW_TO_EDIT) {
            // In HOW_TO_EDIT state - ensure HowToEditState is enabled
            const howToEdit_State = this.gameManager.getHowToEdit_State ? this.gameManager.getHowToEdit_State() : null;
            if (howToEdit_State && !howToEdit_State.enabled) {
                howToEdit_State.enabled = true;
                this.log.debug("onUpdate - Enabled HowToEditState (in HOW_TO_EDIT state)");
            }
            
            // Hide all projection buttons when in HOW_TO_EDIT state
            if (this.gameManager) {
                this.gameManager.setProjectButtonVisible(false);
                if (this.uiHandlerState.buttonsShown) {
                    this.gameManager.setConfirmResetButtonsVisible(false);
                    this.uiHandlerState.buttonsShown = false;
                }
            }
            
            // Hide ProjectionGuide if visible
            const projectionGuide = (this.gameManager as any).projectionGuide;
            if (projectionGuide && projectionGuide.enabled) {
                projectionGuide.enabled = false;
                this.log.debug("onUpdate - Hid ProjectionGuide (in HOW_TO_EDIT state)");
            }
            
            // Just ensure targetObject is enabled, don't recursively enable children
            if (this.targetObject && !this.targetObject.enabled) {
                this.targetObject.enabled = true;
            }
            
            return; // Don't process projection logic when in HOW_TO_EDIT state
        }
        
        const currentSubState = this.gameManager.currentSubState;
        
        // ===== STEP 1: SURFACE_DETECTION - Show place button =====
        if (currentSubState === ImageGenSubState.SURFACE_DETECTION) {
            const placementState = this.placementController.getState();
            if (!placementState.isPlaced || !placementState.isClicked) {
                // Not placed yet - show place button, hide confirm/reset
                this.uiHandlerState.buttonsShown = false;
                if (this.gameManager) {
                    this.gameManager.setConfirmResetButtonsVisible(false);
                }
                this.projectionUIHandler.showSurfaceDetectionUI();
                
                // Continuously disable HowToEdit buttons during SURFACE_DETECTION
                this.projectionUIHandler.disableHowToEditButtonsInHierarchy(this.targetObject);
                if (this.gameManager) {
                    const projection_State = (this.gameManager as any).projection_State;
                    if (projection_State) {
                        this.projectionUIHandler.disableHowToEditButtonsInHierarchy(projection_State);
                    }
                }
            }
        } 
        // ===== STEP 3: PLACED - Hide place button, show confirm/reset buttons =====
        else if (currentSubState === ImageGenSubState.PLACED) {
            // Hide place button via GameManager
            if (this.gameManager) {
                this.gameManager.setProjectButtonVisible(false);
            }
            
            // Only show buttons once when conditions are met
            const placementState = this.placementController.getState();
            if (placementState.isPlaced && placementState.isClicked && !this.uiHandlerState.buttonsShown) {
                this.projectionUIHandler.showConfirmAndResetButtons();
            } else if (!placementState.isPlaced || !placementState.isClicked) {
                // Conditions not met - hide buttons
                if (this.uiHandlerState.buttonsShown) {
                    if (this.gameManager) {
                        this.gameManager.setConfirmResetButtonsVisible(false);
                    }
                    this.uiHandlerState.buttonsShown = false;
                }
            }
        } 
        // Other states: Hide all buttons
        else {
            if (this.gameManager) {
                this.gameManager.setProjectButtonVisible(false);
                if (this.uiHandlerState.buttonsShown) {
                    this.gameManager.setConfirmResetButtonsVisible(false);
                    this.uiHandlerState.buttonsShown = false;
                }
            }
        }
        
        // Update cooldown and sync state
        this.worldQueryHit_Modified.updateCooldown(getDeltaTime());
        this.syncState(); // Keep state in sync
        
        // Ensure target object is enabled
        if (!this.targetObject.enabled) {
            this.targetObject.enabled = true;
            this.projectionUIHandler.enableAllChildren(this.targetObject);
        } else {
            this.projectionUIHandler.enableAllChildren(this.targetObject);
        }
        
        // Safety check: Ensure buttons are in correct state
        if (this.gameManager) {
            if (currentSubState === ImageGenSubState.SURFACE_DETECTION) {
                this.gameManager.setConfirmResetButtonsVisible(false);
                this.gameManager.setHowToEditButtonsVisible(false);
            } else if (currentSubState === ImageGenSubState.PLACED) {
                this.gameManager.setProjectButtonVisible(false);
                this.gameManager.setHowToEditButtonsVisible(false);
            } else {
                this.gameManager.setProjectButtonVisible(false);
                this.gameManager.setConfirmResetButtonsVisible(false);
                this.gameManager.setHowToEditButtonsVisible(false);
            }
        }
        
        // Manage guide visibility
        if (this.gameManager) {
            const currentState = this.gameManager.currentState as any;
            const isInProjectionState = currentState === GameState.IMAGE_GEN && 
                                       (currentSubState === ImageGenSubState.SURFACE_DETECTION || 
                                        currentSubState === ImageGenSubState.PLACED);
            
            const imageGenGuide = (this.gameManager as any).imageGenGuide;
            if (imageGenGuide && isInProjectionState && imageGenGuide.enabled) {
                imageGenGuide.enabled = false;
                this.log.debug("onUpdate - Hid imageGenGuide (in projection state)");
            }
            
            const projectionGuide = (this.gameManager as any).projectionGuide;
            if (projectionGuide) {
                if (isInProjectionState && !projectionGuide.enabled) {
                    projectionGuide.enabled = true;
                    this.log.debug("onUpdate - Enabled ProjectionGuide (in projection state)");
                } else if (!isInProjectionState && projectionGuide.enabled) {
                    projectionGuide.enabled = false;
                    this.log.debug("onUpdate - Hid ProjectionGuide (not in projection state)");
                }
            }
            
            if (currentState === GameState.HOW_TO_EDIT) {
                const howToEdit_State = this.gameManager.getHowToEdit_State ? this.gameManager.getHowToEdit_State() : null;
                if (howToEdit_State && !howToEdit_State.enabled) {
                    howToEdit_State.enabled = true;
                    this.log.debug("onUpdate - Enabled HowToEditState (in HOW_TO_EDIT state)");
                }
                if (projectionGuide && projectionGuide.enabled) {
                    projectionGuide.enabled = false;
                    this.log.debug("onUpdate - Hid ProjectionGuide (in HOW_TO_EDIT state)");
                }
                if (imageGenGuide && imageGenGuide.enabled) {
                    imageGenGuide.enabled = false;
                    this.log.debug("onUpdate - Hid imageGenGuide (in HOW_TO_EDIT state)");
                }
            } else {
                if (this.gameManager.getHowToEdit_State) {
                    const howToEdit_State = this.gameManager.getHowToEdit_State();
                    if (howToEdit_State && howToEdit_State.enabled) {
                        howToEdit_State.enabled = false;
                        this.log.debug("onUpdate - Hid HowToEditState (not in HOW_TO_EDIT state)");
                    }
                }
                
                // Continuously disable HowToEdit buttons
                this.projectionUIHandler.disableHowToEditButtonsInHierarchy(this.targetObject);
                if (this.gameManager) {
                    const projection_State = (this.gameManager as any).projection_State;
                    if (projection_State) {
                        this.projectionUIHandler.disableHowToEditButtonsInHierarchy(projection_State);
                    }
                }
            }
        }
        
        // Perform hit tests
        if (!this.worldQueryHit_Modified.getHitTestSession()) {
            const placementState = this.placementController.getState();
            if (!placementState.hasPositionedImage && this.camera && !placementState.allowAutoPositioning) {
                this.positionAtDefaultLocation();
            }
            return;
        }
        
        const placementState = this.placementController.getState();
        
        // In SURFACE_DETECTION state, always allow hit tests (object should follow surfaces in preview mode)
        // Only skip if on cooldown or if object is placed AND clicked (locked) AND not in SURFACE_DETECTION
        const shouldSkipHitTests = this.worldQueryHit_ModifiedState.resetCooldownTime > 0 || 
                                   (currentSubState !== ImageGenSubState.SURFACE_DETECTION && 
                                    placementState.isPlaced && placementState.isClicked);
        if (shouldSkipHitTests) {
            return; // Skip hit tests if on cooldown or object is locked (and not in SURFACE_DETECTION)
        }
        
        // Perform hit test
        // Note: onHitTestResult is called by Lens Studio's hit test system, not directly
        // The WorldQueryHit_Modified's performHitTest sets up the hit test, and Lens Studio calls onHitTestResult
        this.worldQueryHit_Modified.performHitTest();
        
        // Fallback: Position at default location if no hit test result yet
        if (!placementState.hasPositionedImage) {
            this.positionAtDefaultLocation();
        }
    }
    
    // ===== Public API =====
    
    /**
     * Manual place (public API)
     */
    public manualPlace(): void {
        this.placementController.manualPlace();
    }
    
    /**
     * Reset placement (public API)
     */
    public resetPlacement(): void {
        this.placementController.reset();
    }
    
    // ===== Utility Methods =====
    
    /**
     * Handle hit test result (called by Lens Studio hit test system)
     */
    onHitTestResult(results: any): void {
        this.worldQueryHit_Modified.onHitTestResult(results);
    }
    
    /**
     * Set object enabled
     */
    setObjectEnabled(i: number): void {
        for (let j = 0; j < this.objectsToSpawn.length; j++) {
            this.objectsToSpawn[j].enabled = j === i;
        }
    }
    
    /**
     * Set object index
     */
    setObjectIndex(i: number): void {
        this.indexToSpawn = i;
    }
}


/**
 * PlacementController.ts
 * 
 * Handles placement logic for ProjectionController.
 * Extracted from WorldQueryHit_Modified to separate concerns.
 */

export interface PlacementControllerCallbacks {
    onPlacementChanged?: (isPlaced: boolean) => void;
    onReset?: () => void;
    enableAllChildren?: (obj: SceneObject) => void;
    positionAtDefaultLocation?: () => void;
}

export interface PlacementControllerState {
    isPlaced: boolean;
    isClicked: boolean;
    hasPositionedImage: boolean;
    lastPosition: vec3 | null;
    lastRotation: quat | null;
    allowAutoPositioning: boolean;
    resetCooldownTime: number;
    ignoreNextHitTest: boolean;
}

export class PlacementController {
    private targetObject: SceneObject;
    private transform: Transform;
    private project: SceneObject | null;
    private callbacks: PlacementControllerCallbacks;
    private state: PlacementControllerState;
    private log: any; // Logger instance

    constructor(
        targetObject: SceneObject,
        project: SceneObject | null,
        callbacks: PlacementControllerCallbacks,
        state: PlacementControllerState,
        log: any
    ) {
        this.targetObject = targetObject;
        this.transform = targetObject.getTransform();
        this.project = project;
        this.callbacks = callbacks;
        this.state = state;
        this.log = log;
    }

    /**
     * Place object at current preview position
     */
    public place(): void {
        this.log.info("PlacementController: place() called");
        
        if (!this.state.lastPosition || !this.state.lastRotation || !this.targetObject) {
            this.log.warn("PlacementController: No preview position available, using default placement");
            this.manualPlace();
            return;
        }
        
        // Use the current preview position/rotation
        this.transform.setWorldPosition(this.state.lastPosition);
        this.transform.setWorldRotation(this.state.lastRotation);
        this.targetObject.enabled = true;
        
        // Enable children
        if (this.callbacks.enableAllChildren) {
            this.callbacks.enableAllChildren(this.targetObject);
        }
        
        // Mark as placed
        this.state.isPlaced = true;
        this.state.isClicked = true;
        this.state.allowAutoPositioning = false; // Stop hit tests from repositioning
        
        this.log.info("PlacementController: ✓ Object placed at: (" + 
            this.state.lastPosition.x.toFixed(2) + ", " + 
            this.state.lastPosition.y.toFixed(2) + ", " + 
            this.state.lastPosition.z.toFixed(2) + ")");
        
        if (this.callbacks.onPlacementChanged) {
            this.callbacks.onPlacementChanged(true);
        }
    }

    /**
     * Manual place (reset and allow auto-positioning)
     * Always resets to preview mode - clears isPlaced and isClicked to ensure object follows surfaces
     */
    public manualPlace(): void {
        this.log.info("PlacementController: manualPlace() START");
        
        // Always reset to preview mode - clear placement flags
        this.state.isPlaced = false;
        this.state.isClicked = false; // Always reset to allow preview mode
        
        this.state.hasPositionedImage = false;
        this.state.lastPosition = null;
        this.state.lastRotation = null;
        this.state.ignoreNextHitTest = false;
        this.state.resetCooldownTime = 0;
        
        this.state.allowAutoPositioning = true;
        this.log.debug("PlacementController: allowAutoPositioning set to true, isPlaced: false, isClicked: false (reset to preview mode)");
        
        if (!this.targetObject) {
            this.log.error("PlacementController: ERROR - targetObject is null!");
            return;
        }
        
        this.log.debug("PlacementController: Enabling targetObject: " + this.targetObject.name);
        this.targetObject.enabled = true;
        
        // Enable all children
        if (this.callbacks.enableAllChildren) {
            this.callbacks.enableAllChildren(this.targetObject);
        }
        
        // Position at default location - hit tests will reposition it
        if (this.callbacks.positionAtDefaultLocation) {
            this.callbacks.positionAtDefaultLocation();
        }
        this.state.hasPositionedImage = false; // Let hit tests position it
        this.state.lastPosition = null; // Will be set by hit test
        
        this.log.info("PlacementController: manualPlace() COMPLETE - image enabled, waiting for hit test");
    }

    /**
     * Reset placement (go back to preview mode)
     * @param clearPosition If true, clears lastPosition and lastRotation to start fresh
     */
    public reset(clearPosition: boolean = false): void {
        this.log.info("PlacementController: reset() called - Going back to preview mode (clearPosition: " + clearPosition + ")");
        
        this.state.isPlaced = false;
        this.state.isClicked = false;
        this.state.hasPositionedImage = false;
        this.state.ignoreNextHitTest = true;
        this.state.resetCooldownTime = 0.1;
        this.state.allowAutoPositioning = false; // Go back to preview mode
        
        // Clear position/rotation if requested (e.g., when going home)
        if (clearPosition) {
            this.state.lastPosition = null;
            this.state.lastRotation = null;
            this.log.debug("PlacementController: Cleared lastPosition and lastRotation for fresh start");
        }
        // Otherwise keep lastPosition and lastRotation for preview continuity
        
        // Keep target ENABLED - user should see the image immediately for preview
        if (this.targetObject) {
            this.log.debug("PlacementController: Reset placement - back to preview mode");
            this.targetObject.enabled = true;
            // Enable children
            if (this.callbacks.enableAllChildren) {
                this.callbacks.enableAllChildren(this.targetObject);
            }
        } else {
            this.log.warn("PlacementController: reset() - WARNING: targetObject is null!");
        }
        
        if (this.project) {
            this.project.enabled = true;
        }
        
        if (this.callbacks.onReset) {
            this.callbacks.onReset();
        }
        
        if (this.callbacks.onPlacementChanged) {
            this.callbacks.onPlacementChanged(false);
        }
    }

    /**
     * Get current state
     */
    public getState(): PlacementControllerState {
        return this.state;
    }

    /**
     * Update last position/rotation from hit test
     */
    public updatePosition(position: vec3, rotation: quat): void {
        this.state.lastPosition = position;
        this.state.lastRotation = rotation;
        this.state.hasPositionedImage = true;
    }
}


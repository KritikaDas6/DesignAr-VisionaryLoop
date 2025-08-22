/**
 * SimplePlacementButton - Basic AR Object Placement with Button
 * 
 * A simple and reliable script for placing 3D objects in AR space using button interactions.
 * Places objects at a fixed distance in front of the camera when triggered.
 */

@component
export class SimplePlacementButton extends BaseScriptComponent {

    // ===== INPUT PARAMETERS =====
    @input targetObject: SceneObject;             // The object to be placed (REQUIRED)
    @input camera: Camera;                        // Reference camera (REQUIRED)
    @input placementDistance: number = 3.0;       // Distance in front of camera to place object
    @input feedbackText: Text;                    // Text component for feedback (optional)
    
    // Internal state
    private isPlaced: boolean = false;
    private shouldPlace: boolean = false;         // Flag to trigger placement

    /**
     * Initializes the component when the scene starts
     */
    onAwake() {
        // Validate required inputs
        if (!this.targetObject) {
            print("ERROR: Target Object is required!");
            return;
        }
        
        if (!this.camera) {
            print("ERROR: Camera is required!");
            return;
        }

        // Hide the target object initially
        this.targetObject.enabled = false;
        
        print("SimplePlacementButton initialized successfully");
        this.showFeedback("Ready to place object. Call placeObject() to place.", 3000);
    }

    /**
     * Public method to trigger object placement
     * Call this from external scripts or UI buttons
     */
    public placeObject() {
        if (this.isPlaced) {
            this.showFeedback("Object already placed! Use resetPlacement() to reposition.", 2000);
            return;
        }

        print("Placing object...");
        
        // Get camera position and direction
        const cameraTransform = this.camera.getTransform();
        const cameraPosition = cameraTransform.getWorldPosition();
        const cameraDirection = cameraTransform.back; // Back is forward direction
        
        // Calculate placement position
        const placementPosition = new vec3(
            cameraPosition.x + cameraDirection.x * this.placementDistance,
            cameraPosition.y + cameraDirection.y * this.placementDistance,
            cameraPosition.z + cameraDirection.z * this.placementDistance
        );
        
        print("Camera position: " + cameraPosition);
        print("Camera direction: " + cameraDirection);
        print("Placement position: " + placementPosition);

        // Position and orient the object
        this.targetObject.enabled = true;
        this.targetObject.getTransform().setWorldPosition(placementPosition);
        
        // Make object face the camera
        const lookAtRotation = quat.lookAt(cameraDirection, vec3.up());
        this.targetObject.getTransform().setWorldRotation(lookAtRotation);
        
        // Update state
        this.isPlaced = true;
        
        this.showFeedback("Object placed successfully!", 3000);
        print("Object placed successfully at: " + placementPosition);
    }

    /**
     * Public method to reset the placement
     * Call this from external scripts or UI buttons
     */
    public resetPlacement() {
        if (!this.isPlaced) {
            this.showFeedback("No object to reset!", 2000);
            return;
        }
        
        print("Resetting placement...");
        
        // Hide the target object
        this.targetObject.enabled = false;
        
        // Reset state
        this.isPlaced = false;
        
        this.showFeedback("Object reset! Call placeObject() to place again.", 3000);
        print("Placement reset successfully");
    }

    /**
     * Shows feedback text to the user
     */
    private showFeedback(message: string, duration: number = 3000) {
        if (this.feedbackText) {
            this.feedbackText.text = message;
            print("Feedback: " + message);
        }
    }

    /**
     * Public method to check if object is placed
     */
    public isObjectPlaced(): boolean {
        return this.isPlaced;
    }

    /**
     * Public method to get current placement position
     */
    public getPlacementPosition(): vec3 | null {
        if (this.isPlaced && this.targetObject) {
            return this.targetObject.getTransform().getWorldPosition();
        }
        return null;
    }
}


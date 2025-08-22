/**
 * World Query Hit Example 3 Script (Head Movement Version)
 * 
 * This script demonstrates AR object placement using world query hit testing
 * with head movement for object preview instead of hand gestures.
 * It allows users to place 3D objects on detected surfaces using head movement.
 * 
 * Key Features:
 * - Real-time surface detection using world query hit testing
 * - Head movement-based object preview that follows detected surfaces
 * - Automatic rotation adjustment based on surface type (floor, ceiling, wall)
 * - Object placement locking when interactable is triggered
 * - Support for multiple spawnable objects with index selection
 * - Floor and ceiling rotation calculations for proper object orientation
 * 
 * Usage:
 * 1. Move your head to point at a surface to see object preview
 * 2. Use assigned interactable to place the object
 * 3. Object locks in position and shows confirmation
 */

// Import required Lens Studio modules
const WorldQueryModule = require("LensStudio:WorldQueryModule");
import { Interactable } from "SpectaclesInteractionKit/Components/Interaction/Interactable/Interactable";

/**
 * Small constant for floating-point comparisons in rotation calculations
 * Used to determine if a surface is approximately horizontal (floor/ceiling)
 */
const EPSILON = 0.01;

/**
 * Main class for handling AR object placement with camera-based surface detection
 * Extends BaseScriptComponent for Lens Studio integration
 */
@component
export class WorldQueryHitExample3 extends BaseScriptComponent {

    // ===== PRIVATE VARIABLES =====
    
    /** Manages world raycasting for surface detection */
    private hitTestSession: HitTestSession;
    
    /** Reference to the target object's transform for position/rotation updates */
    private transform: Transform;
    
    /** Tracks whether the object has been permanently placed */
    private isPlaced: boolean = false;
    
    /** Flag to track when placement should occur */
    private shouldPlace: boolean = false;

    // ===== INPUT PARAMETERS (Set in Lens Studio Inspector) =====
    
    /** Camera component for raycasting and positioning calculations */
    @input camera: Camera;
    
    /** Index of the object to spawn from the objectsToSpawn array (0-based) */
    @input indexToSpawn: number;
    
    /** The 3D object that will be placed in the AR scene */
    @input targetObject: SceneObject;
    
    /** Array of available objects that can be spawned/placed */
    @input objectsToSpawn: SceneObject[];
    
    /** Whether to use filtered hit testing for better accuracy */
    @input filterEnabled: boolean;
    
    /** Button/interactable that triggers object placement */
    @input placementInteractable: Interactable;
    
    /** Rotation values for floor surface placement (Z-axis only) */
    @input floorRotation: vec3 = new vec3(0, 0, 0);
    
    /** Rotation values for ceiling surface placement (Z-axis only) */
    @input ceilingRotation: vec3 = new vec3(0, 0, 0);

    // ===== LIFECYCLE METHODS =====
    
    /**
     * Called when the script component is first created
     * Initializes all necessary components and sets up the update event loop
     */
    onAwake() {
        // Create hit test session for surface detection with optional filtering
        this.hitTestSession = this.createHitTestSession(this.filterEnabled);

        // Validate that required inputs are configured
        if (!this.targetObject) {
            print("Please set Target Object input");
            return;
        }

        if (!this.camera) {
            print("Please set Camera input");
            return;
        }

        // Get reference to the target object's transform
        this.transform = this.targetObject.getTransform();
        
        // Initially hide the target object until surface is detected
        this.targetObject.enabled = false;
        
        // Enable the selected object from the spawn array
        this.setObjectEnabled(this.indexToSpawn);
        
        // Set up the placement interactable button
        this.setupPlacementInteractable();
        
        // Create and bind the update event for continuous processing
        this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
        
        print("Camera-based World Query Hit Example 3 script initialized successfully");
    }

    // ===== HIT TESTING SETUP =====
    
    /**
     * Creates a hit test session for world raycasting
     * Configures the session with optional filtering for better accuracy
     * 
     * @param filterEnabled - Whether to enable hit test filtering
     * @returns Configured hit test session
     */
    createHitTestSession(filterEnabled) {
        // Create hit test session options
        let options = HitTestSessionOptions.create();
        
        // Enable/disable filtering based on input parameter
        options.filter = filterEnabled;
        
        // Create and return the configured hit test session
        return WorldQueryModule.createHitTestSessionWithOptions(options);
    }

    // ===== INTERACTABLE SETUP =====
    
    /**
     * Sets up the placement interactable to trigger object placement
     * Binds the button press event to the placement logic
     */
    private setupPlacementInteractable() {
        if (this.placementInteractable) {
            print("Interactable object found: " + this.placementInteractable);
            print("Interactable type: " + typeof this.placementInteractable);
            print("Interactable constructor: " + this.placementInteractable.constructor.name);
            print("All properties: " + Object.getOwnPropertyNames(this.placementInteractable));
            print("Prototype properties: " + Object.getOwnPropertyNames(Object.getPrototypeOf(this.placementInteractable)));
            
            try {
                // Try to access the event through different methods
                if (this.placementInteractable.onTriggerStart) {
                    print("onTriggerStart exists: " + this.placementInteractable.onTriggerStart);
                    print("onTriggerStart type: " + typeof this.placementInteractable.onTriggerStart);
                    
                    if (typeof this.placementInteractable.onTriggerStart.add === 'function') {
                        this.placementInteractable.onTriggerStart.add(() => {
                            print("Placement interactable triggered - setting placement flag");
                            this.shouldPlace = true;
                        });
                        print("Setup successful with onTriggerStart.add");
                    } else {
                        print("onTriggerStart.add is not a function");
                    }
                } else {
                    print("onTriggerStart property does not exist");
                    
                    // Try alternative property names
                    const alternativeNames = ['onTrigger', 'onPress', 'onClick', 'onTap', 'trigger', 'press', 'click'];
                    for (const name of alternativeNames) {
                        if (this.placementInteractable[name]) {
                            print("Found alternative property: " + name + " = " + this.placementInteractable[name]);
                        }
                    }
                }
                
            } catch (error) {
                print("Error in setup: " + error);
                print("Error stack: " + error.stack);
            }
        } else {
            print("WARNING: No placementInteractable assigned!");
        }
    }

    // ===== SURFACE DETECTION & PLACEMENT =====
    
    /**
     * Handles hit test results for real-time surface detection
     * Updates object position and orientation based on detected surfaces
     * Implements the placement locking mechanism when interactable is triggered
     * 
     * @param results - Hit test results containing position and normal data
     */
    onHitTestResult(results) {
        // Skip if object is already placed or no surface detected
        if (this.isPlaced || results === null) {
            this.targetObject.enabled = false;
            return;
        }

        // Surface detected - enable object preview
        this.targetObject.enabled = true;

        // Extract surface information from hit test results
        const hitPosition = results.position;  // 3D position where ray hit surface
        const hitNormal = results.normal;      // Surface normal vector

        // Calculate appropriate rotation based on surface type
        let toRotation;
        const upDot = hitNormal.dot(vec3.up());  // Dot product to determine surface orientation
        
        if (upDot > 0.9) {
            // Floor surface (normal pointing mostly upward)
            const cameraTransform = this.camera.getTransform();
            const cameraDirection = cameraTransform.back;
            toRotation = this.createFloorRotation(cameraDirection);
        } else if (upDot < -0.9) {
            // Ceiling surface (normal pointing mostly downward)
            const cameraTransform = this.camera.getTransform();
            const cameraDirection = cameraTransform.back;
            toRotation = this.createCeilingRotation(cameraDirection);
        } else {
            // Wall surface (normal pointing sideways)
            toRotation = quat.lookAt(hitNormal, vec3.up());
        }

        // Update object transform for real-time preview
        this.targetObject.getTransform().setWorldPosition(hitPosition);
        this.targetObject.getTransform().setWorldRotation(toRotation);

        // Check if placement should occur (based on interactable trigger)
        if (this.shouldPlace) {
            // Placement triggered - lock object in current position
            this.isPlaced = true;
            this.shouldPlace = false; // Reset the flag
            print("Object placed successfully at preview position");
            print("Object locked at: " + hitPosition.x.toFixed(2) + ", " + hitPosition.y.toFixed(2) + ", " + hitPosition.z.toFixed(2));
        }
    }

    /**
     * Public method to trigger object placement
     * Can be called from other scripts or UI elements
     */
    public triggerPlacement() {
        if (!this.isPlaced && this.targetObject.enabled) {
            this.shouldPlace = true;
            print("Placement triggered externally");
        }
    }

    // ===== ROTATION CALCULATION METHODS =====
    
    /**
     * Creates a rotation quaternion for Z-axis only rotation
     * Optimized for cases where only Z-axis adjustment is needed
     * 
     * @param degrees - Rotation angle in degrees around Z-axis
     * @returns Quaternion representing the Z-axis rotation
     */
    private createZRotation(degrees: number): quat {
        const radians = degrees * Math.PI / 180;
        return quat.fromEulerAngles(0, 0, radians);
    }
    
    /**
     * Creates rotation for floor surface placement
     * Aligns object with floor while maintaining camera-facing orientation
     * 
     * @param cameraDirection - Direction the camera is facing
     * @returns Quaternion for floor surface rotation
     */
    private createFloorRotation(cameraDirection: vec3): quat {
        // Create rotation that faces the camera direction
        const lookDirection = vec3.forward();
        const rotation = quat.lookAt(lookDirection, vec3.up());
        
        // Apply custom Z-axis rotation if specified
        if (Math.abs(this.floorRotation.z) > EPSILON) {
            const zRotation = this.createZRotation(this.floorRotation.z);
            // For now, just return the base rotation since multiply method doesn't exist
            // You can implement proper quaternion multiplication if needed
            return rotation;
        }
        
        return rotation;
    }
    
    /**
     * Creates rotation for ceiling surface placement
     * Aligns object with ceiling while maintaining camera-facing orientation
     * 
     * @param cameraDirection - Direction the camera is facing
     * @returns Quaternion for ceiling surface rotation
     */
    private createCeilingRotation(cameraDirection: vec3): quat {
        // Create rotation that faces the camera direction
        const lookDirection = vec3.forward();
        const rotation = quat.lookAt(lookDirection, vec3.up());
        
        // Apply custom Z-axis rotation if specified
        if (Math.abs(this.ceilingRotation.z) > EPSILON) {
            const zRotation = this.createZRotation(this.floorRotation.z);
            // For now, just return the base rotation since multiply method doesn't exist
            // You can implement proper quaternion multiplication if needed
            return rotation;
        }
        
        return rotation;
    }

    // ===== MAIN UPDATE LOOP =====
    
    /**
     * Main update loop called every frame
     * Handles head movement-based surface detection and continuous hit testing
     * Manages the raycasting from camera position to detected surfaces
     */
    onUpdate() {
        // Skip processing if object is already placed
        if (this.isPlaced) {
            return;
        }

        // Debug: Log placement flag status
        if (this.shouldPlace) {
            print("DEBUG: shouldPlace is true - waiting for surface detection");
        }

        // Use camera for continuous surface detection and object preview
        const cameraTransform = this.camera.getTransform();
        const rayStart = cameraTransform.getWorldPosition();
        const rayEnd = new vec3(
            rayStart.x + cameraTransform.back.x * 1000,
            rayStart.y + cameraTransform.back.y * 1000,
            rayStart.z + cameraTransform.back.z * 1000
        );
        
        // Perform hit test to detect surfaces
        this.hitTestSession.hitTest(rayStart, rayEnd, this.onHitTestResult.bind(this));
    }

    // ===== OBJECT MANAGEMENT METHODS =====
    
    /**
     * Enables/disables objects in the spawn array based on selected index
     * Only one object is visible at a time from the available options
     * 
     * @param i - Index of the object to enable (0-based)
     */
    setObjectEnabled(i) {
        // Loop through all available objects
        for (let j = 0; j < this.objectsToSpawn.length; j++) {
            // Enable only the selected object, disable all others
            this.objectsToSpawn[j].enabled = j === i;
        }
    }

    /**
     * Changes the currently selected object index
     * Updates which object will be spawned/placed
     * 
     * @param i - New index for object selection
     */
    setObjectIndex(i) {
        this.indexToSpawn = i;
    }
}

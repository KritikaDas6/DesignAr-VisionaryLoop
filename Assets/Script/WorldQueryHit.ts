const WorldQueryModule = require("LensStudio:WorldQueryModule");
import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";

const EPSILON = 0.01;

@component
export class WorldQueryHit extends BaseScriptComponent {
    private hitTestSession: HitTestSession;
    private transform: Transform;
    private isPlaced: boolean = false;
    private isClicked: boolean = false;

    @input indexToSpawn: number;
    @input targetObject: SceneObject;
    @input objectsToSpawn: SceneObject[];
    @input filterEnabled: boolean;
    @input camera: Camera;
    @input floorRotationZ: number = 0; // Only Z rotation for floor
    @input ceilingRotationZ: number = 0; // Only Z rotation for ceiling
    @input resetInteractable: Interactable;
    @input placement: SceneObject;

    // NEW: confirm placement button
    @input confirmButton: SceneObject;

    // NEW: text feedback component
    @input feedbackTextComponent: Text;

    private feedbackText: any;
    private feedbackTimeout: number = 3000; // 3 seconds
    private feedbackTimer: number = 0;

    onAwake() {
        this.hitTestSession = this.createHitTestSession(this.filterEnabled);

        if (!this.sceneObject) {
            print("Please set Target Object input");
            return;
        }

        this.transform = this.targetObject.getTransform();
        this.targetObject.enabled = false;
        this.setObjectEnabled(this.indexToSpawn);

        // Hide confirm button initially
        if (this.confirmButton) {
            this.confirmButton.enabled = false;
        }

        if (!this.placement) {
            this.placement.enabled = true;
        }

        // Setup text feedback
        this.setupTextFeedback();

        // Setup reset
        this.setupInteractableReset();

        this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
    }

    // Text Feedback Methods
    private setupTextFeedback() {
        if (this.feedbackTextComponent) {
            this.feedbackText = this.feedbackTextComponent;
        } else {
            print("Warning: No feedback text component assigned.");
        }
    }

    private showFeedback(message: string, duration: number = this.feedbackTimeout) {
        if (!this.feedbackText) return;

        this.feedbackText.text = message;
        this.feedbackTimer = duration;
        print("Feedback: " + message);
    }

    private clearFeedback() {
        if (!this.feedbackText) return;
        this.feedbackText.text = "";
        this.feedbackTimer = 0;
    }

    private placeObject() {
        if (this.isPlaced) return;

        const cameraTransform = this.camera.getTransform();
        const cameraPosition = cameraTransform.getWorldPosition();
        const cameraDirection = cameraTransform.back;

        const rayStart = cameraPosition;
        const rayEnd = new vec3(
            cameraPosition.x + cameraDirection.x * 1000,
            cameraPosition.y + cameraDirection.y * 1000,
            cameraPosition.z + cameraDirection.z * 1000
        );

        this.hitTestSession.hitTest(rayStart, rayEnd, (results) => {
            if (results) {
                const hitPosition = results.position;
                const hitNormal = results.normal;

                let toRotation;
                const upDot = hitNormal.dot(vec3.up());
                if (upDot > 0.9) {
                    // Floor: Use forward direction only, ignore camera rotation
                    toRotation = this.createFloorRotation(cameraDirection);
                } else if (upDot < -0.9) {
                    // Ceiling: Use forward direction only, ignore camera rotation
                    toRotation = this.createCeilingRotation(cameraDirection);
                } else {
                    toRotation = quat.lookAt(hitNormal, vec3.up());
                }

                this.targetObject.enabled = true;
                this.targetObject.getTransform().setWorldPosition(hitPosition);
                this.targetObject.getTransform().setWorldRotation(toRotation);
                this.isPlaced = true;

                this.showFeedback("Image placed successfully!", 3000);
            } else {
                const distance = 3.0;
                const position = new vec3(
                    cameraPosition.x + cameraDirection.x * distance,
                    cameraPosition.y + cameraDirection.y * distance,
                    cameraPosition.z + cameraDirection.z * distance
                );

                this.targetObject.enabled = true;
                this.targetObject.getTransform().setWorldPosition(position);
                this.targetObject.getTransform().setWorldRotation(quat.lookAt(cameraDirection, vec3.up()));
                this.isPlaced = true;

                this.showFeedback("Object placed in air.", 3000);
            }

            // Show confirm button once placed
            if (this.confirmButton) {
                this.confirmButton.enabled = true;
            }
        });
    }

    public manualPlace() {
        if (!this.isPlaced) {
            this.placeObject();
        }
    }

    private setupInteractableReset() {
        if (this.resetInteractable) {
            try {
                if (this.resetInteractable.onTriggerStart) {
                    this.resetInteractable.onTriggerStart.add(() => {
                        this.resetPlacement();
                    });
                }
            } catch (error) {
                print("Error setting up interactable reset: " + error);
            }
        }
    }

    public resetPlacement() {
        this.isPlaced = false;
        this.targetObject.enabled = false;
        if (this.confirmButton) {
            this.confirmButton.enabled = false;
        }
        
 
        this.isClicked = false;
        
        this.restartSurfaceDetection();
        this.placement.enabled = true;
    }

    private restartSurfaceDetection() {
        this.targetObject.enabled = true;
    }

    createHitTestSession(filterEnabled) {
        let options = HitTestSessionOptions.create();
        options.filter = filterEnabled;
        return WorldQueryModule.createHitTestSessionWithOptions(options);
    }

    onHitTestResult(results) {
        if (this.isPlaced || results === null) {
            return;
        }

        this.targetObject.enabled = true;
        const hitPosition = results.position;
        const hitNormal = results.normal;

        let toRotation;
        const upDot = hitNormal.dot(vec3.up());
        if (upDot > 0.9) {
            // Floor: Use forward direction only, ignore camera rotation
            const cameraTransform = this.camera.getTransform();
            const cameraDirection = cameraTransform.back;
            toRotation = this.createFloorRotation(cameraDirection);
        } else if (upDot < -0.9) {
            // Ceiling: Use forward direction only, ignore camera rotation
            const cameraTransform = this.camera.getTransform();
            const cameraDirection = cameraTransform.back;
            toRotation = this.createCeilingRotation(cameraDirection);
        } else {
            toRotation = quat.lookAt(hitNormal, vec3.up());
        }

        this.targetObject.getTransform().setWorldPosition(hitPosition);
        this.targetObject.getTransform().setWorldRotation(toRotation);
    }

    onUpdate() {
        if (!this.isClicked && !this.placement.enabled) {
            this.isPlaced = true;
            this.isClicked = true;
            this.placeObject();
        }

        // Handle feedback timer
        if (this.feedbackTimer > 0) {
            this.feedbackTimer -= getDeltaTime() * 1000;
            if (this.feedbackTimer <= 0) {
                this.clearFeedback();
            }
        }

        if (this.isPlaced) return;

        const cameraTransform = this.camera.getTransform();
        const cameraPosition = cameraTransform.getWorldPosition();
        const cameraDirection = cameraTransform.back;

        const rayStart = cameraPosition;
        const rayEnd = new vec3(
            cameraPosition.x + cameraDirection.x * 1000,
            cameraPosition.y + cameraDirection.y * 1000,
            cameraPosition.z + cameraDirection.z * 1000
        );

        this.hitTestSession.hitTest(rayStart, rayEnd, this.onHitTestResult.bind(this));
    }

    setObjectEnabled(i) {
        for (let j = 0; j < this.objectsToSpawn.length; j++) {
            this.objectsToSpawn[j].enabled = j === i;
        }
    }

    setObjectIndex(i) {
        this.indexToSpawn = i;
    }

    // Simplified rotation method that only uses Z rotation
    createRotationFromZ(rotationZ: number): quat {
        const zRad = rotationZ * Math.PI / 180;
        return new quat(0, 0, Math.sin(zRad / 2), Math.cos(zRad / 2));
    }

    // NEW: Create floor rotation that ignores camera rotation and only uses forward direction
    private createFloorRotation(cameraDirection: vec3): quat {
        // Project camera direction onto XZ plane to ignore pitch (up/down rotation)
        const forwardDirection = new vec3(cameraDirection.x, 0, cameraDirection.z).normalize();
        
        // Create rotation based on the forward direction only
        const forwardRotation = quat.lookAt(forwardDirection, vec3.up());
        
        // Apply the floor rotation offset (Z only)
        const floorRotationQuat = this.createRotationFromZ(this.floorRotationZ);
        
        return forwardRotation.multiply(floorRotationQuat);
    }

    // NEW: Create ceiling rotation that ignores camera rotation and only uses forward direction
    private createCeilingRotation(cameraDirection: vec3): quat {
        // Project camera direction onto XZ plane to ignore pitch (up/down rotation)
        const forwardDirection = new vec3(cameraDirection.x, 0, cameraDirection.z).normalize();
        
        // Create rotation based on the forward direction only
        const forwardRotation = quat.lookAt(forwardDirection, vec3.up());
        
        // Apply the ceiling rotation offset (Z only)
        const ceilingRotationQuat = this.createRotationFromZ(this.ceilingRotationZ);
        
        return forwardRotation.multiply(ceilingRotationQuat);
    }
}


const WorldQueryModule = require("LensStudio:WorldQueryModule");
import { Interactable } from "SpectaclesInteractionKit/Components/Interaction/Interactable/Interactable";
import Event from "SpectaclesInteractionKit/Utils/Event";

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
    @input floorRotation: vec3 = new vec3(0, 0, 0);
    @input ceilingRotation: vec3 = new vec3(0, 0, 0);
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
                    toRotation = this.createRotationFromDegrees(this.floorRotation);
                } else if (upDot < -0.9) {
                    toRotation = this.createRotationFromDegrees(this.ceilingRotation);
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
            toRotation = this.createRotationFromDegrees(this.floorRotation);
        } else if (upDot < -0.9) {
            toRotation = this.createRotationFromDegrees(this.ceilingRotation);
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

    createRotationFromDegrees(rotationDegrees: vec3): quat {
        const xRad = rotationDegrees.x * Math.PI / 180;
        const yRad = rotationDegrees.y * Math.PI / 180;
        const zRad = rotationDegrees.z * Math.PI / 180;

        const quatX = new quat(Math.sin(xRad / 2), 0, 0, Math.cos(xRad / 2));
        const quatY = new quat(0, Math.sin(yRad / 2), 0, Math.cos(yRad / 2));
        const quatZ = new quat(0, 0, Math.sin(zRad / 2), Math.cos(zRad / 2));

        return quatX.multiply(quatY).multiply(quatZ);
    }
}


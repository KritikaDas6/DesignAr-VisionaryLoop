const WorldQueryModule = require("LensStudio:WorldQueryModule");
import Event from "SpectaclesInteractionKit/Utils/Event";

const EPSILON = 0.01;

@component
export class WorldQueryHitVoiceCommand extends BaseScriptComponent {

    private hitTestSession: HitTestSession;
    private transform: Transform;
    private isPlaced: boolean = false;
    private isDiscoveryMode: boolean = true; // True when user is looking for surface
    private isProjectionMode: boolean = false; // True when object is previewing position
    private previewPosition: vec3 = null;
    private previewRotation: quat = null;
    
    // ASR functionality
    private asrModule: AsrModule = require("LensStudio:AsrModule");
    private isRecording: boolean = false;
    private isRestarting: boolean = false;
    private voiceCommandsEnabled: boolean = true;

    @input indexToSpawn: number;
    @input targetObject: SceneObject;
    @input objectsToSpawn: SceneObject[];
    @input filterEnabled: boolean;
    @input camera: Camera; // Direct camera input instead of CameraService2
    @input floorRotation: vec3 = new vec3(0, 0, 0); // Manual floor rotation in degrees
    @input ceilingRotation: vec3 = new vec3(0, 0, 0); // Manual ceiling rotation in degrees
    @input enableVoiceCommands: boolean = true; // Toggle for voice commands (only placement method)
    @input confirmButton: SceneObject; // Button to confirm placement
    @input declineButton: SceneObject; // Button to decline placement

    onAwake() {
        this.hitTestSession = this.createHitTestSession(this.filterEnabled);

        if (!this.sceneObject) {
            print("Please set Target Object input");
            return;
        }

        this.transform = this.targetObject.getTransform();
        this.targetObject.enabled = false;
        this.setObjectEnabled(this.indexToSpawn);

        // Initialize voice commands if enabled (only placement method)
        if (this.enableVoiceCommands) {
            this.initializeVoiceCommands();
            print("Voice-only placement mode enabled - use voice commands to place objects");
        }

        this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
    }

    // ASR Voice Command Methods
    private initializeVoiceCommands() {
        print("Initializing voice commands for object placement...");
        this.startContinuousListening();
    }

    private startContinuousListening() {
        if (this.isRestarting) {
            return; // Prevent multiple simultaneous restarts
        }
        
        this.isRecording = true;
        print("ASR: Starting continuous voice listening...");
        
        let asrSettings = AsrModule.AsrTranscriptionOptions.create();
        asrSettings.mode = AsrModule.AsrMode.HighAccuracy;
        asrSettings.silenceUntilTerminationMs = 1000;
        
        asrSettings.onTranscriptionUpdateEvent.add((asrOutput) => {
            print("ASR: Received transcription: " + asrOutput.text);
            if (asrOutput.isFinal) {
                // Filter for specific words only
                const detectedWord = this.filterForSpecificWords(asrOutput.text);
                if (detectedWord) {
                    print("ASR: Valid command detected: " + detectedWord);
                    this.handleVoiceCommand(detectedWord);
                } else {
                    print("ASR: No valid command found in: " + asrOutput.text);
                }
                
                // Restart listening with proper cleanup
                this.restartListening();
            }
        });
        
        asrSettings.onTranscriptionErrorEvent.add((asrOutput) => {
            print("ASR Error: " + asrOutput);
            
            // Handle specific error codes with better logging
            switch (asrOutput) {
                case 1:
                    print("ASR: Error 1 - Audio input issue, restarting...");
                    break;
                case 3:
                    print("ASR: Error 3 - Transcription service issue, restarting...");
                    break;
                default:
                    print("ASR: Unknown error " + asrOutput + ", restarting...");
                    break;
            }
            
            // Restart listening with proper cleanup
            this.restartListening();
        });
        
        this.asrModule.startTranscribing(asrSettings);
        print("ASR: Voice transcription started");
    }
    
    private restartListening() {
        if (!this.isRecording || this.isRestarting) {
            return;
        }
        
        this.isRestarting = true;
        
        // Stop current transcription before restarting
        try {
            this.asrModule.stopTranscribing();
        } catch (e) {
            print("ASR: Error stopping transcription: " + e);
        }
        
        // Reset restart flag and restart immediately
        this.isRestarting = false;
        if (this.isRecording) {
            this.startContinuousListening();
        }
    }

    private filterForSpecificWords(text: string): string | null {
        const lowerText = text.toLowerCase().trim();
        const validWords = ["place", "project", "pin", "mount", "reset", "clear", "remove"];
        
        for (const word of validWords) {
            if (lowerText.includes(word)) {
                return word;
            }
        }
        
        return null;
    }

    private handleVoiceCommand(command: string) {
        print("Handling voice command: " + command);
        
        switch (command) {
            case "place":
            case "project":
            case "pin":
            case "mount":
                print("Valid placement command detected: " + command);
                if (this.isDiscoveryMode && !this.isPlaced) {
                    this.placeObject();
                    print("Object preview started via voice command: " + command);
                } else if (this.isProjectionMode) {
                    // If in projection mode, confirm the placement
                    this.confirmPlacement();
                    print("Placement confirmed via voice command: " + command);
                } else {
                    print("Object already placed, ignoring command: " + command);
                }
                break;
            case "reset":
            case "clear":
            case "remove":
                print("Reset command detected: " + command);
                this.resetPlacement();
                print("Placement reset - ready for new placement");
                break;
            default:
                print("Unknown voice command: " + command);
                break;
        }
    }

    private placeObject() {
        if (this.isPlaced) {
            print("Object already placed, ignoring command");
            return;
        }

        // Use camera position and direction directly
        const cameraTransform = this.camera.getTransform();
        const cameraPosition = cameraTransform.getWorldPosition();
        const cameraDirection = cameraTransform.back; // Looking direction

        print("Camera position: " + cameraPosition);
        print("Camera direction: " + cameraDirection);

        // Cast a ray from camera to find wall surface
        const rayStart = cameraPosition;
        const rayEnd = new vec3(
            cameraPosition.x + cameraDirection.x * 1000,
            cameraPosition.y + cameraDirection.y * 1000,
            cameraPosition.z + cameraDirection.z * 1000
        );

        print("Ray start: " + rayStart);
        print("Ray end: " + rayEnd);

        // Use hit test to find wall surface
        this.hitTestSession.hitTest(rayStart, rayEnd, (results) => {
            if (results) {
                const hitPosition = results.position;
                const hitNormal = results.normal;

                print("Hit test successful!");
                print("Hit position: " + hitPosition);
                print("Hit normal: " + hitNormal);

                // Calculate rotation to align object to wall surface with manual rotations
                let toRotation;
                const upDot = hitNormal.dot(vec3.up());
                
                print("Up dot: " + upDot);
                
                if (upDot > 0.9) {
                    // For floors, use manual floor rotation
                    toRotation = this.createRotationFromDegrees(this.floorRotation);
                    print("Using floor rotation");
                } else if (upDot < -0.9) {
                    // For ceilings, use manual ceiling rotation
                    toRotation = this.createRotationFromDegrees(this.ceilingRotation);
                    print("Using ceiling rotation");
                } else {
                    // For walls, align object to surface normal
                    toRotation = quat.lookAt(hitNormal, vec3.up());
                    print("Using wall rotation");
                }

                // Enter projection mode instead of immediately placing
                this.enterProjectionMode(hitPosition, toRotation);
                print("Entered projection mode - use Confirm/Decline buttons or voice commands");
            } else {
                print("No hit test results - placing in front of camera");
                
                // If no wall found, place in front of camera
                const distance = 3.0;
                const position = new vec3(
                    cameraPosition.x + cameraDirection.x * distance,
                    cameraPosition.y + cameraDirection.y * distance,
                    cameraPosition.z + cameraDirection.z * distance
                );

                // Enter projection mode for front-of-camera placement
                this.enterProjectionMode(position, quat.lookAt(cameraDirection, vec3.up()));
                print("No wall found - entered projection mode in front of camera");
            }
        });
    }

    // Public method to manually trigger placement (for testing)
    public manualPlace() {
        if (!this.isPlaced) {
            this.placeObject();
            print("Object placed manually");
        } else {
            print("Object already placed");
        }
    }

    // Projection mode methods
    private enterProjectionMode(position: vec3, rotation: quat) {
        this.isProjectionMode = true;
        this.isDiscoveryMode = false;
        this.previewPosition = position;
        this.previewRotation = rotation;
        
        // Show the object at preview position
        this.targetObject.enabled = true;
        this.targetObject.getTransform().setWorldPosition(position);
        this.targetObject.getTransform().setWorldRotation(rotation);
        
        // Show confirm/decline buttons
        this.showConfirmationButtons();
        
        print("Projection mode active - object positioned at: " + position);
    }
    
    private exitProjectionMode() {
        this.isProjectionMode = false;
        this.isDiscoveryMode = true;
        this.previewPosition = null;
        this.previewRotation = null;
        
        // Hide the object
        this.targetObject.enabled = false;
        
        // Hide confirm/decline buttons
        this.hideConfirmationButtons();
        
        print("Exited projection mode - back to discovery mode");
    }
    
    private showConfirmationButtons() {
        if (this.confirmButton) {
            this.confirmButton.enabled = true;
        }
        if (this.declineButton) {
            this.declineButton.enabled = true;
        }
    }
    
    private hideConfirmationButtons() {
        if (this.confirmButton) {
            this.confirmButton.enabled = false;
        }
        if (this.declineButton) {
            this.declineButton.enabled = false;
        }
    }
    
    // Button event handlers - these are called by the button's Interactable component
    public onConfirmButtonPressed() {
        if (this.isProjectionMode) {
            this.confirmPlacement();
        }
    }
    
    public onDeclineButtonPressed() {
        if (this.isProjectionMode) {
            this.declinePlacement();
        }
    }
    
    private confirmPlacement() {
        if (this.isProjectionMode && this.previewPosition && this.previewRotation) {
            // Finalize the placement
            this.targetObject.getTransform().setWorldPosition(this.previewPosition);
            this.targetObject.getTransform().setWorldRotation(this.previewRotation);
            this.isPlaced = true;
            this.isProjectionMode = false;
            this.isDiscoveryMode = false; // Object is placed, no longer in discovery mode
            
            // Hide confirmation buttons
            this.hideConfirmationButtons();
            
            print("Placement confirmed! Object placed at: " + this.previewPosition);
            print("Final position: " + this.targetObject.getTransform().getWorldPosition());
            print("Final rotation: " + this.targetObject.getTransform().getWorldRotation());
        }
    }
    
    private declinePlacement() {
        if (this.isProjectionMode) {
            // Exit projection mode and return to discovery mode
            this.exitProjectionMode();
            print("Placement declined - back to discovery mode");
        }
    }

    // Public method to reset placement
    public resetPlacement() {
        this.isPlaced = false;
        this.isProjectionMode = false;
        this.isDiscoveryMode = true; // Reset to discovery mode
        this.previewPosition = null;
        this.previewRotation = null;
        this.targetObject.enabled = false;
        this.hideConfirmationButtons();
        print("Placement reset - back to discovery mode");
    }

    // Public method to toggle voice commands
    public toggleVoiceCommands() {
        this.voiceCommandsEnabled = !this.voiceCommandsEnabled;
        if (this.voiceCommandsEnabled) {
            this.startContinuousListening();
            print("Voice commands enabled");
        } else {
            this.stopListening();
            print("Voice commands disabled");
        }
    }

    public stopListening() {
        this.isRecording = false;
        this.isRestarting = false;
        try {
            this.asrModule.stopTranscribing();
        } catch (e) {
            print("ASR: Error stopping transcription: " + e);
        }
    }

    createHitTestSession(filterEnabled) {
        let options = HitTestSessionOptions.create();
        options.filter = filterEnabled;
        return WorldQueryModule.createHitTestSessionWithOptions(options);
    }

    onHitTestResult(results) {
        if (this.isPlaced || results === null) {
            this.targetObject.enabled = false;
            return;
        }

        this.targetObject.enabled = true;

        const hitPosition = results.position;
        const hitNormal = results.normal;

        // Calculate rotation to align object to surface with manual rotations
        let toRotation;
        const upDot = hitNormal.dot(vec3.up());
        
        if (upDot > 0.9) {
            // For floors, use manual floor rotation
            toRotation = this.createRotationFromDegrees(this.floorRotation);
        } else if (upDot < -0.9) {
            // For ceilings, use manual ceiling rotation
            toRotation = this.createRotationFromDegrees(this.ceilingRotation);
        } else {
            // For walls, align object to surface normal
            toRotation = quat.lookAt(hitNormal, vec3.up());
        }

        this.targetObject.getTransform().setWorldPosition(hitPosition);
        this.targetObject.getTransform().setWorldRotation(toRotation);

        // Voice commands only - no pinch placement
        // Removed the pinch trigger placement logic
    }

    onUpdate() {
        if (this.isPlaced || this.isProjectionMode) return;

        // Use camera position and direction for object positioning
        const cameraTransform = this.camera.getTransform();
        const cameraPosition = cameraTransform.getWorldPosition();
        const cameraDirection = cameraTransform.back; // Looking direction

        // Cast a ray from camera to find surface
        const rayStart = cameraPosition;
        const rayEnd = new vec3(
            cameraPosition.x + cameraDirection.x * 1000,
            cameraPosition.y + cameraDirection.y * 1000,
            cameraPosition.z + cameraDirection.z * 1000
        );

        // Use hit test to find surface
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

    // Helper method to create rotation from degrees
    createRotationFromDegrees(rotationDegrees: vec3): quat {
        const xRad = rotationDegrees.x * Math.PI / 180;
        const yRad = rotationDegrees.y * Math.PI / 180;
        const zRad = rotationDegrees.z * Math.PI / 180;
        
        const quatX = new quat(Math.sin(xRad/2), 0, 0, Math.cos(xRad/2));
        const quatY = new quat(0, Math.sin(yRad/2), 0, Math.cos(yRad/2));
        const quatZ = new quat(0, 0, Math.sin(zRad/2), Math.cos(zRad/2));
        
        return quatX.multiply(quatY).multiply(quatZ);
    }
}

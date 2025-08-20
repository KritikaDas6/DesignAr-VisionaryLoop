const WorldQueryModule = require("LensStudio:WorldQueryModule");
import { Interactable } from "SpectaclesInteractionKit/Components/Interaction/Interactable/Interactable";
import Event from "SpectaclesInteractionKit/Utils/Event";

const EPSILON = 0.01;

@component
export class WorldQueryHitVoiceCommand extends BaseScriptComponent {

    private hitTestSession: HitTestSession;
    private transform: Transform;
    private isPlaced: boolean = false;
    
    // ASR functionality
    private asrModule: AsrModule = require("LensStudio:AsrModule");
    private isRecording: boolean = false;
    private isRestarting: boolean = false;
    private voiceCommandsEnabled: boolean = true;

    // Text feedback components
    private feedbackText: any;
    private feedbackTimeout: number = 3000; // 3 seconds
    private feedbackTimer: number = 0;

    @input indexToSpawn: number;
    @input targetObject: SceneObject;
    @input objectsToSpawn: SceneObject[];
    @input filterEnabled: boolean;
    @input camera: Camera;
    @input floorRotation: vec3 = new vec3(0, 0, 0);
    @input ceilingRotation: vec3 = new vec3(0, 0, 0);
    @input enableVoiceCommands: boolean = true;
    @input resetInteractable: Interactable;

    // NEW: confirm placement button
    @input confirmButton: SceneObject;

    // NEW: text feedback component
    @input feedbackTextComponent: Text;

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

        // Setup text feedback
        this.setupTextFeedback();

        // Setup reset
        this.setupInteractableReset();

        if (this.enableVoiceCommands) {
            this.initializeVoiceCommands();
            print("Voice-only placement mode enabled - use voice commands to place objects");
        }

        this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
    }

    // Text Feedback Methods
    private setupTextFeedback() {
        if (this.feedbackTextComponent) {
            this.feedbackText = this.feedbackTextComponent;
        } else {
            print("Warning: No feedback text component assigned. Voice feedback will not be displayed.");
        }
    }

    private showFeedback(message: string, duration: number = this.feedbackTimeout) {
        if (!this.feedbackText) return;
        
        this.feedbackText.text = message;
        this.feedbackTimer = duration;
        print("Voice Feedback: " + message);
    }

    private clearFeedback() {
        if (!this.feedbackText) return;
        this.feedbackText.text = "";
        this.feedbackTimer = 0;
    }

    // ASR Voice Command Methods
    private initializeVoiceCommands() {
        print("Initializing voice commands for object placement...");
        this.startContinuousListening();
    }

    private startContinuousListening() {
        if (this.isRestarting) return;
        
        this.isRecording = true;
        print("ASR: Starting continuous voice listening...");
        
        let asrSettings = AsrModule.AsrTranscriptionOptions.create();
        asrSettings.mode = AsrModule.AsrMode.HighAccuracy;
        asrSettings.silenceUntilTerminationMs = 1000;
        
        asrSettings.onTranscriptionUpdateEvent.add((asrOutput) => {
            print("ASR: Received transcription: " + asrOutput.text);
            
            // Show real-time transcription feedback
            if (!asrOutput.isFinal) {
                this.showFeedback("You said: " + asrOutput.text, 1000);
            } else {
                const detectedWord = this.filterForSpecificWords(asrOutput.text);
                if (detectedWord) {
                    print("ASR: Valid command detected: " + detectedWord);
                    this.showFeedback("You said: " + asrOutput.text, 2000);
                    this.handleVoiceCommand(detectedWord);
                } else {
                    print("ASR: No valid command found in: " + asrOutput.text);
                    this.showFeedback("You said: " + asrOutput.text, 2000);
                }
                this.restartListening();
            }
        });
        
        asrSettings.onTranscriptionErrorEvent.add((asrOutput) => {
            print("ASR Error: " + asrOutput);
            this.showFeedback("Voice recognition error. Please try again.", 2000);
            this.restartListening();
        });
        
        this.asrModule.startTranscribing(asrSettings);
        print("ASR: Voice transcription started");
    }
    
    private restartListening() {
        if (!this.isRecording || this.isRestarting) return;
        this.isRestarting = true;
        try {
            this.asrModule.stopTranscribing();
        } catch (e) {
            print("ASR: Error stopping transcription: " + e);
        }
        this.isRestarting = false;
        if (this.isRecording) this.startContinuousListening();
    }

    private filterForSpecificWords(text: string): string | null {
        const lowerText = text.toLowerCase().trim();
        const validWords = [
            // Place variations and similar pronunciations
            "place", "placed", "placing", "plays", "plane", "play", "player", "playing",
            "plates", "plate", "plated", "plating", "plaza", "plaster", "plastic",
            "please", "pleased", "pleasing", "pleasure", "pleasant",
            "praise", "praised", "praising", "pray", "prayed", "praying",
            "phase", "phased", "phasing", "face", "faced", "facing",
            
            // Project variations and similar pronunciations
            "project", "projects", "projecting", "projected", "produce", "produced", "producing",
            "product", "production", "productive", "professor", "profession",
            "progress", "progressive", "promote", "promoted", "promoting",
            "protect", "protected", "protecting", "protest", "protested", "protesting",
            "process", "processed", "processing", "proceed", "proceeded", "proceeding",
            "propose", "proposed", "proposing", "provide", "provided", "providing",
            
            // Pin variations and similar pronunciations
            "pin", "pinned", "pinning", "pins", "pen", "pens", "penned", "penning",
            "pain", "pained", "paining", "pane", "paned", "paning",
            "pan", "panned", "panning", "pans", "pant", "panted", "panting",
            "penny", "pennies", "pencil", "pencils", "penguin", "penguins",
            "paint", "painted", "painting", "paintings", "painter", "painters",
            "point", "pointed", "pointing", "points", "pointer", "pointers",
            
            // Mount variations and similar pronunciations
            "mount", "mounted", "mounting", "mounts", "mound", "mounds", "mounted",
            "mountain", "mountains", "mountaineer", "mountaineering",
            "mouth", "mouthed", "mouthing", "mouths", "mouse", "mice",
            "move", "moved", "moving", "moves", "movement", "movements",
            "more", "most", "mode", "modes", "model", "models", "modeled", "modeling",
            "mold", "molded", "molding", "molds", "mole", "moles", "molar", "molars"
        ];
        for (const word of validWords) {
            if (lowerText.includes(word)) return word;
        }
        return null;
    }

    private handleVoiceCommand(command: string) {
        // Check if the command contains any of the placement keywords
        const lowerCommand = command.toLowerCase();
        const placementKeywords = ["place", "project", "pin", "mount"];
        
        const hasPlacementKeyword = placementKeywords.some(keyword => 
            lowerCommand.includes(keyword)
        );
        
        if (hasPlacementKeyword) {
            if (!this.isPlaced) {
                this.placeObject();
            } else {
                this.showFeedback("Object already placed.", 2000);
            }
        }
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
        this.restartSurfaceDetection();
    }
    
    private restartSurfaceDetection() {
        this.targetObject.enabled = true;
    }

    public toggleVoiceCommands() {
        this.voiceCommandsEnabled = !this.voiceCommandsEnabled;
        if (this.voiceCommandsEnabled) {
            this.showFeedback("Voice listening started", 2000);
            this.startContinuousListening();
        } else {
            this.showFeedback("Voice listening stopped", 2000);
            this.stopListening();
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
        // Handle feedback timer
        if (this.feedbackTimer > 0) {
            this.feedbackTimer -= getDeltaTime() * 1000; // Convert to milliseconds
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
        
        const quatX = new quat(Math.sin(xRad/2), 0, 0, Math.cos(xRad/2));
        const quatY = new quat(0, Math.sin(yRad/2), 0, Math.cos(yRad/2));
        const quatZ = new quat(0, 0, Math.sin(zRad/2), Math.cos(zRad/2));
        
        return quatX.multiply(quatY).multiply(quatZ);
    }

    // NEW: Create floor rotation that ignores camera rotation and only uses forward direction
    private createFloorRotation(cameraDirection: vec3): quat {
        // Project camera direction onto XZ plane to ignore pitch (up/down rotation)
        const forwardDirection = new vec3(cameraDirection.x, 0, cameraDirection.z).normalize();
        
        // Create rotation based on the forward direction only
        const forwardRotation = quat.lookAt(forwardDirection, vec3.up());
        
        // Apply the floor rotation offset
        const floorRotationQuat = this.createRotationFromDegrees(this.floorRotation);
        
        return forwardRotation.multiply(floorRotationQuat);
    }

    // NEW: Create ceiling rotation that ignores camera rotation and only uses forward direction
    private createCeilingRotation(cameraDirection: vec3): quat {
        // Project camera direction onto XZ plane to ignore pitch (up/down rotation)
        const forwardDirection = new vec3(cameraDirection.x, 0, cameraDirection.z).normalize();
        
        // Create rotation based on the forward direction only
        const forwardRotation = quat.lookAt(forwardDirection, vec3.up());
        
        // Apply the ceiling rotation offset
        const ceilingRotationQuat = this.createRotationFromDegrees(this.ceilingRotation);
        
        return forwardRotation.multiply(ceilingRotationQuat);
    }
}

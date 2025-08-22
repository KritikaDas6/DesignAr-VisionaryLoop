/**
 * WorldQueryHitVoiceCommand - AR Object Placement with Voice Commands
 * 
 * This script enables users to place 3D objects in AR space using voice commands
 * and world query hit testing. It combines automatic speech recognition (ASR) with
 * surface detection to provide an intuitive hands-free object placement experience.
 * 
 * Key Features:
 * - Voice-activated object placement using keywords like "place", "project", "pin", "mount"
 * - Real-time surface detection and object positioning
 * - Support for floor, wall, and ceiling placement with proper orientation
 * - Visual feedback system for voice commands
 * - Manual placement fallback options
 * - Reset functionality for repositioning objects
 */

const WorldQueryModule = require("LensStudio:WorldQueryModule");
import { Interactable } from "SpectaclesInteractionKit/Components/Interaction/Interactable/Interactable";

@component
export class WorldQueryHitVoiceCommand_OG2 extends BaseScriptComponent {

    // Core placement system components
    private hitTestSession: HitTestSession;        // Handles world raycasting for surface detection
    private transform: Transform;                  // Reference to the target object's transform
    private isPlaced: boolean = false;            // Tracks whether object has been placed
    
    // Automatic Speech Recognition (ASR) system
    private asrModule: AsrModule = require("LensStudio:AsrModule");
    private isRecording: boolean = false;         // Tracks if voice recording is active
    private isRestarting: boolean = false;        // Prevents multiple restart attempts
    private voiceCommandsEnabled: boolean = true; // Master toggle for voice functionality

    // Text feedback system for user communication
    private feedbackText: any;                    // Reference to UI text component
    private feedbackTimeout: number = 3000;       // Default feedback display duration (3 seconds)
    private feedbackTimer: number = 0;            // Countdown timer for feedback display

    // Input parameters for configuration
    @input indexToSpawn: number;                  // Which object to spawn from the array
    @input targetObject: SceneObject;             // The object to be placed in AR space
    @input objectsToSpawn: SceneObject[];         // Array of available objects to spawn
    @input filterEnabled: boolean;                // Whether to use filtered hit testing
    @input camera: Camera;                        // Reference camera for raycasting
    @input floorRotation: vec3 = new vec3(0, 0, 0);      // Rotation offset for floor placement
    @input ceilingRotation: vec3 = new vec3(0, 0, 0);    // Rotation offset for ceiling placement
    @input enableVoiceCommands: boolean = true;   // Master toggle for voice command system
    @input resetInteractable: Interactable;       // Button/object to reset placement

    // UI elements for enhanced user experience
    @input confirmButton: SceneObject;            // Button to confirm object placement
    @input feedbackTextComponent: Text;           // Text component for voice feedback display

    /**
     * Initializes the component when the scene starts
     * Sets up hit testing, voice commands, and initial object state
     */
    onAwake() {
        // Create hit test session for surface detection
        this.hitTestSession = this.createHitTestSession(this.filterEnabled);

        // Validate required inputs
        if (!this.sceneObject) {
            print("Please set Target Object input");
            return;
        }

        // Initialize object state and positioning
        this.transform = this.targetObject.getTransform();
        this.targetObject.enabled = false;  // Hide object until placed
        this.setObjectEnabled(this.indexToSpawn);  // Show selected object

        // Initially hide confirm button until object is placed
        if (this.confirmButton) {
            this.confirmButton.enabled = false;
        }

        // Setup text feedback system for voice commands
        this.setupTextFeedback();

        // Setup reset functionality
        this.setupInteractableReset();

        // Initialize voice command system if enabled
        if (this.enableVoiceCommands) {
            this.initializeVoiceCommands();
            print("Voice-only placement mode enabled - use voice commands to place objects");
        }

        // Bind update event for continuous processing
        this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
    }

    // ===== TEXT FEEDBACK SYSTEM =====
    
    /**
     * Sets up the text feedback component for displaying voice command feedback
     */
    private setupTextFeedback() {
        if (this.feedbackTextComponent) {
            this.feedbackText = this.feedbackTextComponent;
        } else {
            print("Warning: No feedback text component assigned. Voice feedback will not be displayed.");
        }
    }

    /**
     * Displays feedback text to the user for a specified duration
     * @param message - Text to display
     * @param duration - How long to show the message (in milliseconds)
     */
    private showFeedback(message: string, duration: number = this.feedbackTimeout) {
        if (!this.feedbackText) return;
        
        this.feedbackText.text = message;
        this.feedbackTimer = duration;
        print("Voice Feedback: " + message);
    }

    /**
     * Clears the feedback text and resets the timer
     */
    private clearFeedback() {
        if (!this.feedbackText) return;
        this.feedbackText.text = "";
        this.feedbackTimer = 0;
    }

    // ===== VOICE COMMAND SYSTEM =====
    
    /**
     * Initializes the automatic speech recognition system
     * Starts continuous listening for voice commands
     */
    private initializeVoiceCommands() {
        print("Initializing voice commands for object placement...");
        this.startContinuousListening();
    }

    /**
     * Starts continuous voice listening for object placement commands
     * Configures ASR settings and sets up event handlers
     */
    private startContinuousListening() {
        if (this.isRestarting) return;
        
        this.isRecording = true;
        print("ASR: Starting continuous voice listening...");
        
        // Configure ASR settings for optimal voice recognition
        let asrSettings = AsrModule.AsrTranscriptionOptions.create();
        asrSettings.mode = AsrModule.AsrMode.HighAccuracy;  // Use high accuracy mode
        asrSettings.silenceUntilTerminationMs = 1000;        // Wait 1 second of silence before processing
        
        // Handle real-time transcription updates
        asrSettings.onTranscriptionUpdateEvent.add((asrOutput) => {
            print("ASR: Received transcription: " + asrOutput.text);
            
            if (!asrOutput.isFinal) {
                // Show real-time feedback for ongoing speech
                this.showFeedback("You said: " + asrOutput.text, 1000);
            } else {
                // Process final transcription for valid commands
                const detectedWord = this.filterForSpecificWords(asrOutput.text);
                if (detectedWord) {
                    print("ASR: Valid command detected: " + detectedWord);
                    this.showFeedback("You said: " + asrOutput.text, 2000);
                    this.handleVoiceCommand(detectedWord);
                } else {
                    print("ASR: No valid command found in: " + asrOutput.text);
                    this.showFeedback("You said: " + asrOutput.text, 2000);
                }
                // Restart listening for next command
                this.restartListening();
            }
        });
        
        // Handle ASR errors gracefully
        asrSettings.onTranscriptionErrorEvent.add((asrOutput) => {
            print("ASR Error: " + asrOutput);
            this.showFeedback("Voice recognition error. Please try again.", 2000);
            this.restartListening();
        });
        
        // Start the voice recognition system
        this.asrModule.startTranscribing(asrSettings);
        print("ASR: Voice transcription started");
    }
    
    /**
     * Restarts the voice listening system after processing a command
     * Ensures continuous availability for voice commands
     */
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

    /**
     * Filters transcribed text for valid placement keywords
     * @param text - Raw transcribed text from ASR
     * @returns The detected keyword or null if no valid command found
     */
    private filterForSpecificWords(text: string): string | null {
        const lowerText = text.toLowerCase().trim();
        const validWords = [
            // Place variations and similar pronunciations
            "place",
            
            // Project variations and similar pronunciations
            "project", 
            
            // Pin variations and similar pronunciations
            "pin", 
            
            // Mount variations and similar pronunciations
            "mount", 
        ];
        for (const word of validWords) {
            if (lowerText.includes(word)) return word;
        }
        return null;
    }

    /**
     * Processes detected voice commands and triggers appropriate actions
     * @param command - The detected voice command keyword
     */
    private handleVoiceCommand(command: string) {
        // Check if the command contains any of the placement keywords
        const lowerCommand = command.toLowerCase();
        const placementKeywords = ["place", "project", "pin", "mount"];
        
        const hasPlacementKeyword = placementKeywords.some(keyword => 
            lowerCommand.includes(keyword)
        );
        
        if (hasPlacementKeyword) {
            if (!this.isPlaced) {
                this.placeObject();  // Place object if not already placed
            } else {
                this.showFeedback("Object already placed.", 2000);  // Prevent duplicate placement
            }
        }
    }

    // ===== OBJECT PLACEMENT SYSTEM =====
    
    /**
     * Places the target object in AR space using raycasting and surface detection
     * Handles different surface types (floor, wall, ceiling) with appropriate orientation
     */
    private placeObject() {
        if (this.isPlaced) return;  // Prevent duplicate placement

        // Get camera position and direction for raycasting
        const cameraTransform = this.camera.getTransform();
        const cameraPosition = cameraTransform.getWorldPosition();
        const cameraDirection = cameraTransform.back;

        // Create ray from camera for surface detection
        const rayStart = cameraPosition;
        const rayEnd = new vec3(
            cameraPosition.x + cameraDirection.x * 1000,
            cameraPosition.y + cameraDirection.y * 1000,
            cameraPosition.z + cameraDirection.z * 1000
        );

        // Perform hit test to find surface intersection
        this.hitTestSession.hitTest(rayStart, rayEnd, (results) => {
            if (results) {
                // Surface detected - place object on surface
                const hitPosition = results.position;
                const hitNormal = results.normal;

                // Determine rotation based on surface type
                let toRotation;
                const upDot = hitNormal.dot(vec3.up());
                if (upDot > 0.9) {
                    // Floor surface: Use forward direction only, ignore camera pitch
                    toRotation = this.createFloorRotation(cameraDirection);
                } else if (upDot < -0.9) {
                    // Ceiling surface: Use forward direction only, ignore camera pitch
                    toRotation = this.createCeilingRotation(cameraDirection);
                } else {
                    // Wall surface: Orient to surface normal
                    toRotation = quat.lookAt(hitNormal, vec3.up());
                }

                // Position and orient the object
                this.targetObject.enabled = true;
                this.targetObject.getTransform().setWorldPosition(hitPosition);
                this.targetObject.getTransform().setWorldRotation(toRotation);
                this.isPlaced = true;

                this.showFeedback("Image placed successfully!", 3000);

            } else {
                // No surface detected - place object in air at fixed distance
                const distance = 3.0;
                const position = new vec3(
                    cameraPosition.x + cameraDirection.x * distance,
                    cameraPosition.y + cameraDirection.y * distance,
                    cameraPosition.z + cameraDirection.z * distance
                );

                // Position object in air with camera-facing orientation
                this.targetObject.enabled = true;
                this.targetObject.getTransform().setWorldPosition(position);
                this.targetObject.getTransform().setWorldRotation(quat.lookAt(cameraDirection, vec3.up()));
                this.isPlaced = true;

                this.showFeedback("Object placed in air.", 3000);
            }

            // Show confirm button once object is placed
            if (this.confirmButton) {
                this.confirmButton.enabled = true;
            }
        });
    }

    /**
     * Public method for manual object placement (e.g., from button press)
     * Provides fallback option when voice commands are disabled
     */
    public manualPlace() {
        if (!this.isPlaced) {
            this.placeObject();
        }
    }

    // ===== RESET AND CONTROL SYSTEM =====
    
    /**
     * Sets up the reset interactable to allow repositioning objects
     * Binds reset functionality to the specified interactable component
     */
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

    /**
     * Resets the object placement state
     * Allows user to reposition the object in AR space
     */
    public resetPlacement() {
        this.isPlaced = false;
        this.targetObject.enabled = false;
        if (this.confirmButton) {
            this.confirmButton.enabled = false;
        }
        this.restartSurfaceDetection();
    }
    
    /**
     * Restarts surface detection after reset
     * Re-enables the target object for new placement
     */
    private restartSurfaceDetection() {
        this.targetObject.enabled = true;
    }

    /**
     * Toggles voice command system on/off
     * Provides user control over voice recognition functionality
     */
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

    /**
     * Stops the voice recognition system
     * Cleans up ASR resources and state
     */
    public stopListening() {
        this.isRecording = false;
        this.isRestarting = false;
        try {
            this.asrModule.stopTranscribing();
        } catch (e) {
            print("ASR: Error stopping transcription: " + e);
        }
    }

    // ===== HIT TESTING AND SURFACE DETECTION =====
    
    /**
     * Creates a hit test session for world raycasting
     * @param filterEnabled - Whether to use filtered hit testing
     * @returns Configured hit test session
     */
    createHitTestSession(filterEnabled) {
        let options = HitTestSessionOptions.create();
        options.filter = filterEnabled;
        return WorldQueryModule.createHitTestSessionWithOptions(options);
    }

    /**
     * Handles hit test results for real-time surface detection
     * Updates object position and orientation based on detected surfaces
     * @param results - Hit test results containing position and normal data
     */
    onHitTestResult(results) {
        if (this.isPlaced || results === null) {
            this.targetObject.enabled = false;
            return;
        }

        // Surface detected - update object preview
        this.targetObject.enabled = true;
        const hitPosition = results.position;
        const hitNormal = results.normal;

        // Calculate appropriate rotation based on surface type
        let toRotation;
        const upDot = hitNormal.dot(vec3.up());
        if (upDot > 0.9) {
            // Floor surface
            const cameraTransform = this.camera.getTransform();
            const cameraDirection = cameraTransform.back;
            toRotation = this.createFloorRotation(cameraDirection);
        } else if (upDot < -0.9) {
            // Ceiling surface
            const cameraTransform = this.camera.getTransform();
            const cameraDirection = cameraTransform.back;
            toRotation = this.createCeilingRotation(cameraDirection);
        } else {
            // Wall surface
            toRotation = quat.lookAt(hitNormal, vec3.up());
        }

        // Update object transform for preview
        this.targetObject.getTransform().setWorldPosition(hitPosition);
        this.targetObject.getTransform().setWorldRotation(toRotation);
    }

    // ===== MAIN UPDATE LOOP =====
    
    /**
     * Main update loop called every frame
     * Handles feedback timer, surface detection, and continuous hit testing
     */
    onUpdate() {
        // Handle feedback text timer
        if (this.feedbackTimer > 0) {
            this.feedbackTimer -= getDeltaTime() * 1000; // Convert to milliseconds
            if (this.feedbackTimer <= 0) {
                this.clearFeedback();
            }
        }

        // Skip surface detection if object is already placed
        if (this.isPlaced) return;

        // Perform continuous hit testing for real-time surface preview
        const cameraTransform = this.camera.getTransform();
        const cameraPosition = cameraTransform.getWorldPosition();
        const cameraDirection = cameraTransform.back;

        // Create ray for surface detection
        const rayStart = cameraPosition;
        const rayEnd = new vec3(
            cameraPosition.x + cameraDirection.x * 1000,
            cameraPosition.y + cameraDirection.y * 1000,
            cameraPosition.z + cameraDirection.z * 1000
        );

        // Test for surface intersection
        this.hitTestSession.hitTest(rayStart, rayEnd, this.onHitTestResult.bind(this));
    }

    // ===== UTILITY METHODS =====
    
    /**
     * Enables/disables objects in the spawn array based on index
     * @param i - Index of the object to enable
     */
    setObjectEnabled(i) {
        for (let j = 0; j < this.objectsToSpawn.length; j++) {
            this.objectsToSpawn[j].enabled = j === i;
        }
    }

    /**
     * Converts rotation degrees to quaternion rotation
     * @param rotationDegrees - Rotation in degrees (X, Y, Z)
     * @returns Quaternion representation of the rotation
     */
    createRotationFromDegrees(rotationDegrees: vec3): quat {
        const xRad = rotationDegrees.x * Math.PI / 180;
        const yRad = rotationDegrees.y * Math.PI / 180;
        const zRad = rotationDegrees.z * Math.PI / 180;
        
        const quatX = new quat(Math.sin(xRad/2), 0, 0, Math.cos(xRad/2));
        const quatY = new quat(0, Math.sin(yRad/2), 0, Math.cos(yRad/2));
        const quatZ = new quat(0, 0, Math.sin(zRad/2), Math.cos(zRad/2));
        
        return quatX.multiply(quatY).multiply(quatZ);
    }

    /**
     * Creates floor rotation that ignores camera pitch and only uses forward direction
     * Ensures objects on floors are oriented consistently regardless of camera angle
     * @param cameraDirection - Current camera direction vector
     * @returns Quaternion rotation for floor placement
     */
    private createFloorRotation(cameraDirection: vec3): quat {
        // Project camera direction onto XZ plane to ignore pitch (up/down rotation)
        const forwardDirection = new vec3(cameraDirection.x, 0, cameraDirection.z).normalize();
        
        // Create rotation based on the forward direction only
        const forwardRotation = quat.lookAt(forwardDirection, vec3.up());
        
        // Apply the floor rotation offset
        const floorRotationQuat = this.createRotationFromDegrees(this.floorRotation);
        
        return forwardRotation.multiply(floorRotationQuat);
    }

    /**
     * Creates ceiling rotation that ignores camera pitch and only uses forward direction
     * Ensures objects on ceilings are oriented consistently regardless of camera angle
     * @param cameraDirection - Current camera direction vector
     * @returns Quaternion rotation for ceiling placement
     */
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

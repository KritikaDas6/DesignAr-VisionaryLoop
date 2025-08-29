// Import required components and utilities for the ASR (Automatic Speech Recognition) controller
import { PinchButton_Modified } from "./PinchButton_Modified";
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";
import { LSTween } from "LS Tween.lspkg/LSTween";

/**
 * ASRQueryController - Manages voice input and speech-to-text functionality
 * This component handles recording user voice input, converting it to text,
 * and providing visual feedback during the recording process.
 */
@component
export class ASRQueryController extends BaseScriptComponent {
  // Input references - these are set in the Lens Studio inspector
  @input private button: PinchButton_Modified;                    // Pinch button that triggers voice recording
  @input private activityRenderMesh: RenderMeshVisual;  // Visual mesh that shows recording activity
  @input private textDisplay: Text;                      // Text component to display transcribed speech

  // Private properties for internal state management
  private activityMaterial: Material;                    // Material for visual feedback animation
  private asrModule: AsrModule = require("LensStudio:AsrModule");  // Speech recognition module
  private isRecording = false;                           // Tracks if currently recording

  // Public event that other components can listen to for voice queries
  public onQueryEvent: Event<string> = new Event<string>();

  /**
   * Called when the component is first created
   * Sets up the initial event binding for component initialization
   */
  onAwake() {
    // Create and bind an event that will trigger initialization when the component starts
    this.createEvent("OnStartEvent").bind(this.init.bind(this));
  }

  /**
   * Initialize the component and set up event listeners
   * Called after the component is fully loaded
   */
  private init() {
    // Set up visual feedback material for the activity indicator
    if (this.activityRenderMesh && this.activityRenderMesh.mainMaterial) {
      // Clone the material to avoid affecting other objects using the same material
      this.activityMaterial = this.activityRenderMesh.mainMaterial.clone();
      this.activityRenderMesh.clearMaterials();
      this.activityRenderMesh.mainMaterial = this.activityMaterial;
      // Set initial transparency (0 = fully transparent, 1 = fully opaque)
      this.activityMaterial.mainPass.in_out = 0;
    }

    // Validate that the button is properly assigned
    if (!this.button) {
      print("ASRQueryController: button not wired");
      return;
    }

    // Set up the pinch button event listener
    // Clear any existing listeners to prevent duplicates
    try { (this.button.onButtonPinched as any).removeAll?.(); } catch (_) {}
    
    // Add new listener that triggers voice recording when button is pinched
    this.button.onButtonPinched.add(() => {
      this.getVoiceQuery()
        .then((query) => this.onQueryEvent.invoke(query))  // Success: emit the transcribed text
        .catch((e) => print("ASR canceled: " + e));        // Error: log the error
    });
  }

  /**
   * Reset the session state after voice query processing
   * Call this after image generation or other processing to prepare for next recording
   */
  public resetSession() {
    // Stop any ongoing transcription
    try { this.asrModule.stopTranscribing(); } catch (_) {}
    
    // Reset recording state
    this.isRecording = false;
    
    // Turn off visual feedback animation
    this.animate(false);
    
    // Clear the "Listening..." text if it's currently displayed
    if (this.textDisplay && this.textDisplay.text === "Listening...") {
      this.textDisplay.text = "";
    }
  }

  /**
   * Start voice recording and return a promise that resolves with the transcribed text
   * This is the main method for capturing voice input
   */
  public getVoiceQuery(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Stop any existing transcription to ensure clean state
      try { this.asrModule.stopTranscribing(); } catch (_) {}

      // Prevent multiple simultaneous recordings
      if (this.isRecording) {
        this.animate(false);
        try { this.asrModule.stopTranscribing(); } catch (_) {}
        this.isRecording = false;
        reject("Already recording, cancel recording");
        return;
      }

      // Mark as recording
      this.isRecording = true;

      // Configure ASR options for high accuracy transcription
      const opts = AsrModule.AsrTranscriptionOptions.create();
      opts.mode = AsrModule.AsrMode.HighAccuracy;        // Use high accuracy mode
      opts.silenceUntilTerminationMs = 1500;             // Stop after 1.5 seconds of silence

      // Set up transcription update handler
      opts.onTranscriptionUpdateEvent.add((out) => {
        // Update text display with current transcription
        if (this.textDisplay && out.text && out.text.length > 0) {
          this.textDisplay.text = out.text;
        }
        
        // When transcription is final (complete), resolve the promise
        if (out.isFinal) {
          this.isRecording = false;
          this.animate(false);
          try { this.asrModule.stopTranscribing(); } catch (_) {}
          resolve(out.text);  // Return the final transcribed text
        }
      });

      // Set up error handler
      opts.onTranscriptionErrorEvent.add((err) => {
        this.isRecording = false;
        this.animate(false);
        try { this.asrModule.stopTranscribing(); } catch (_) {}
        reject(err);  // Reject the promise with the error
      });

      // Safety timeout to prevent infinite recording
      const guard = this.createEvent("DelayedCallbackEvent");
      guard.bind(() => {
        if (this.isRecording) {
          print("ASR timeout, forcing stop");
          this.isRecording = false;
          this.animate(false);
          try { this.asrModule.stopTranscribing(); } catch (_) {}
          reject("timeout");  // Reject if recording times out
        }
      });
      guard.reset(8.0);  // 8 second timeout

      // Start the recording process
      if (this.textDisplay) this.textDisplay.text = "Listening...";  // Show listening indicator
      this.animate(true);  // Start visual feedback animation
      this.asrModule.startTranscribing(opts);  // Begin speech recognition
    });
  }

  /**
   * Animate the visual feedback material to show recording state
   * @param on - Whether to turn the animation on (true) or off (false)
   */
  private animate(on: boolean) {
    if (!this.activityMaterial) return;  // Exit if no material to animate
    
    const duration = 200;  // Animation duration in milliseconds
    
    if (on) {
      // Animate from transparent to opaque (fade in)
      LSTween.rawTween(duration).onUpdate((d) => {
        this.activityMaterial.mainPass.in_out = d.t as number;  // d.t goes from 0 to 1
      }).start();
    } else {
      // Animate from opaque to transparent (fade out)
      LSTween.rawTween(duration).onUpdate((d) => {
        this.activityMaterial.mainPass.in_out = 1 - (d.t as number);  // Reverse the animation
      }).start();
    }
  }
}
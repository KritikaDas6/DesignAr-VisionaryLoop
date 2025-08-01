/**
 * VoiceTextFeedback
 * 
 * A reusable script that provides text feedback for voice commands.
 * Can be used with any voice recognition system by calling its public methods.
 */
@component
export class VoiceTextFeedback extends BaseScriptComponent {

    @input
    @hint("Text component to display voice feedback")
    textDisplay: Text;

    @input
    @hint("Duration to show feedback text (in seconds)")
    feedbackDuration: number = 3.0;

    @input
    @hint("Enable text feedback")
    enableTextFeedback: boolean = true;

    @input
    @hint("Show real-time transcription feedback")
    showRealTimeFeedback: boolean = true;

    @input
    @hint("Show command detection feedback")
    showCommandFeedback: boolean = true;

    @input
    @hint("Show error feedback")
    enableErrorFeedback: boolean = true;

    private feedbackTimer: number = 0;
    private isShowingFeedback: boolean = false;

    onAwake() {
        print("[VoiceTextFeedback] Script initialized");
        this.initializeTextFeedback();
        this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
    }

    // Initialize text feedback
    private initializeTextFeedback() {
        if (this.textDisplay) {
            this.textDisplay.enabled = false;
            print("[VoiceTextFeedback] Text feedback initialized");
        } else {
            print("[VoiceTextFeedback] Warning: No text component assigned");
        }
    }

    // Show text feedback
    private showTextFeedback(text: string) {
        if (!this.enableTextFeedback || !this.textDisplay) {
            return;
        }

        this.textDisplay.text = text;
        this.textDisplay.enabled = true;
        this.isShowingFeedback = true;
        this.feedbackTimer = 0;
        
        print("[VoiceTextFeedback] Text feedback shown: " + text);
    }

    // Hide text feedback
    private hideTextFeedback() {
        if (this.textDisplay) {
            this.textDisplay.enabled = false;
            this.isShowingFeedback = false;
            print("[VoiceTextFeedback] Text feedback hidden");
        }
    }

    onUpdate() {
        // Handle text feedback timer
        if (this.isShowingFeedback && this.textDisplay) {
            this.feedbackTimer += getDeltaTime();
            if (this.feedbackTimer >= this.feedbackDuration) {
                this.hideTextFeedback();
            }
        }
    }

    // Public methods for external voice recognition systems

    /**
     * Show real-time transcription feedback
     * @param transcription The transcribed text
     */
    public showTranscriptionFeedback(transcription: string) {
        if (this.showRealTimeFeedback && transcription.trim().length > 0) {
            this.showTextFeedback("Listening: " + transcription);
        }
    }

    /**
     * Show command detection feedback
     * @param command The detected command
     */
    public showCommandDetectedFeedback(command: string) {
        if (this.showCommandFeedback) {
            this.showTextFeedback("Command: " + command);
        }
    }

    /**
     * Show no command detected feedback
     * @param transcription The full transcription that didn't contain a command
     */
    public showNoCommandFeedback(transcription: string) {
        if (this.showCommandFeedback) {
            this.showTextFeedback("No valid command detected");
        }
    }

    /**
     * Show voice recognition error feedback
     * @param errorMessage Optional error message
     */
    public showErrorFeedback(errorMessage?: string) {
        if (this.enableErrorFeedback) {
            const message = errorMessage ? "Voice recognition error: " + errorMessage : "Voice recognition error";
            this.showTextFeedback(message);
        }
    }

    /**
     * Show custom feedback message
     * @param message The custom message to display
     */
    public showCustomFeedback(message: string) {
        this.showTextFeedback(message);
    }

    /**
     * Show listening status feedback
     */
    public showListeningFeedback() {
        this.showTextFeedback("Listening...");
    }

    /**
     * Show processing status feedback
     */
    public showProcessingFeedback() {
        this.showTextFeedback("Processing...");
    }

    /**
     * Show success feedback
     * @param action The action that was successful
     */
    public showSuccessFeedback(action: string) {
        this.showTextFeedback("Success: " + action);
    }

    /**
     * Manually hide the text feedback
     */
    public hideFeedback() {
        this.hideTextFeedback();
    }

    /**
     * Set the feedback duration
     * @param duration Duration in seconds
     */
    public setFeedbackDuration(duration: number) {
        this.feedbackDuration = duration;
        print("[VoiceTextFeedback] Feedback duration set to: " + duration + " seconds");
    }

    /**
     * Enable or disable text feedback
     * @param enabled Whether to enable text feedback
     */
    public setTextFeedbackEnabled(enabled: boolean) {
        this.enableTextFeedback = enabled;
        print("[VoiceTextFeedback] Text feedback " + (enabled ? "enabled" : "disabled"));
    }

    /**
     * Check if feedback is currently being shown
     * @returns True if feedback is visible
     */
    public isFeedbackVisible(): boolean {
        return this.isShowingFeedback;
    }
} 
/**
 * ImageGenController.ts
 * 
 * Updated image generation controller that integrates with GameManager.
 * Handles voice prompt recording, image generation, and state management.
 * 
 * This is a state-aware version of InteractableImageGenerator.
 */

import { GameManager } from "./GameManager";
import { GameState, ImageGenSubState } from "../Core/GameState";
import { PersistentStorageManager } from "../Storage/PersistentStorageManager";
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event";

// Import from original scripts
import { ImageGenerator } from "../Utilities/ImageGenerator";
import { ASRQueryController } from "../Interaction/ASRQueryController";
import { BaseController } from "../Utilities/Base/BaseController";

@component
export class ImageGenController extends BaseController {
    
    // ===== Model Provider =====
    @ui.separator
    @ui.label("Image Generation Settings")
    @input
    @widget(new ComboBoxWidget([
        new ComboBoxItem("OpenAI", "OpenAI"),
        new ComboBoxItem("Gemini", "Gemini")
    ]))
    private modelProvider: string = "Gemini";
    
    // ===== UI References =====
    @ui.separator
    @ui.group_start("UI References")
    @input
    @hint("Image component to display generated image")
    private displayImage: Image;
    
    @input
    @hint("Image component for projection (shares texture)")
    private projectionImage: Image;
    
    @input
    @hint("Text display for status/prompt")
    private textDisplay: Text;
    
    @input
    @hint("Spinner/loading indicator")
    private spinner: SceneObject;
    
    @input
    @hint("Mic off icon")
    private micOff: SceneObject;
    
    @input
    @hint("Mic on/active icon")
    private micOn: SceneObject;
    
    @input
    @hint("Confirm/Next button")
    private confirmButton: SceneObject;
    @ui.group_end
    
    // ===== ASR Controller =====
    @input private asrQueryController: ASRQueryController;
    
    // ===== Internals =====
    private imageGenerator: ImageGenerator | null = null;
    
    private isGenerating: boolean = false;
    private lastPrompt: string = "";
    private hasGeneratedImage: boolean = false;
    
    // ===== Events =====
    private onImageGeneratedEvent = new Event<Texture>();
    public readonly onImageGenerated = this.onImageGeneratedEvent.publicApi();
    
    private onGenerationErrorEvent = new Event<string>();
    public readonly onGenerationError = this.onGenerationErrorEvent.publicApi();
    
    onAwake() {
        super.onAwake();
        this.imageGenerator = new ImageGenerator(this.modelProvider);
    }
    
    protected initialize(): void {
        // Clone materials if needed
        this.setupSharedMaterial();
        
        // Setup ASR controller
        this.setupASRController();
        
        // Setup state change listener
        if (this.gameManager) {
            this.gameManager.onStateChange.add((event) => {
                if (event.newState === GameState.IMAGE_GEN) {
                    this.onEnterImageGenState();
                }
            });
            
            this.gameManager.onSubStateChange.add((subState) => {
                if (this.gameManager!.currentState === GameState.IMAGE_GEN) {
                    this.onSubStateChanged(subState);
                }
            });
        }
        
        // Restore saved image if available
        this.restoreSavedImage();
        
        // Initialize UI
        this.initializeUI();
        
        this.log.info("Initialized");
    }
    
    /**
     * Find Image component in children recursively
     */
    private findImageInChildren(obj: SceneObject): Image | null {
        if (!obj) return null;
        
        // Check if this object has an Image component
        const image = obj.getComponent("Component.Image") as Image;
        if (image) return image;
        
        // Check children
        for (let i = 0; i < obj.children.length; i++) {
            const childImage = this.findImageInChildren(obj.children[i]);
            if (childImage) return childImage;
        }
        
        return null;
    }
    
    /**
     * Setup shared material between display and projection images
     */
    private setupSharedMaterial() {
        if (this.displayImage && this.displayImage.mainMaterial) {
            const mat = this.displayImage.mainMaterial.clone();
            this.displayImage.clearMaterials();
            this.displayImage.mainMaterial = mat;
            
            // Find the projection Image component (could be direct or in children)
            let projectionImageComponent: Image | null = null;
            
            if (this.projectionImage) {
                // Check if projectionImage is an Image component directly
                if ((this.projectionImage as any).mainMaterial) {
                    projectionImageComponent = this.projectionImage as Image;
                } else {
                    // It's a SceneObject - find Image component in children (e.g., under ScannedImage)
                    projectionImageComponent = this.findImageInChildren(this.projectionImage as any);
                }
            }
            
            if (projectionImageComponent) {
                projectionImageComponent.clearMaterials();
                projectionImageComponent.mainMaterial = mat;
                this.log.info("Shared material with projectionImage (found in: " + projectionImageComponent.getSceneObject().name + ")");
            } else {
                this.log.warn("Could not find Image component in projectionImage for material sharing!");
            }
        }
    }
    
    /**
     * Setup the ASR controller for voice recording
     */
    private setupASRController() {
        if (!this.asrQueryController) {
            this.log.error("ASRQueryController not assigned. Please wire the ASRQueryController component in the Inspector.");
            return;
        }
        
        this.log.info("ASRQueryController found, setting up event listeners...");
        
        // Hook into ASRQueryController's transcription update event for real-time feedback
        this.asrQueryController.onTranscriptionUpdateEvent.add((transcription: string) => {
            // Only update if we're not generating and we have a text display
            if (!this.isGenerating && this.textDisplay && transcription && transcription.length > 0) {
                // Ensure text display is visible
                const textDisplayObject = this.textDisplay.getSceneObject();
                if (textDisplayObject) {
                    textDisplayObject.enabled = true;
                }
                this.textDisplay.text = transcription;
            }
        });
        
        // Hook into ASRQueryController's query event
        this.asrQueryController.onQueryEvent.add((query: string) => {
            this.log.info("Received voice query: " + query);
            if (this.isGenerating) {
                this.log.warn("Already generating, ignoring query");
                try { this.asrQueryController.resetSession(); } catch (_) {}
                return;
            }
            this.onVoiceQueryReceived(query);
        });
        
        this.log.info("ASRQueryController setup complete");
    }
    
    /**
     * Initialize UI state
     */
    private initializeUI() {
        if (this.spinner) this.spinner.enabled = false;
        if (this.micOff) this.micOff.enabled = true;
        if (this.micOn) this.micOn.enabled = false;
        if (this.confirmButton) this.confirmButton.enabled = this.hasGeneratedImage;
    }
    
    /**
     * Called when entering IMAGE_GEN state
     */
    private onEnterImageGenState() {
        this.isGenerating = false;
        
        if (this.confirmButton) {
            this.confirmButton.enabled = this.hasGeneratedImage;
        }
    }
    
    /**
     * Handle sub-state changes
     */
    private onSubStateChanged(subState: string) {
        switch (subState) {
            case ImageGenSubState.READY_TO_RECORD:
                this.showReadyToRecordUI();
                break;
            case ImageGenSubState.RECORDING:
                this.showRecordingUI();
                break;
            case ImageGenSubState.GENERATING:
                this.showGeneratingUI();
                break;
            case ImageGenSubState.PREVIEW:
                this.showPreviewUI();
                break;
        }
    }
    
    /**
     * Show ready to record UI
     */
    private showReadyToRecordUI() {
        if (this.micOff) this.micOff.enabled = true;
        if (this.micOn) this.micOn.enabled = false;
        if (this.spinner) this.spinner.enabled = false;
        
        // Show confirm if we have an image
        if (this.confirmButton) {
            this.confirmButton.enabled = this.hasGeneratedImage;
        }
        
        // Ensure text display is visible and clear it for first-time users
        if (this.textDisplay) {
            const textDisplayObject = this.textDisplay.getSceneObject();
            if (textDisplayObject) {
                textDisplayObject.enabled = true;
            }
            // Clear text display when ready to record (for first-time users)
            if (!this.hasGeneratedImage) {
                this.textDisplay.text = "";
            }
        }
    }
    
    /**
     * Show recording UI
     */
    private showRecordingUI() {
        if (this.micOff) this.micOff.enabled = false;
        if (this.micOn) this.micOn.enabled = true;
        if (this.textDisplay) {
            // Ensure text display is visible
            const textDisplayObject = this.textDisplay.getSceneObject();
            if (textDisplayObject) {
                textDisplayObject.enabled = true;
            }
            this.textDisplay.text = "Listening...";
        }
    }
    
    /**
     * Show generating UI
     */
    private showGeneratingUI() {
        if (this.micOff) this.micOff.enabled = true;
        if (this.micOn) this.micOn.enabled = false;
        if (this.spinner) this.spinner.enabled = true;
        if (this.confirmButton) this.confirmButton.enabled = false;
    }
    
    /**
     * Show preview UI - mic stays visible so user can regenerate
     */
    private showPreviewUI() {
        if (this.spinner) this.spinner.enabled = false;
        // Keep mic visible so user can regenerate
        if (this.micOff) this.micOff.enabled = true;
        if (this.micOn) this.micOn.enabled = false;
        if (this.confirmButton) this.confirmButton.enabled = this.hasGeneratedImage;
        
        // Ensure display image is visible if we have a generated image
        if (this.hasGeneratedImage && this.displayImage) {
            const displayImageObject = this.displayImage.getSceneObject();
            if (displayImageObject) {
                displayImageObject.enabled = true;
            }
        }
    }
    
    /**
     * Handle received voice query
     */
    private onVoiceQueryReceived(query: string) {
        const trimmed = (query || "").trim();
        const prompt = trimmed.length > 0 ? trimmed : this.lastPrompt;
        
        if (!prompt) {
            if (this.textDisplay) this.textDisplay.text = "Please say a prompt";
            return;
        }
        
        this.generateImage(prompt);
    }
    
    /**
     * Generate image from prompt
     */
    public generateImage(prompt: string) {
        if (this.isGenerating) return;
        
        this.isGenerating = true;
        this.lastPrompt = prompt.trim();
        
        // Notify GameManager
        if (this.gameManager) {
            this.gameManager.onGenerationStarted();
        }
        
        if (this.textDisplay) {
            this.textDisplay.text = "Generating: " + this.lastPrompt;
        }
        
        // Ensure square images by adding aspect ratio hint to prompt
        const squarePrompt = this.lastPrompt + " (square image, 1:1 aspect ratio)";
        
        this.imageGenerator!.generateImage(squarePrompt)
            .then((texture: Texture) => {
                this.onImageGenerationSuccess(texture);
            })
            .catch((error) => {
                this.onImageGenerationError(error);
            })
            .finally(() => {
                this.isGenerating = false;
            });
    }
    
    /**
     * Handle successful image generation
     */
    private onImageGenerationSuccess(texture: Texture) {
        // Apply texture to display
        if (this.displayImage?.mainMaterial?.mainPass) {
            this.displayImage.mainMaterial.mainPass.baseTex = texture;
        }
        
        // Apply texture to projection image
        let projectionImageComponent: Image | null = null;
        if (this.projectionImage) {
            if ((this.projectionImage as any).mainMaterial) {
                projectionImageComponent = this.projectionImage as Image;
            } else {
                projectionImageComponent = this.findImageInChildren(this.projectionImage as any);
            }
        }
        
        if (projectionImageComponent?.mainMaterial?.mainPass) {
            projectionImageComponent.mainMaterial.mainPass.baseTex = texture;
        }
        
        // Update state
        this.hasGeneratedImage = true;
        
        if (this.textDisplay) {
            this.textDisplay.text = this.lastPrompt;
        }
        
        // Save to local storage
        this.saveGeneratedImage(texture);
        
        // Notify GameManager - go to PREVIEW state but mic will stay visible
        // User can regenerate by using mic again, or confirm to proceed
        if (this.gameManager) {
            this.gameManager.setSubState(ImageGenSubState.PREVIEW);
        }
        
        // Fire event
        this.onImageGeneratedEvent.invoke(texture);
    }
    
    /**
     * Handle image generation error
     */
    private onImageGenerationError(error: any) {
        this.log.error("Generation error - " + error);
        
        if (this.textDisplay) {
            this.textDisplay.text = "Sorry, something went wrong. Please try again!";
        }
        
        // Go back to ready state
        if (this.gameManager) {
            this.gameManager.setSubState(ImageGenSubState.READY_TO_RECORD);
        }
        
        // Fire error event
        this.onGenerationErrorEvent.invoke(String(error));
    }
    
    /**
     * Save generated image to persistent storage with prompt
     */
    private saveGeneratedImage(texture: Texture) {
        Base64.encodeTextureAsync(
            texture,
            (encoded: string) => {
                const storage = PersistentStorageManager.getInstance();
                if (storage) {
                    storage.addImageToHistory(encoded, this.lastPrompt);
                }
            },
            () => {
                this.log.error("Failed to encode image");
            },
            CompressionQuality.LowQuality,
            EncodingType.Jpg
        );
    }
    
    /**
     * Restore saved image from storage (loads the active image from history)
     */
    private restoreSavedImage() {
        const storage = PersistentStorageManager.getInstance();
        if (!storage) return;
        
        // Load image history
        storage.loadImageHistory();
        
        // Get the active image entry
        const activeEntry = storage.getActiveImageEntry();
        if (!activeEntry) {
            // Fallback to legacy single image
            if (!storage.hasSavedImage()) return;
            
            const b64 = storage.loadImage();
            if (!b64) return;
            
            this.decodeAndApplyImage(b64, "");
            return;
        }
        
        // Load from history
        const b64 = storage.getActiveImageData();
        if (b64) {
            this.decodeAndApplyImage(b64, activeEntry.prompt);
        }
    }
    
    /**
     * Decode base64 and apply to display
     */
    private decodeAndApplyImage(b64: string, prompt: string) {
        Base64.decodeTextureAsync(
            b64,
            (texture: Texture) => {
                // Apply texture to display
                if (this.displayImage?.mainMaterial?.mainPass) {
                    this.displayImage.mainMaterial.mainPass.baseTex = texture;
                }
                
                // Apply texture to projection image
                let projectionImageComponent: Image | null = null;
                if (this.projectionImage) {
                    if ((this.projectionImage as any).mainMaterial) {
                        projectionImageComponent = this.projectionImage as Image;
                    } else {
                        projectionImageComponent = this.findImageInChildren(this.projectionImage as any);
                    }
                }
                if (projectionImageComponent?.mainMaterial?.mainPass) {
                    projectionImageComponent.mainMaterial.mainPass.baseTex = texture;
                    this.log.info("Applied restored texture to projectionImage");
                }
                
                this.hasGeneratedImage = true;
                
                if (prompt) {
                    this.lastPrompt = prompt;
                    if (this.textDisplay) {
                        this.textDisplay.text = prompt;
                    }
                }
                
                // Enable confirm button
                if (this.confirmButton) {
                    this.confirmButton.enabled = true;
                }
                
                if (this.gameManager && this.gameManager.currentState === GameState.IMAGE_GEN) {
                    this.gameManager.setSubState(ImageGenSubState.PREVIEW);
                }
            },
            () => {
                this.log.error("Failed to decode saved image");
            }
        );
    }
    
    /**
     * Load a specific image from history by ID
     */
    public loadImageFromHistory(imageId: string): boolean {
        const storage = PersistentStorageManager.getInstance();
        if (!storage) return false;
        
        // Set as active
        if (!storage.setActiveImage(imageId)) {
            return false;
        }
        
        // Get the entry for the prompt
        const entry = storage.getImageHistoryEntries().find(e => e.id === imageId);
        if (!entry) return false;
        
        // Load the image data
        const b64 = storage.getImageFromHistory(imageId);
        if (!b64) return false;
        
        // Apply to display
        this.decodeAndApplyImage(b64, entry.prompt);
        
        return true;
    }
    
    /**
     * Get all saved images from history (metadata only)
     */
    public getImageHistory(): { id: string; prompt: string; timestamp: number }[] {
        const storage = PersistentStorageManager.getInstance();
        if (!storage) return [];
        
        return storage.getImageHistoryEntries().map(entry => ({
            id: entry.id,
            prompt: entry.prompt,
            timestamp: entry.timestamp
        }));
    }
    
    /**
     * Delete an image from history
     */
    public deleteFromHistory(imageId: string): boolean {
        const storage = PersistentStorageManager.getInstance();
        if (!storage) return false;
        
        return storage.deleteImageFromHistory(imageId);
    }
    
    /**
     * Confirm image and proceed to projection
     */
    public confirmImage() {
        if (!this.hasGeneratedImage) return;
        
        if (this.gameManager) {
            this.gameManager.goToProjection();
        }
    }
    
    /**
     * Request to regenerate image
     */
    public regenerateImage() {
        if (this.gameManager) {
            this.gameManager.onRegenerateRequested();
        }
    }
    
    /**
     * Get the last used prompt
     */
    public getLastPrompt(): string {
        return this.lastPrompt;
    }
    
    /**
     * Check if there's a generated image
     */
    public hasImage(): boolean {
        return this.hasGeneratedImage;
    }
    
    /**
     * Hide the display image (called when confirming to proceed to projection)
     */
    public hideDisplayImage() {
        if (this.displayImage) {
            const sceneObj = this.displayImage.getSceneObject();
            if (sceneObj) {
                sceneObj.enabled = false;
            }
        }
    }
}


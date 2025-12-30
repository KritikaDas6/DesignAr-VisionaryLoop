/**
 * PersistentStorageManager.ts
 * 
 * Handles saving and loading session data for returning users.
 * Uses GeneralDataStore for persistent storage across sessions.
 */

import { GameState, SavedSession, DEFAULT_SESSION, ImageHistory, SavedImageEntry, DEFAULT_IMAGE_HISTORY } from "../Core/GameState";

const STORAGE_KEY = "designar_session";
const IMAGE_KEY = "confirmedImageB64";
const IMAGE_HISTORY_KEY = "designar_image_history";
const IMAGE_PREFIX = "designar_img_";

@component
export class PersistentStorageManager extends BaseScriptComponent {
    
    private store: GeneralDataStore | null = null;
    private currentSession: SavedSession = { ...DEFAULT_SESSION };
    private imageHistory: ImageHistory = { ...DEFAULT_IMAGE_HISTORY };
    
    // Singleton pattern for easy access
    private static instance: PersistentStorageManager | null = null;
    
    public static getInstance(): PersistentStorageManager | null {
        return PersistentStorageManager.instance;
    }
    
    onAwake() {
        PersistentStorageManager.instance = this;
        this.initializeStore();
        
        // Load image history immediately on awake to ensure it's available
        // This ensures previously generated images are available even after app restart
        if (this.store) {
            this.loadImageHistory();
            print("PersistentStorageManager: Image history loaded on awake - " + this.imageHistory.images.length + " images");
        }
    }
    
    /**
     * Initialize the persistent storage system
     */
    private initializeStore(): void {
        try {
            const pss = (global as any).persistentStorageSystem;
            if (pss && pss.store) {
                this.store = pss.store as GeneralDataStore;
                print("PersistentStorageManager: Store initialized successfully");
            } else {
                print("PersistentStorageManager: PersistentStorageSystem not available");
            }
        } catch (e) {
            print("PersistentStorageManager: Error initializing store - " + e);
        }
    }
    
    /**
     * Check if there's a saved session
     */
    public hasSavedSession(): boolean {
        if (!this.store) return false;
        
        try {
            return this.store.has(STORAGE_KEY);
        } catch (e) {
            print("PersistentStorageManager: Error checking saved session - " + e);
            return false;
        }
    }
    
    /**
     * Load the saved session from storage
     */
    public loadSession(): SavedSession {
        if (!this.store || !this.hasSavedSession()) {
            this.currentSession = { ...DEFAULT_SESSION };
            return this.currentSession;
        }
        
        try {
            const sessionJson = this.store.getString(STORAGE_KEY);
            const parsed = JSON.parse(sessionJson) as SavedSession;
            this.currentSession = { ...DEFAULT_SESSION, ...parsed };
            
            print("PersistentStorageManager: Session loaded - Tutorial completed: " + this.currentSession.hasCompletedTutorial);
        } catch (e) {
            print("PersistentStorageManager: Error loading session - " + e);
            this.currentSession = { ...DEFAULT_SESSION };
        }
        
        return this.currentSession;
    }
    
    /**
     * Save the current session to storage
     */
    public saveSession(session: Partial<SavedSession>): void {
        if (!this.store) {
            print("PersistentStorageManager: Cannot save - store not available");
            return;
        }
        
        try {
            // Merge with current session
            this.currentSession = {
                ...this.currentSession,
                ...session,
                lastSaveTimestamp: Date.now()
            };
            
            // Don't save the base64 image in the main session object (it's too large)
            const sessionToSave = { ...this.currentSession };
            delete sessionToSave.confirmedImageB64;
            
            const sessionJson = JSON.stringify(sessionToSave);
            this.store.putString(STORAGE_KEY, sessionJson);
            
            print("PersistentStorageManager: Session saved");
        } catch (e) {
            print("PersistentStorageManager: Error saving session - " + e);
        }
    }
    
    /**
     * Save the generated image separately (large data)
     */
    public saveImage(base64Image: string): void {
        if (!this.store) return;
        
        try {
            this.store.putString(IMAGE_KEY, base64Image);
            this.currentSession.confirmedImageB64 = base64Image;
            print("PersistentStorageManager: Image saved");
        } catch (e) {
            print("PersistentStorageManager: Error saving image - " + e);
        }
    }
    
    /**
     * Load the saved image
     */
    public loadImage(): string | null {
        if (!this.store) return null;
        
        try {
            if (this.store.has(IMAGE_KEY)) {
                const image = this.store.getString(IMAGE_KEY);
                this.currentSession.confirmedImageB64 = image;
                return image;
            }
        } catch (e) {
            print("PersistentStorageManager: Error loading image - " + e);
        }
        
        return null;
    }
    
    /**
     * Check if there's a saved image
     */
    public hasSavedImage(): boolean {
        if (!this.store) return false;
        
        try {
            return this.store.has(IMAGE_KEY);
        } catch (e) {
            return false;
        }
    }
    
    /**
     * Clear all saved data (start fresh)
     */
    public clearSession(): void {
        if (!this.store) return;
        
        try {
            if (this.store.has(STORAGE_KEY)) {
                this.store.remove(STORAGE_KEY);
            }
            if (this.store.has(IMAGE_KEY)) {
                this.store.remove(IMAGE_KEY);
            }
            this.currentSession = { ...DEFAULT_SESSION };
            print("PersistentStorageManager: Session cleared");
        } catch (e) {
            print("PersistentStorageManager: Error clearing session - " + e);
        }
    }
    
    /**
     * Get the current session (in-memory)
     */
    public getCurrentSession(): SavedSession {
        return this.currentSession;
    }
    
    /**
     * Update a specific field in the session
     */
    public updateSession<K extends keyof SavedSession>(key: K, value: SavedSession[K]): void {
        this.currentSession[key] = value;
        this.saveSession({ [key]: value });
    }
    
    /**
     * Mark tutorial as completed
     */
    public setTutorialCompleted(completed: boolean): void {
        this.saveSession({
            hasCompletedTutorial: completed
        });
    }
    
    /**
     * Check if user has completed tutorial before
     */
    public hasTutorialBeenCompleted(): boolean {
        return this.currentSession.hasCompletedTutorial;
    }
    
    // ===== IMAGE HISTORY METHODS =====
    
    /**
     * Generate a unique ID for an image
     */
    private generateImageId(): string {
        return "img_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Load image history from storage
     * This loads previously saved images that persist across app restarts
     */
    public loadImageHistory(): ImageHistory {
        if (!this.store) {
            print("PersistentStorageManager: Cannot load image history - store not available");
            this.imageHistory = { ...DEFAULT_IMAGE_HISTORY };
            return this.imageHistory;
        }
        
        try {
            if (this.store.has(IMAGE_HISTORY_KEY)) {
                const historyJson = this.store.getString(IMAGE_HISTORY_KEY);
                this.imageHistory = JSON.parse(historyJson) as ImageHistory;
                
                // Verify all image data still exists in storage
                let validImages = 0;
                for (const entry of this.imageHistory.images) {
                    if (this.store.has(entry.imageKey)) {
                        validImages++;
                    } else {
                        print("PersistentStorageManager: WARNING - Image data missing for entry: " + entry.id);
                    }
                }
                
                print("PersistentStorageManager: Loaded " + this.imageHistory.images.length + " images from history (" + validImages + " with valid data)");
                
                // If we have an active image ID, verify it exists
                if (this.imageHistory.activeImageId) {
                    const activeEntry = this.imageHistory.images.find(img => img.id === this.imageHistory.activeImageId);
                    if (activeEntry && this.store.has(activeEntry.imageKey)) {
                        print("PersistentStorageManager: Active image verified: " + this.imageHistory.activeImageId);
                    } else {
                        print("PersistentStorageManager: WARNING - Active image data missing, clearing active ID");
                        this.imageHistory.activeImageId = null;
                        if (this.imageHistory.images.length > 0) {
                            // Set first available image as active
                            const firstValid = this.imageHistory.images.find(img => this.store!.has(img.imageKey));
                            if (firstValid) {
                                this.imageHistory.activeImageId = firstValid.id;
                                print("PersistentStorageManager: Set first valid image as active: " + firstValid.id);
                            }
                        }
                    }
                }
            } else {
                print("PersistentStorageManager: No saved image history found");
                this.imageHistory = { ...DEFAULT_IMAGE_HISTORY };
            }
        } catch (e) {
            print("PersistentStorageManager: Error loading image history - " + e);
            this.imageHistory = { ...DEFAULT_IMAGE_HISTORY };
        }
        
        return this.imageHistory;
    }
    
    /**
     * Save image history metadata to storage
     * This ensures data persists across app restarts
     */
    private saveImageHistory(): void {
        if (!this.store) {
            print("PersistentStorageManager: Cannot save image history - store not available");
            return;
        }
        
        try {
            const historyJson = JSON.stringify(this.imageHistory);
            this.store.putString(IMAGE_HISTORY_KEY, historyJson);
            print("PersistentStorageManager: Image history saved (" + this.imageHistory.images.length + " images)");
            
            // Verify save was successful
            if (this.store.has(IMAGE_HISTORY_KEY)) {
                print("PersistentStorageManager: Image history save verified");
            } else {
                print("PersistentStorageManager: WARNING - Image history save verification failed!");
            }
        } catch (e) {
            print("PersistentStorageManager: Error saving image history - " + e);
        }
    }
    
    /**
     * Add a new image to history with its prompt
     */
    public addImageToHistory(base64Image: string, prompt: string): SavedImageEntry {
        const id = this.generateImageId();
        const imageKey = IMAGE_PREFIX + id;
        
        // Create entry
        const entry: SavedImageEntry = {
            id: id,
            prompt: prompt,
            timestamp: Date.now(),
            imageKey: imageKey,
            isActive: true
        };
        
        // Deactivate all other images
        this.imageHistory.images.forEach(img => {
            img.isActive = false;
        });
        
        // Add to history
        this.imageHistory.images.unshift(entry); // Add to beginning
        this.imageHistory.activeImageId = id;
        
        // Trim history if exceeded max
        while (this.imageHistory.images.length > this.imageHistory.maxImages) {
            const removed = this.imageHistory.images.pop();
            if (removed && this.store) {
                // Remove the image data from storage
                try {
                    if (this.store.has(removed.imageKey)) {
                        this.store.remove(removed.imageKey);
                    }
                } catch (e) {
                    print("PersistentStorageManager: Error removing old image - " + e);
                }
            }
        }
        
        // Save the actual image data
        if (this.store) {
            try {
                this.store.putString(imageKey, base64Image);
                print("PersistentStorageManager: Image saved with prompt: " + prompt.substring(0, 30) + "...");
            } catch (e) {
                print("PersistentStorageManager: Error saving image data - " + e);
            }
        }
        
        // Also save as current confirmed image for backward compatibility
        this.saveImage(base64Image);
        
        // Save history metadata
        this.saveImageHistory();
        
        return entry;
    }
    
    /**
     * Get an image from history by ID
     */
    public getImageFromHistory(id: string): string | null {
        if (!this.store) return null;
        
        const entry = this.imageHistory.images.find(img => img.id === id);
        if (!entry) {
            print("PersistentStorageManager: Image not found in history - " + id);
            return null;
        }
        
        try {
            if (this.store.has(entry.imageKey)) {
                return this.store.getString(entry.imageKey);
            }
        } catch (e) {
            print("PersistentStorageManager: Error loading image from history - " + e);
        }
        
        return null;
    }
    
    /**
     * Set an image from history as the active image
     */
    public setActiveImage(id: string): boolean {
        const entry = this.imageHistory.images.find(img => img.id === id);
        if (!entry) {
            print("PersistentStorageManager: Cannot set active - image not found: " + id);
            return false;
        }
        
        // Deactivate all images
        this.imageHistory.images.forEach(img => {
            img.isActive = false;
        });
        
        // Activate the selected one
        entry.isActive = true;
        this.imageHistory.activeImageId = id;
        
        // Load and set as current confirmed image
        const imageData = this.getImageFromHistory(id);
        if (imageData) {
            this.saveImage(imageData);
        }
        
        this.saveImageHistory();
        print("PersistentStorageManager: Set active image: " + id);
        return true;
    }
    
    /**
     * Get the currently active image entry
     */
    public getActiveImageEntry(): SavedImageEntry | null {
        if (!this.imageHistory.activeImageId) return null;
        return this.imageHistory.images.find(img => img.id === this.imageHistory.activeImageId) || null;
    }
    
    /**
     * Get the currently active image data
     */
    public getActiveImageData(): string | null {
        if (!this.imageHistory.activeImageId) return null;
        return this.getImageFromHistory(this.imageHistory.activeImageId);
    }
    
    /**
     * Get all image entries (metadata only)
     */
    public getImageHistoryEntries(): SavedImageEntry[] {
        return [...this.imageHistory.images];
    }
    
    /**
     * Get the number of saved images
     */
    public getImageCount(): number {
        return this.imageHistory.images.length;
    }
    
    /**
     * Check if there are any saved images in history
     */
    public hasImageHistory(): boolean {
        return this.imageHistory.images.length > 0;
    }
    
    /**
     * Delete an image from history
     */
    public deleteImageFromHistory(id: string): boolean {
        const index = this.imageHistory.images.findIndex(img => img.id === id);
        if (index === -1) {
            print("PersistentStorageManager: Cannot delete - image not found: " + id);
            return false;
        }
        
        const entry = this.imageHistory.images[index];
        
        // Remove image data from storage
        if (this.store && entry.imageKey) {
            try {
                if (this.store.has(entry.imageKey)) {
                    this.store.remove(entry.imageKey);
                }
            } catch (e) {
                print("PersistentStorageManager: Error deleting image data - " + e);
            }
        }
        
        // Remove from history array
        this.imageHistory.images.splice(index, 1);
        
        // If this was the active image, set the next one as active
        if (this.imageHistory.activeImageId === id) {
            if (this.imageHistory.images.length > 0) {
                this.setActiveImage(this.imageHistory.images[0].id);
            } else {
                this.imageHistory.activeImageId = null;
            }
        }
        
        this.saveImageHistory();
        print("PersistentStorageManager: Deleted image from history: " + id);
        return true;
    }
    
    /**
     * Clear all image history
     */
    public clearImageHistory(): void {
        // Delete all image data
        this.imageHistory.images.forEach(entry => {
            if (this.store && entry.imageKey) {
                try {
                    if (this.store.has(entry.imageKey)) {
                        this.store.remove(entry.imageKey);
                    }
                } catch (e) {
                    // Ignore errors during cleanup
                }
            }
        });
        
        // Reset history
        this.imageHistory = { ...DEFAULT_IMAGE_HISTORY };
        this.saveImageHistory();
        
        print("PersistentStorageManager: Image history cleared");
    }
    
    /**
     * Get the prompt for a specific image
     */
    public getImagePrompt(id: string): string | null {
        const entry = this.imageHistory.images.find(img => img.id === id);
        return entry ? entry.prompt : null;
    }
    
    /**
     * Set max images in history
     */
    public setMaxHistoryImages(max: number): void {
        this.imageHistory.maxImages = Math.max(1, max);
        
        // Trim if needed
        while (this.imageHistory.images.length > this.imageHistory.maxImages) {
            const removed = this.imageHistory.images.pop();
            if (removed && this.store) {
                try {
                    if (this.store.has(removed.imageKey)) {
                        this.store.remove(removed.imageKey);
                    }
                } catch (e) {
                    // Ignore
                }
            }
        }
        
        this.saveImageHistory();
    }
}


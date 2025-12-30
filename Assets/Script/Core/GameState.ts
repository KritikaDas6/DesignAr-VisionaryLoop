/**
 * GameState.ts
 * 
 * Defines all possible states for the DesignAR VisionaryLoop experience.
 * Used by GameManager to track and control the application flow.
 */

/**
 * Main application states
 */
export enum GameState {
    /** Initial welcome/intro screen */
    INTRO = "INTRO",
    
    /** Image generation and projection phase - voice prompt, AI generation, and surface placement */
    IMAGE_GEN = "IMAGE_GEN",
    
    /** Tutorial phase - how to edit the projection */
    HOW_TO_EDIT = "HOW_TO_EDIT",
    
    /** Final tracing mode */
    TRACING = "TRACING"
}

/**
 * Sub-states for Image Generation and Projection phase (combined)
 */
export enum ImageGenSubState {
    /** Ready to record voice prompt - mic button visible */
    READY_TO_RECORD = "READY_TO_RECORD",
    
    /** Currently recording voice */
    RECORDING = "RECORDING",
    
    /** Generating image - spinner visible */
    GENERATING = "GENERATING",
    
    /** Image preview - image visible, projection controls available */
    PREVIEW = "PREVIEW",
    
    /** Looking for surfaces - place button visible, raycast preview active */
    SURFACE_DETECTION = "SURFACE_DETECTION",
    
    /** Image has been placed - confirm/reposition buttons visible */
    PLACED = "PLACED"
}

/**
 * Legacy: ProjectionSubState kept for backward compatibility
 * @deprecated Use ImageGenSubState.SURFACE_DETECTION and ImageGenSubState.PLACED instead
 */
export enum ProjectionSubState {
    /** Looking for surfaces - place button visible, raycast preview active */
    SURFACE_DETECTION = "SURFACE_DETECTION",
    
    /** Image has been placed - confirm/reposition buttons visible */
    PLACED = "PLACED"
}

/**
 * State transition event data
 */
export interface StateChangeEvent {
    previousState: GameState;
    newState: GameState;
    previousSubState?: string;
    newSubState?: string;
}

/**
 * Configuration for a state's UI elements
 */
export interface StateConfig {
    /** SceneObjects to enable when entering this state */
    objectsToEnable: SceneObject[];
    
    /** SceneObjects to disable when entering this state */
    objectsToDisable: SceneObject[];
    
    /** Optional callback when entering the state */
    onEnter?: () => void;
    
    /** Optional callback when exiting the state */
    onExit?: () => void;
}

/**
 * Saved session data for persistent storage
 * Only stores image history and tutorial completion status
 */
export interface SavedSession {
    /** Base64 encoded generated image (legacy, for backward compatibility) */
    confirmedImageB64?: string;
    
    /** Timestamp of last save */
    lastSaveTimestamp: number;
    
    /** Whether user has completed the tutorial at least once */
    hasCompletedTutorial: boolean;
}

/**
 * Default session values for new users
 */
export const DEFAULT_SESSION: SavedSession = {
    confirmedImageB64: undefined,
    lastSaveTimestamp: 0,
    hasCompletedTutorial: false
};

/**
 * Saved image with prompt for image history
 */
export interface SavedImageEntry {
    /** Unique ID for this image */
    id: string;
    
    /** The prompt used to generate this image */
    prompt: string;
    
    /** Timestamp when image was generated */
    timestamp: number;
    
    /** Base64 encoded image data (stored separately) */
    imageKey: string;
    
    /** Whether this is the currently selected/active image */
    isActive: boolean;
}

/**
 * Image history container
 */
export interface ImageHistory {
    /** Array of saved image entries (metadata only, not the actual images) */
    images: SavedImageEntry[];
    
    /** Maximum number of images to keep in history */
    maxImages: number;
    
    /** ID of the currently active image */
    activeImageId: string | null;
}

/**
 * Default image history
 */
export const DEFAULT_IMAGE_HISTORY: ImageHistory = {
    images: [],
    maxImages: 10,
    activeImageId: null
};


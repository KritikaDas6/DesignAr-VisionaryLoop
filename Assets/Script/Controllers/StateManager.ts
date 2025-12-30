/**
 * StateManager.ts
 * 
 * Handles state transitions and sub-state management for GameManager.
 * Extracted from GameManager to separate concerns.
 */

import { GameState, ImageGenSubState, StateChangeEvent } from "../Core/GameState";
import { Logger, LoggerInstance } from "../Utilities/Logging/Logger";

export interface StateManagerCallbacks {
    onStateExit?: (state: GameState) => void;
    onStateEnter?: (state: GameState) => void;
    onSubStateChange?: (subState: string) => void;
}

export class StateManager {
    private log: LoggerInstance;
    private currentState: GameState = GameState.INTRO;
    private currentSubState: string = "";
    private isInitialized: boolean = false;
    private callbacks: StateManagerCallbacks;

    constructor(callbacks: StateManagerCallbacks) {
        this.log = Logger.create("StateManager");
        this.callbacks = callbacks;
    }

    /**
     * Get current state
     */
    public getCurrentState(): GameState {
        return this.currentState;
    }

    /**
     * Get current sub-state
     */
    public getCurrentSubState(): string {
        return this.currentSubState;
    }

    /**
     * Set the current state
     */
    public setState(newState: GameState, onStateChange: (event: StateChangeEvent) => void): void {
        const previousState = this.currentState;
        
        // Allow state change on first initialization even if state is the same
        if (previousState === newState && this.isInitialized) {
            this.log.debug("Already in state " + newState);
            return;
        }
        
        this.log.info("Transitioning from " + previousState + " to " + newState);
        
        // Exit current state
        if (this.callbacks.onStateExit) {
            this.callbacks.onStateExit(previousState);
        }
        
        // Update state
        this.currentState = newState;
        this.currentSubState = "";
        
        // Enter new state
        if (this.callbacks.onStateEnter) {
            this.callbacks.onStateEnter(newState);
        }
        
        // Mark as initialized after first state set
        this.isInitialized = true;
        
        // Fire event
        onStateChange({
            previousState,
            newState,
            previousSubState: undefined,
            newSubState: undefined
        });
    }

    /**
     * Set sub-state within current state
     */
    public setSubState(subState: string, onSubStateChange: (subState: string) => void): void {
        const previousSubState = this.currentSubState;
        this.currentSubState = subState;
        
        this.log.debug("setSubState() called - changing from '" + previousSubState + "' to '" + subState + "'");
        
        // Handle sub-state specific UI
        if (this.callbacks.onSubStateChange) {
            this.callbacks.onSubStateChange(subState);
        }
        
        this.log.debug("Invoking onSubStateChange event with: " + subState);
        onSubStateChange(subState);
    }

    /**
     * Check if state manager is initialized
     */
    public isStateInitialized(): boolean {
        return this.isInitialized;
    }
}


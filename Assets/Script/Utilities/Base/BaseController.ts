/**
 * BaseController.ts
 * 
 * Base class for all controllers to reduce boilerplate code.
 * Provides common functionality like GameManager access and error handling.
 */

import { GameManager } from "../../Controllers/GameManager";
import { Logger, LoggerInstance } from "../Logging/Logger";

export abstract class BaseController extends BaseScriptComponent {
    protected gameManager: GameManager | null = null;
    protected log: LoggerInstance;

    onAwake(): void {
        // Create logger with class name as context
        this.log = Logger.create(this.constructor.name);
        this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
    }

    /**
     * Called when the component starts
     */
    protected onStart(): void {
        this.gameManager = GameManager.getInstance();
        
        if (!this.gameManager) {
            this.log.warn("GameManager not found - some features may not work");
        }

        this.initialize();
    }

    /**
     * Override this method to initialize your controller
     */
    protected abstract initialize(): void;

    /**
     * Safely execute a function with error handling
     */
    protected safeExecute<T>(fn: () => T, defaultValue: T, errorMessage?: string): T {
        try {
            return fn();
        } catch (error) {
            const message = errorMessage || `Error in ${this.constructor.name}`;
            this.log.error(`${message}: ${error}`);
            return defaultValue;
        }
    }

    /**
     * Safely execute an async function with error handling
     */
    protected async safeExecuteAsync<T>(
        fn: () => Promise<T>,
        defaultValue: T,
        errorMessage?: string
    ): Promise<T> {
        try {
            return await fn();
        } catch (error) {
            const message = errorMessage || `Error in ${this.constructor.name}`;
            this.log.error(`${message}: ${error}`);
            return defaultValue;
        }
    }

    /**
     * Check if GameManager is available
     */
    protected hasGameManager(): boolean {
        return this.gameManager !== null;
    }

    /**
     * Get GameManager or throw error
     */
    protected requireGameManager(): GameManager {
        if (!this.gameManager) {
            throw new Error("GameManager is not available");
        }
        return this.gameManager;
    }
}


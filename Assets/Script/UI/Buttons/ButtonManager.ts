/**
 * ButtonManager.ts
 * 
 * Utility class for setting up buttons consistently.
 * Eliminates repetitive button setup code across controllers.
 */

import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { Logger } from "../../Utilities/Logging/Logger";

export interface ButtonSetupOptions {
    onStart?: () => void;
    onEnd?: () => void;
    onHoverEnter?: () => void;
    onHoverExit?: () => void;
    enabled?: boolean;
}

export interface ToggleButtonOptions extends ButtonSetupOptions {
    getState: () => boolean;
    setState: (state: boolean) => void;
    onToggle?: (newState: boolean) => void;
}

export class ButtonManager {
    private static log = Logger.create("ButtonManager");

    /**
     * Setup a simple button with trigger handler
     */
    static setupButton(
        interactable: Interactable | null | undefined,
        onTrigger: () => void,
        options?: ButtonSetupOptions
    ): boolean {
        if (!interactable) {
            this.log.warn("Cannot setup button: interactable is null or undefined");
            return false;
        }

        if (!interactable.onTriggerEnd) {
            this.log.warn("Cannot setup button: interactable.onTriggerEnd is undefined");
            return false;
        }

        try {
            // Setup trigger end (main action)
            interactable.onTriggerEnd.add(onTrigger);

            // Setup optional trigger start
            if (options?.onStart && interactable.onTriggerStart) {
                interactable.onTriggerStart.add(options.onStart);
            }

            // Setup optional trigger end callback
            if (options?.onEnd) {
                interactable.onTriggerEnd.add(options.onEnd);
            }

            // Setup optional hover events
            if (options?.onHoverEnter && interactable.onHoverEnter) {
                interactable.onHoverEnter.add(options.onHoverEnter);
            }

            if (options?.onHoverExit && interactable.onHoverExit) {
                interactable.onHoverExit.add(options.onHoverExit);
            }

            // Set initial enabled state
            if (options?.enabled !== undefined) {
                interactable.enabled = options.enabled;
            }

            return true;
        } catch (error) {
            this.log.error(`Error setting up button: ${error}`);
            return false;
        }
    }

    /**
     * Setup a toggle button that switches between two states
     */
    static setupToggleButton(
        interactable: Interactable | null | undefined,
        options: ToggleButtonOptions
    ): boolean {
        return this.setupButton(interactable, () => {
            const currentState = options.getState();
            const newState = !currentState;
            options.setState(newState);
            options.onToggle?.(newState);
        }, {
            onStart: options.onStart,
            onEnd: options.onEnd,
            onHoverEnter: options.onHoverEnter,
            onHoverExit: options.onHoverExit,
            enabled: options.enabled
        });
    }

    /**
     * Setup a button that calls a method on a target object
     */
    static setupMethodButton(
        interactable: Interactable | null | undefined,
        target: any,
        methodName: string,
        options?: ButtonSetupOptions
    ): boolean {
        if (!target || typeof target[methodName] !== 'function') {
            this.log.warn(`Cannot setup method button: ${methodName} is not a function on target`);
            return false;
        }

        return this.setupButton(interactable, () => {
            target[methodName]();
        }, options);
    }

    /**
     * Remove all event listeners from a button (cleanup)
     */
    static cleanupButton(interactable: Interactable | null | undefined): void {
        if (!interactable) return;

        try {
            if (interactable.onTriggerEnd && (interactable.onTriggerEnd as any).removeAll) {
                (interactable.onTriggerEnd as any).removeAll();
            }
            if (interactable.onTriggerStart && (interactable.onTriggerStart as any).removeAll) {
                (interactable.onTriggerStart as any).removeAll();
            }
            if (interactable.onHoverEnter && (interactable.onHoverEnter as any).removeAll) {
                (interactable.onHoverEnter as any).removeAll();
            }
            if (interactable.onHoverExit && (interactable.onHoverExit as any).removeAll) {
                (interactable.onHoverExit as any).removeAll();
            }
        } catch (error) {
            this.log.error(`Error cleaning up button: ${error}`);
        }
    }
}


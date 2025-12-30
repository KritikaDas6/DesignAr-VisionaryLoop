/**
 * SliderManager.ts
 * 
 * Utility class for managing sliders consistently.
 * Provides common slider setup patterns.
 */

import { Slider } from "SpectaclesInteractionKit.lspkg/Components/UI/Slider/Slider";
import { Logger, LoggerInstance } from "../Logging/Logger";
import { isValidSlider } from "../TypeGuards";

export interface SliderSetupOptions {
    initialValue?: number;
    onValueChanged?: (value: number) => void;
    minValue?: number;
    maxValue?: number;
    retryOnFailure?: boolean;
    retryDelay?: number;
    createEvent?: (eventName: "DelayedCallbackEvent") => any; // For retry mechanism
}

export class SliderManager {
    private static log = Logger.create("SliderManager");

    /**
     * Setup a slider with value change handler
     * Supports retry mechanism for components that need time to initialize
     */
    static setupSlider(
        slider: Slider | null | undefined,
        onValueChanged: (value: number) => void,
        options?: SliderSetupOptions
    ): boolean {
        if (!isValidSlider(slider)) {
            this.log.warn("Cannot setup slider: slider is invalid");
            return false;
        }

        try {
            // Set initial value if provided
            if (options?.initialValue !== undefined) {
                slider.currentValue = options.initialValue;
            }

            // Setup value change handler
            if (slider.onValueUpdate) {
                slider.onValueUpdate.add(onValueChanged);
                return true;
            } else {
                // Component may need more time to initialize
                this.log.warn("slider.onValueUpdate is undefined - component may need more time to initialize");
                
                // Retry if requested
                if (options?.retryOnFailure && options?.createEvent) {
                    const retryDelay = options.retryDelay ?? 0.1;
                    const retryEvent = options.createEvent("DelayedCallbackEvent");
                    retryEvent.bind(() => {
                        if (slider && slider.onValueUpdate) {
                            slider.onValueUpdate.add(onValueChanged);
                            this.log.info("Successfully subscribed to slider.onValueUpdate on retry");
                        } else {
                            this.log.error("slider.onValueUpdate still undefined after retry");
                        }
                    });
                    retryEvent.reset(retryDelay);
                    return true; // Return true even though we're retrying
                }
                
                return false;
            }
        } catch (error) {
            this.log.error(`Error setting up slider: ${error}`);
            return false;
        }
    }

    /**
     * Setup a slider with smooth interpolation
     * Returns both the setup success and an update function for your update loop
     */
    static setupSmoothSlider(
        slider: Slider | null | undefined,
        target: { current: number; target: number },
        setter: (value: number) => void,
        lerpSpeed: number = 5.0,
        onValueChanged?: (value: number) => void
    ): { success: boolean; update: () => void } {
        if (!isValidSlider(slider)) {
            return { success: false, update: () => {} };
        }

        // Initialize values
        target.target = slider.currentValue ?? target.target;
        target.current = target.target;
        setter(target.current);

        // Setup value change handler
        const success = this.setupSlider(slider, (value: number) => {
            target.target = value;
            onValueChanged?.(value);
        });

        // Create update function
        const update = this.createSmoothInterpolation(target, setter, lerpSpeed);

        return { success, update };
    }

    /**
     * Setup smooth interpolation for a slider (call this from your component's onStart)
     * Returns a function to call in your update loop
     */
    static createSmoothInterpolation(
        target: { current: number; target: number },
        setter: (value: number) => void,
        lerpSpeed: number = 5.0
    ): () => void {
        return () => {
            if (Math.abs(target.current - target.target) > 0.001) {
                target.current += (target.target - target.current) * 
                    Math.min(lerpSpeed * getDeltaTime(), 1.0);
                setter(target.current);
            }
        };
    }
}


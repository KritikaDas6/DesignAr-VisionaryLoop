/**
 * TypeGuards.ts
 * 
 * Type guard utilities for safe type checking.
 * Prevents runtime errors from null/undefined checks.
 */

import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { GameManager } from "../Controllers/GameManager";
import { Slider } from "SpectaclesInteractionKit.lspkg/Components/UI/Slider/Slider";

/**
 * Check if an object is a valid Interactable
 */
export function isValidInteractable(obj: any): obj is Interactable {
    return obj !== null && 
           obj !== undefined && 
           typeof obj.onTriggerEnd?.add === 'function';
}

/**
 * Check if an object is a valid GameManager
 */
export function isValidGameManager(obj: any): obj is GameManager {
    return obj !== null && 
           obj !== undefined && 
           typeof obj.setState === 'function' &&
           typeof obj.currentState !== 'undefined';
}

/**
 * Check if an object is a valid Slider
 */
export function isValidSlider(obj: any): obj is Slider {
    return obj !== null && 
           obj !== undefined && 
           typeof obj.currentValue !== 'undefined' &&
           typeof obj.onValueUpdate?.add === 'function';
}

/**
 * Check if an object is a valid SceneObject
 */
export function isValidSceneObject(obj: any): obj is SceneObject {
    return obj !== null && 
           obj !== undefined && 
           typeof obj.name === 'string' &&
           typeof obj.enabled !== 'undefined' &&
           Array.isArray(obj.children);
}

/**
 * Check if an object is a valid Material
 */
export function isValidMaterial(obj: any): obj is Material {
    return obj !== null && 
           obj !== undefined && 
           typeof obj.mainPass !== 'undefined';
}

/**
 * Check if an object is a valid Texture
 */
export function isValidTexture(obj: any): obj is Texture {
    return obj !== null && 
           obj !== undefined && 
           typeof obj.name === 'string';
}

/**
 * Safe null check with default value
 */
export function safeGet<T>(value: T | null | undefined, defaultValue: T): T {
    return value !== null && value !== undefined ? value : defaultValue;
}

/**
 * Safe array access
 */
export function safeArrayGet<T>(array: T[] | null | undefined, index: number, defaultValue: T): T {
    if (!array || index < 0 || index >= array.length) {
        return defaultValue;
    }
    return array[index];
}


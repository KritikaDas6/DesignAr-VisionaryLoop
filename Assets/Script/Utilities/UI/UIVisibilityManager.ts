/**
 * UIVisibilityManager.ts
 * 
 * Centralized UI visibility management to replace scattered enableAllChildren implementations.
 * Provides consistent object name matching and visibility control.
 */

import { ObjectNames, matchesObjectName, isButtonType, isGuideType } from "../../Core/Constants/ObjectNames";
import { Logger, LoggerInstance } from "../Logging/Logger";
import { GameState, ImageGenSubState } from "../../Core/GameState";
import { GameManager } from "../../Controllers/GameManager";

export interface VisibilityRule {
    objectNames: string[];
    states?: GameState[];
    substates?: ImageGenSubState[];
    enabled?: boolean;
}

export class UIVisibilityManager {
    private static log = Logger.create("UIVisibilityManager");

    /**
     * Enable all children of an object, excluding specific types
     */
    static enableChildren(
        obj: SceneObject | null | undefined,
        excludeTypes: string[] = [],
        gameManager?: GameManager | null
    ): void {
        if (!obj) {
            this.log.warn("Cannot enable children: object is null");
            return;
        }

        const currentState = gameManager?.currentState;
        const currentSubState = gameManager?.currentSubState;

        for (let i = 0; i < obj.children.length; i++) {
            const child = obj.children[i];
            const childName = child.name;
            const childNameLower = childName.toLowerCase();

            // Check if this child should be excluded
            let shouldExclude = false;

            // Check against exclude types
            for (const excludeType of excludeTypes) {
                if (isButtonType(childName, excludeType as any) || 
                    isGuideType(childName, excludeType as any) ||
                    childNameLower.includes(excludeType.toLowerCase())) {
                    shouldExclude = true;
                    break;
                }
            }

            // Always exclude confirm/reset buttons (managed by WorldQueryHit_Modified)
            if (isButtonType(childName, 'CONFIRM') || isButtonType(childName, 'RESET')) {
                child.enabled = false;
                this.disableAllChildren(child);
                continue;
            }

            // Always exclude place button (managed by GameManager)
            if (isButtonType(childName, 'PLACE')) {
                child.enabled = false;
                this.disableAllChildren(child);
                continue;
            }

            // Exclude projection guide unless in projection state
            if (isGuideType(childName, 'PROJECTION')) {
                const isInProjectionState = currentState === GameState.IMAGE_GEN &&
                    (currentSubState === ImageGenSubState.SURFACE_DETECTION ||
                     currentSubState === ImageGenSubState.PLACED);
                if (!isInProjectionState) {
                    child.enabled = false;
                    this.disableAllChildren(child);
                    continue;
                }
            }

            // Exclude HowToEdit state unless in HOW_TO_EDIT state
            if (isGuideType(childName, 'HOW_TO_EDIT')) {
                if (currentState !== GameState.HOW_TO_EDIT) {
                    child.enabled = false;
                    this.disableAllChildren(child);
                    continue;
                }
            }

            // Exclude imageGenGuide unless in READY_TO_RECORD or PREVIEW
            if (isGuideType(childName, 'IMAGE_GEN')) {
                const shouldShow = currentSubState === ImageGenSubState.READY_TO_RECORD ||
                                  currentSubState === ImageGenSubState.PREVIEW;
                child.enabled = shouldShow;
                if (!shouldShow) {
                    this.disableAllChildren(child);
                    continue;
                }
            }

            // Apply exclusion rules
            if (shouldExclude) {
                child.enabled = false;
                this.disableAllChildren(child);
                continue;
            }

            // Enable child and recurse
            child.enabled = true;
            this.enableChildren(child, excludeTypes, gameManager);
        }
    }

    /**
     * Disable all children recursively
     */
    static disableAllChildren(obj: SceneObject | null | undefined): void {
        if (!obj) return;

        obj.enabled = false;
        for (let i = 0; i < obj.children.length; i++) {
            this.disableAllChildren(obj.children[i]);
        }
    }

    /**
     * Find an object by name in the hierarchy
     */
    static findObjectByName(
        root: SceneObject | null | undefined,
        name: string | string[],
        recursive: boolean = true
    ): SceneObject | null {
        if (!root) return null;

        const names = Array.isArray(name) ? name : [name];
        
        // Check current object
        for (const n of names) {
            if (matchesObjectName(root.name, [n])) {
                return root;
            }
        }

        // Check children
        if (recursive) {
            for (let i = 0; i < root.children.length; i++) {
                const found = this.findObjectByName(root.children[i], names, true);
                if (found) return found;
            }
        }

        return null;
    }

    /**
     * Set visibility of objects based on state
     */
    static setVisibilityByState(
        objects: SceneObject[],
        state: GameState,
        substate?: ImageGenSubState
    ): void {
        // This can be extended with state-based visibility rules
        // For now, it's a placeholder for future implementation
    }
}


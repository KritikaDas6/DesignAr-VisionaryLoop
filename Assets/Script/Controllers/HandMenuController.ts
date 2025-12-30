/**
 * HandMenuController.ts
 * 
 * Controls the hand menu UI that provides quick access to:
 * - Home button (go to intro)
 * - Lock toggle (lock/unlock the projected image)
 * - Opacity slider (adjust image opacity)
 * - Saturation slider (adjust image saturation)
 * 
 * Note: Tutorial replay has been removed.
 */

import { Interactable } from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable";
import { Slider } from "SpectaclesInteractionKit.lspkg/Components/UI/Slider/Slider";
import { ContainerFrame } from "../Interaction/ContainerFrameLocker";
import { GameManager } from "./GameManager";
import { GameState, StateChangeEvent, ImageGenSubState } from "../Core/GameState";
import { ButtonFeedback_Modified } from "../UI/Buttons/ButtonFeedBack_Modified";
import { BaseController } from "../Utilities/Base/BaseController";
import { ButtonManager } from "../UI/Buttons/ButtonManager";
import { SliderManager } from "../Utilities/UI/SliderManager";

@component
export class HandMenuController extends BaseController {
    
    // ===== Button Interactables =====
    @ui.group_start("Buttons")
    @input
    @hint("Home button interactable")
    homeButtonInteractable: Interactable;
    
    @input
    @hint("Lock button interactable")
    lockButtonInteractable: Interactable;
    
    @input
    @hint("Edit button interactable (for pinch detection)")
    @allowUndefined
    editButtonInteractable: Interactable;
    @ui.group_end
    
    // ===== Lock Button Visuals =====
    @ui.group_start("Lock Button Visuals")
    @input
    @hint("Material on the lock icon to swap textures")
    lockIconMaterial: Material;
    
    @input
    @hint("Lock texture (shown when unlocked)")
    lockTexture: Texture;
    
    @input
    @hint("Unlock texture (shown when locked)")
    unlockTexture: Texture;
    
    @input
    @hint("Lock button render mesh visual (for material reset)")
    @allowUndefined
    lockButtonRenderMeshVisual: RenderMeshVisual;
    
    @input
    @hint("Lock button idle material (green - for reset)")
    @allowUndefined
    lockButtonIdleMaterial: Material;
    @ui.group_end
    
    // ===== Edit Button Visuals =====
    @ui.group_start("Edit Button Visuals")
    @input
    @hint("Edit button render mesh visual (for material reset)")
    @allowUndefined
    editButtonRenderMeshVisual: RenderMeshVisual;
    
    @input
    @hint("Edit button idle material (green - for reset)")
    @allowUndefined
    editButtonIdleMaterial: Material;
    
    @input
    @hint("Lock button SceneObject (with ButtonFeedback_Modified component) - easier to drag & drop")
    @allowUndefined
    lockButtonObject: SceneObject;
    
    @input
    @hint("Edit button SceneObject (with ButtonFeedback_Modified component) - easier to drag & drop")
    @allowUndefined
    editButtonObject: SceneObject;
    
    @input
    @hint("Material on the edit button icon to swap icon textures")
    @allowUndefined
    editButtonIconMaterial: Material;
    
    @input
    @hint("Edit button default icon texture (shown when not in edit mode)")
    @allowUndefined
    editButtonDefaultIcon: Texture;
    
    @input
    @hint("Edit button on icon texture (shown when in edit mode)")
    @allowUndefined
    editButtonOnIcon: Texture;
    
    @input
    @hint("Lock button ButtonFeedback_Modified component (optional - will auto-find if lockButtonObject is assigned)")
    @allowUndefined
    lockButtonFeedback: ButtonFeedback_Modified | null;
    
    @input
    @hint("Edit button ButtonFeedback_Modified component (optional - will auto-find if editButtonObject is assigned)")
    @allowUndefined
    editButtonFeedback: ButtonFeedback_Modified | null;
    @ui.group_end
    
    // ===== Opacity Slider =====
    @ui.group_start("Opacity Slider")
    @input
    @hint("Slider component for opacity control")
    opacitySlider: Slider;
    
    @input
    @hint("Image component to apply opacity to (projected image)")
    targetImage: Image;
    
    private targetAlpha: number = 1.0;
    private currentAlpha: number = 1.0;
    private lerpSpeed: number = 5.0; // Adjust for smoothness
    @ui.group_end
    
    // ===== Saturation Slider =====
    @ui.group_start("Saturation Slider")
    @input
    @hint("Slider component for saturation control")
    saturationSlider: Slider;
    
    @input
    @hint("Image component to apply saturation to (projected image)")
    saturationTargetImage: Image;
    
    private targetMonotone: number = 0.0;
    private currentMonotone: number = 0.0;
    @ui.group_end
    
    // ===== Target Image =====
    @ui.group_start("Target Objects")
    @input
    @hint("The projected image object to control")
    projectedImageObject: SceneObject;
    
    @input
    @hint("Container frame component (for lock functionality)")
    containerFrame: ContainerFrame;
    @ui.group_end
    
    // ===== Hand Menu Root =====
    @ui.group_start("Hand Menu Root")
    @input
    @hint("Root object for the hand menu (for visibility control)")
    handMenu_State: SceneObject;
    
    @input
    @hint("Slider UI panel (to close when edit button is pinched)")
    @allowUndefined
    sliderMenuPanel: SceneObject;
    @ui.group_end
    
    private isLocked: boolean = false;
    private pendingEditButtonState: boolean | null = null; // Track pending texture change
    
    onAwake() {
        super.onAwake();
    }
    
    protected initialize(): void {
        // Auto-find ButtonFeedback_Modified components from SceneObject inputs
        this.autoFindButtonFeedbackComponents();
        
        // Ensure slider menu panel starts hidden
        if (this.sliderMenuPanel) {
            this.sliderMenuPanel.enabled = false;
        }
        
        // Setup button handlers
        this.setupHomeButton();
        this.setupLockButton();
        this.setupEditButton();
        this.setupOpacitySlider();
        this.setupSaturationSlider();
        
        // Subscribe to GameManager events
        if (this.gameManager) {
            this.gameManager.onStateChange.add(this.onStateChanged.bind(this));
            this.gameManager.onLockChange.add(this.onLockChanged.bind(this));
            this.gameManager.onOpacityChange.add(this.onOpacityChanged.bind(this));
        }
        
        // Initialize visuals
        if (this.lockIconMaterial && this.lockTexture && this.lockIconMaterial.mainPass) {
            this.lockIconMaterial.mainPass.baseTex = this.lockTexture;
        }
        
        this.updateLockVisuals();
        this.updateButtonVisibility();
        
        // Start update loop for smooth slider transitions
        this.createEvent("UpdateEvent").bind(this.update.bind(this));
    }
    
    /**
     * Auto-find ButtonFeedback_Modified components from SceneObject inputs
     * This makes it easier to drag & drop button SceneObjects instead of finding specific components
     */
    private autoFindButtonFeedbackComponents() {
        // Find lock button ButtonFeedback_Modified
        if (this.lockButtonObject && !this.lockButtonFeedback) {
            this.lockButtonFeedback = this.findButtonFeedbackComponent(this.lockButtonObject, "lock");
        }
        
        // Find edit button ButtonFeedback_Modified
        if (this.editButtonObject && !this.editButtonFeedback) {
            this.editButtonFeedback = this.findButtonFeedbackComponent(this.editButtonObject, "edit");
        }
    }
    
    /**
     * Find MaterialTextureReplacer component recursively in children
     */
    private findMaterialTextureReplacer(obj: SceneObject): any {
        if (!obj) return null;
        
        // Check if this object has a MaterialTextureReplacer component
        const components = obj.getComponents("Component.ScriptComponent");
        for (let i = 0; i < components.length; i++) {
            const comp = components[i] as ScriptComponent;
            // Check if this is a MaterialTextureReplacer by looking for its properties
            if (comp && (comp as any).targetMaterial && (comp as any).originalTexture) {
                return comp;
            }
        }
        
        // Check children
        for (let i = 0; i < obj.children.length; i++) {
            const childReplacer = this.findMaterialTextureReplacer(obj.children[i]);
            if (childReplacer) return childReplacer;
        }
        
        return null;
    }
    
    /**
     * Find ButtonFeedback_Modified component on a SceneObject
     */
    private findButtonFeedbackComponent(sceneObject: SceneObject, buttonName: string): ButtonFeedback_Modified | null {
        if (!sceneObject) return null;
        
        try {
            const allComponents = sceneObject.getComponents("Component.ScriptComponent");
            for (let i = 0; i < allComponents.length; i++) {
                const comp = allComponents[i];
                if (comp) {
                    const hasResetToIdle = typeof (comp as any).resetToIdle === "function";
                    const hasRenderMeshVisual = (comp as any).renderMeshVisual !== undefined;
                    if (hasResetToIdle && hasRenderMeshVisual) {
                        return comp as ButtonFeedback_Modified;
                    }
                }
            }
        } catch (e) {
            // Silently fail
        }
        return null;
    }
    
    /**
     * Handle state changes - update hand menu visibility
     */
    private onStateChanged(event: StateChangeEvent) {
        this.updateButtonVisibility();
        // Edit button is now controlled by pinch interaction, not state
    }
    
    /**
     * Update button visibility based on current state
     */
    private updateButtonVisibility() {
        if (!this.gameManager) return;
        
        const currentState = this.gameManager.currentState;
        
        // Hand menu not available in INTRO
        if (this.handMenu_State) {
            this.handMenu_State.enabled = currentState !== GameState.INTRO;
        }
        
        if (currentState === GameState.INTRO) return;
        
        // Lock and Opacity - only in IMAGE_GEN (when image is placed), HOW_TO_EDIT, TRACING
        const showLockOpacity = (currentState === GameState.IMAGE_GEN && 
                                (this.gameManager.currentSubState === ImageGenSubState.PLACED || 
                                 this.gameManager.currentSubState === ImageGenSubState.SURFACE_DETECTION)) ||
                               currentState === GameState.HOW_TO_EDIT ||
                               currentState === GameState.TRACING;
        
        if (this.lockButtonInteractable) {
            this.lockButtonInteractable.enabled = showLockOpacity;
        }
        
        // Only enable sliders if the panel is visible AND state allows it
        // If sliders are children of the panel, they'll be controlled by panel visibility
        // Otherwise, control them directly but only when panel is open
        const isPanelVisible = this.sliderMenuPanel ? this.sliderMenuPanel.enabled : false;
        const shouldShowSliders = showLockOpacity && isPanelVisible;
        
        if (this.opacitySlider) {
            const opacitySliderObject = this.opacitySlider.getSceneObject();
            if (opacitySliderObject) {
                // Only enable if state allows AND panel is visible
                // If slider is child of panel, this will be redundant but harmless
                opacitySliderObject.enabled = shouldShowSliders;
            }
        }
        if (this.saturationSlider) {
            const saturationSliderObject = this.saturationSlider.getSceneObject();
            if (saturationSliderObject) {
                // Only enable if state allows AND panel is visible
                // If slider is child of panel, this will be redundant but harmless
                saturationSliderObject.enabled = shouldShowSliders;
            }
        }
    }
    
    /**
     * Setup home button to go back to intro
     */
    private setupHomeButton() {
        ButtonManager.setupButton(this.homeButtonInteractable, () => {
            this.closeSliderMenuPanel();
            this.resetSettings();
            
            if (this.gameManager) {
                // goHome() now handles resetting placement and entering SURFACE_DETECTION
                // if we're in projection state (PLACED or SURFACE_DETECTION)
                this.gameManager.goHome();
            }
        });
    }
    
    /**
     * Reset lock, opacity, and saturation settings to defaults
     */
    private resetSettings() {
        this.pendingEditButtonState = null;
        this.setLocked(false);
        
        // Reset button materials immediately
        this.resetAllButtonMaterials();
        
        // Force reset edit button (icon + mesh visual)
        this.forceResetEditButton();
        
        // Ensure reset persists after ButtonFeedback_Modified processes (if it's active)
        // Use multiple checks to ensure the reset sticks and handles hover state
        for (let i = 0; i < 3; i++) {
            const resetDelay = this.createEvent("DelayedCallbackEvent");
            resetDelay.bind(() => {
                // Force reset edit button mesh
                this.pendingEditButtonState = null;
                
                // Reset edit button icon to default (same as lock button resets its texture)
                this.updateEditButtonIcon(false);
                
                // Reset MaterialTextureReplacer if it exists on edit button
                if (this.editButtonObject) {
                    const textureReplacer = this.findMaterialTextureReplacer(this.editButtonObject);
                    if (textureReplacer && textureReplacer.targetMaterial && textureReplacer.originalTexture) {
                        textureReplacer.targetMaterial.mainPass.baseTex = textureReplacer.originalTexture;
                        (textureReplacer as any).isReplaced = false; // Reset internal state
                        this.log.debug("Reset MaterialTextureReplacer on edit button");
                    }
                }
                
                // Force reset mesh visual to original idle material (overrides any hover/swap state)
                if (this.editButtonRenderMeshVisual && this.editButtonIdleMaterial) {
                    this.editButtonRenderMeshVisual.mainMaterial = this.editButtonIdleMaterial;
                }
                
                // Also ensure lock button is reset to original idle material
                if (this.lockButtonRenderMeshVisual && this.lockButtonIdleMaterial) {
                    this.lockButtonRenderMeshVisual.mainMaterial = this.lockButtonIdleMaterial;
                }
                
                // Force reset ButtonFeedback_Modified again to clear any hover state
                if (this.editButtonFeedback && this.editButtonFeedback.resetToIdle) {
                    this.editButtonFeedback.resetToIdle();
                }
                if (this.lockButtonFeedback && this.lockButtonFeedback.resetToIdle) {
                    this.lockButtonFeedback.resetToIdle();
                }
                
                // Force material one more time after resetToIdle
                if (this.editButtonRenderMeshVisual && this.editButtonIdleMaterial) {
                    this.editButtonRenderMeshVisual.mainMaterial = this.editButtonIdleMaterial;
                }
                if (this.lockButtonRenderMeshVisual && this.lockButtonIdleMaterial) {
                    this.lockButtonRenderMeshVisual.mainMaterial = this.lockButtonIdleMaterial;
                }
            });
            resetDelay.reset(0.05 + (i * 0.1)); // 50ms, 150ms, 250ms delays
        }
        
        if (this.gameManager) {
            this.gameManager.setLocked(false);
        }
        
        // Reset opacity slider to 0.7 (default)
        if (this.opacitySlider && this.targetImage) {
            const defaultOpacity = 0.7;
            this.targetAlpha = defaultOpacity;
            this.currentAlpha = defaultOpacity;
            this.setAlpha(defaultOpacity);
            try {
                this.opacitySlider.currentValue = defaultOpacity;
            } catch (e) {}
            if (this.gameManager) {
                this.gameManager.setImageOpacity(defaultOpacity);
            }
        }
        
        // Reset saturation slider to 1.0 (default - full color)
        if (this.saturationSlider && this.saturationTargetImage) {
            const defaultSaturation = 1.0;
            this.targetMonotone = defaultSaturation;
            this.currentMonotone = defaultSaturation;
            this.setMonotone(defaultSaturation);
            try {
                this.saturationSlider.currentValue = defaultSaturation;
            } catch (e) {}
        }
    }
    
    /**
     * Setup lock button to toggle lock state
     */
    private setupLockButton() {
        ButtonManager.setupButton(this.lockButtonInteractable, () => {
            this.log.info("Lock button TRIGGERED");
            const wasLocked = this.isLocked;
            this.toggleLock();
            const nowLocked = this.isLocked;
            this.log.info("Lock button state - Was: " + (wasLocked ? "LOCKED" : "UNLOCKED") + ", Now: " + (nowLocked ? "LOCKED" : "UNLOCKED"));
            this.log.debug("Lock button visual state: " + (nowLocked ? "SELECTED (unlock icon)" : "UNSELECTED (lock icon)"));
        });
    }
    
    /**
     * Setup edit button to detect pinch interaction
     */
    private setupEditButton() {
        if (!this.editButtonInteractable) return;
        
        ButtonManager.setupButton(this.editButtonInteractable, () => {
            this.log.debug("Edit button TRIGGER END - setting to DEFAULT icon");
            this.pendingEditButtonState = null;
            this.updateEditButtonIcon(false);
            // Toggle panel
            const panelWasOpen = this.sliderMenuPanel ? this.sliderMenuPanel.enabled : false;
            this.toggleSliderMenuPanel();
            const panelNowOpen = this.sliderMenuPanel ? this.sliderMenuPanel.enabled : false;
            this.log.debug("Slider menu panel toggled - Was: " + (panelWasOpen ? "OPEN" : "CLOSED") + ", Now: " + (panelNowOpen ? "OPEN" : "CLOSED"));
        }, {
            onStart: () => {
                this.log.debug("Edit button TRIGGER START - setting to ON icon");
                this.updateEditButtonIcon(true);
                this.pendingEditButtonState = true;
            },
            onHoverExit: () => {
                // Only clear if we're not actively pinching
                if (this.pendingEditButtonState === null) {
                    this.log.debug("Edit button HOVER EXIT - setting to DEFAULT icon");
                    this.updateEditButtonIcon(false);
                }
            }
        });
    }
    
    /**
     * Toggle the slider menu panel (open if closed, close if open)
     */
    private toggleSliderMenuPanel() {
        if (this.sliderMenuPanel) {
            this.sliderMenuPanel.enabled = !this.sliderMenuPanel.enabled;
            this.updateButtonVisibility();
        }
    }
    
    /**
     * Close the slider menu panel
     */
    private closeSliderMenuPanel() {
        if (this.sliderMenuPanel) {
            this.sliderMenuPanel.enabled = false;
        }
    }
    
    /**
     * Setup opacity slider
     */
    private setupOpacitySlider() {
        if (!this.opacitySlider || !this.targetImage) return;
        
        const initialValue = this.opacitySlider.currentValue ?? 1.0;
        this.targetAlpha = initialValue;
        this.currentAlpha = this.targetAlpha;
        this.setAlpha(this.targetAlpha);
        
        // Use SliderManager for consistent setup with retry support
        SliderManager.setupSlider(
            this.opacitySlider,
            this.onOpacitySliderValueChanged.bind(this),
            {
                initialValue: initialValue,
                retryOnFailure: true,
                retryDelay: 0.1,
                createEvent: (eventName: "DelayedCallbackEvent") => this.createEvent(eventName)
            }
        );
    }
    
    /**
     * Handle opacity slider value changes
     */
    private onOpacitySliderValueChanged(value: number) {
        this.targetAlpha = value;
        
        // Update GameManager
        if (this.gameManager) {
            this.gameManager.setImageOpacity(value);
        }
    }
    
    /**
     * Setup saturation slider
     */
    private setupSaturationSlider() {
        if (!this.saturationSlider || !this.saturationTargetImage) return;
        
        // Clone material for independent editing
        if (this.saturationTargetImage.mainMaterial) {
            this.saturationTargetImage.mainMaterial = this.saturationTargetImage.mainMaterial.clone();
        }
        
        const initialValue = this.saturationSlider.currentValue ?? 0.0;
        this.targetMonotone = initialValue;
        this.currentMonotone = this.targetMonotone;
        this.setMonotone(this.targetMonotone);
        
        // Use SliderManager for consistent setup with retry support
        SliderManager.setupSlider(
            this.saturationSlider,
            this.onSaturationSliderValueChanged.bind(this),
            {
                initialValue: initialValue,
                retryOnFailure: true,
                retryDelay: 0.1,
                createEvent: (eventName: "DelayedCallbackEvent") => this.createEvent(eventName)
            }
        );
    }
    
    /**
     * Handle saturation slider value changes
     */
    private onSaturationSliderValueChanged(value: number) {
        this.targetMonotone = value;
    }
    
    /**
     * Update loop for smooth slider transitions
     */
    private update() {
        // Smoothly interpolate opacity
        if (Math.abs(this.currentAlpha - this.targetAlpha) > 0.001) {
            this.currentAlpha += (this.targetAlpha - this.currentAlpha) * Math.min(this.lerpSpeed * getDeltaTime(), 1.0);
            this.setAlpha(this.currentAlpha);
        }
        
        // Smoothly interpolate saturation (monotone)
        if (Math.abs(this.currentMonotone - this.targetMonotone) > 0.001) {
            this.currentMonotone += (this.targetMonotone - this.currentMonotone) * Math.min(this.lerpSpeed * getDeltaTime(), 1.0);
            this.setMonotone(this.currentMonotone);
        }
        
    }
    
    /**
     * Toggle lock state
     */
    public toggleLock() {
        const previousState = this.isLocked;
        this.isLocked = !this.isLocked;
        
        this.log.info("toggleLock() - State changed from " + (previousState ? "LOCKED" : "UNLOCKED") + " to " + (this.isLocked ? "LOCKED" : "UNLOCKED"));
        
        if (this.gameManager) {
            this.gameManager.setLocked(this.isLocked);
            this.log.debug("Notified GameManager of lock state: " + (this.isLocked ? "LOCKED" : "UNLOCKED"));
        }
        
        this.applyLock(this.isLocked);
        this.updateLockVisuals();
        this.log.debug("Lock visuals updated - showing " + (this.isLocked ? "UNLOCK icon (locked state)" : "LOCK icon (unlocked state)"));
    }
    
    /**
     * Set lock state directly
     */
    public setLocked(locked: boolean) {
        this.isLocked = locked;
        this.applyLock(locked);
        this.updateLockVisuals();
    }
    
    /**
     * Apply lock to container frame
     */
    private applyLock(locked: boolean) {
        if (!this.containerFrame) {
            this.log.warn("containerFrame not assigned, cannot apply lock state");
            return;
        }
        if (locked) {
            this.containerFrame.lock();
            this.log.debug("Container frame LOCKED (image is now locked)");
        } else {
            this.containerFrame.unlock();
            this.log.debug("Container frame UNLOCKED (image is now unlocked)");
        }
    }
    
    /**
     * Update lock button visuals using texture swapping
     */
    private updateLockVisuals() {
        if (!this.lockIconMaterial || !this.lockIconMaterial.mainPass) return;
        const targetTexture = this.isLocked ? this.unlockTexture : this.lockTexture;
        if (targetTexture) {
            this.lockIconMaterial.mainPass.baseTex = targetTexture;
        }
    }
    
    /**
     * Update edit button icon texture (same approach as ButtonFeedback_Modified)
     * Uses mainPass.icon instead of baseTex for icon textures
     */
    private updateEditButtonIcon(on: boolean) {
        if (!this.editButtonIconMaterial || !this.editButtonIconMaterial.mainPass) return;
        const targetIcon = on ? this.editButtonOnIcon : this.editButtonDefaultIcon;
        if (targetIcon) {
            // Enable icon rendering (same as ButtonFeedback_Modified)
            this.editButtonIconMaterial.mainPass.iconEnabled = true;
            // Set the icon texture (same as ButtonFeedback_Modified)
            this.editButtonIconMaterial.mainPass.icon = targetIcon;
            this.log.debug("Edit button icon set to: " + (on ? "ON" : "DEFAULT") + " (" + targetIcon.name + ")");
        }
    }
    
    /**
     * Force reset edit button to unselected state (icon + mesh visual)
     * IMPORTANT: Sets material directly to original idle material to override any material swapping
     */
    private forceResetEditButton() {
        this.log.debug("forceResetEditButton() called");
        
        // Clear any pending state first
        this.pendingEditButtonState = null;
        this.log.debug("Cleared pendingEditButtonState");
        
        // Reset icon to default (same as lock button resets its texture)
        this.updateEditButtonIcon(false);
        
        // Reset MaterialTextureReplacer if it exists on edit button (same as lock button resets)
        if (this.editButtonObject) {
            const textureReplacer = this.findMaterialTextureReplacer(this.editButtonObject);
            if (textureReplacer && textureReplacer.targetMaterial && textureReplacer.originalTexture) {
                textureReplacer.targetMaterial.mainPass.baseTex = textureReplacer.originalTexture;
                (textureReplacer as any).isReplaced = false; // Reset internal state
                this.log.debug("Reset MaterialTextureReplacer on edit button (in forceResetEditButton)");
            }
        }
        
        // Reset mesh visual material to idle - ALWAYS set to original idle material
        // This overrides any material swapping that ButtonFeedback_Modified may have done
        if (this.editButtonRenderMeshVisual && this.editButtonIdleMaterial) {
            const currentMat = this.editButtonRenderMeshVisual.mainMaterial;
            const currentMatName = currentMat ? currentMat.name : "";
            const idleMatName = this.editButtonIdleMaterial.name;
            
            // Always set to original idle material (overrides ButtonFeedback_Modified swap state)
            this.editButtonRenderMeshVisual.mainMaterial = this.editButtonIdleMaterial;
            if (currentMatName !== idleMatName) {
                this.log.debug("Edit button mesh material CHANGED to IDLE");
                this.log.debug("Previous material: " + currentMatName);
                this.log.debug("New material: " + idleMatName);
            } else {
                this.log.debug("Edit button mesh material already IDLE (no change needed)");
            }
        }
        
        // Also try ButtonFeedback_Modified reset (but material is already set above)
        if (this.editButtonFeedback && this.editButtonFeedback.resetToIdle) {
            try {
                this.log.debug("Calling editButtonFeedback.resetToIdle()");
                this.editButtonFeedback.resetToIdle();
                this.log.debug("editButtonFeedback.resetToIdle() completed");
            } catch (e) {
                this.log.error("editButtonFeedback.resetToIdle() failed: " + e);
            }
        }
    }
    
    /**
     * Called when lock state changes from GameManager
     */
    private onLockChanged(locked: boolean) {
        this.isLocked = locked;
        this.applyLock(locked);
        this.updateLockVisuals();
    }
    
    /**
     * Set alpha value
     */
    private setAlpha(alpha: number) {
        if (!this.targetImage?.mainMaterial?.mainPass) return;
        const color = this.targetImage.mainMaterial.mainPass.baseColor;
        color.w = alpha;
        this.targetImage.mainMaterial.mainPass.baseColor = color;
    }
    
    /**
     * Set monotone value
     */
    private setMonotone(amount: number) {
        if (!this.saturationTargetImage?.mainMaterial?.mainPass) return;
        if (typeof this.saturationTargetImage.mainMaterial.mainPass["MonotoneAmount"] !== "undefined") {
            this.saturationTargetImage.mainMaterial.mainPass["MonotoneAmount"] = amount;
        }
    }
    
    /**
     * Called when opacity changes from GameManager
     */
    private onOpacityChanged(opacity: number) {
        this.targetAlpha = opacity;
    }
    
    /**
     * Get current opacity value
     */
    public getOpacity(): number {
        return this.currentAlpha;
    }
    
    /**
     * Get current lock state
     */
    public getIsLocked(): boolean {
        return this.isLocked;
    }
    
    /**
     * Reset all button mesh visual materials to idle state
     * IMPORTANT: Sets material directly to original idle material FIRST to override any material swapping
     * Then calls ButtonFeedback_Modified.resetToIdle() to reset internal state
     * Also ensures material stays correct even if hover state is active
     */
    private resetAllButtonMaterials() {
        this.log.debug("resetAllButtonMaterials() called");
        
        // Reset lock button - set material directly FIRST (overrides any swapped material)
        if (this.lockButtonRenderMeshVisual && this.lockButtonIdleMaterial) {
            const currentMat = this.lockButtonRenderMeshVisual.mainMaterial;
            const currentMatName = currentMat ? currentMat.name : "";
            const idleMatName = this.lockButtonIdleMaterial.name;
            
            // Always set to original idle material (overrides ButtonFeedback_Modified swap state)
            this.lockButtonRenderMeshVisual.mainMaterial = this.lockButtonIdleMaterial;
            if (currentMatName !== idleMatName) {
                this.log.debug("Lock button mesh material CHANGED to IDLE");
                this.log.debug("Previous: " + currentMatName);
                this.log.debug("New: " + idleMatName);
            }
        }
        // Then call resetToIdle to reset ButtonFeedback_Modified's internal state
        if (this.lockButtonFeedback && this.lockButtonFeedback.resetToIdle) {
            this.lockButtonFeedback.resetToIdle();
        }
        // Force material again after resetToIdle (in case it was changed by resetToIdle using swapped material)
        if (this.lockButtonRenderMeshVisual && this.lockButtonIdleMaterial) {
            this.lockButtonRenderMeshVisual.mainMaterial = this.lockButtonIdleMaterial;
        }
        
        // Reset edit button - set material directly FIRST (overrides any swapped material)
        if (this.editButtonRenderMeshVisual && this.editButtonIdleMaterial) {
            const currentMat = this.editButtonRenderMeshVisual.mainMaterial;
            const currentMatName = currentMat ? currentMat.name : "";
            const idleMatName = this.editButtonIdleMaterial.name;
            
            // Always set to original idle material (overrides ButtonFeedback_Modified swap state)
            this.editButtonRenderMeshVisual.mainMaterial = this.editButtonIdleMaterial;
            if (currentMatName !== idleMatName) {
                this.log.debug("Edit button mesh material CHANGED to IDLE (in resetAllButtonMaterials)");
                this.log.debug("Previous: " + currentMatName);
                this.log.debug("New: " + idleMatName);
            } else {
                this.log.debug("Edit button mesh material already IDLE (in resetAllButtonMaterials)");
            }
        }
        // Then call resetToIdle to reset ButtonFeedback_Modified's internal state
        if (this.editButtonFeedback && this.editButtonFeedback.resetToIdle) {
            this.editButtonFeedback.resetToIdle();
        }
        // Force material again after resetToIdle (in case it was changed by resetToIdle using swapped material)
        if (this.editButtonRenderMeshVisual && this.editButtonIdleMaterial) {
            this.editButtonRenderMeshVisual.mainMaterial = this.editButtonIdleMaterial;
        }
    }
}


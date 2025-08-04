import { Interactable } from "SpectaclesInteractionKit/Components/Interaction/Interactable/Interactable";
import { InteractorEvent } from "SpectaclesInteractionKit/Core/Interactor/InteractorEvent";

@component
export class ContainerFrameLocker extends BaseScriptComponent {
    
    @input
    @hint("The button that will trigger the lock/unlock")
    private lockButton: Interactable;
    
    @input
    @hint("The container frame to be locked/unlocked")
    private containerFrame: SceneObject;
    
    @input
    @hint("Lock position when enabled")
    private lockPosition: boolean = true;
    
    @input
    @hint("Lock rotation when enabled")
    private lockRotation: boolean = true;
    
    @input
    @hint("Lock scale when enabled")
    private lockScale: boolean = true;
    
    @input
    @hint("Toggle lock state on each button press")
    private isToggleMode: boolean = true;
    
    @input
    @hint("Text component to show lock status")
    private statusText: any;
    
    private isLocked: boolean = false;
    private originalPosition: vec3;
    private originalRotation: quat;
    private originalScale: vec3;
    private containerTransform: Transform;

    onAwake() {
        if (!this.containerFrame) {
            print("Warning: No container frame assigned to ContainerFrameLocker");
            return;
        }
        
        this.containerTransform = this.containerFrame.getTransform();
        this.storeOriginalTransform();
        this.setupButtonInteraction();
    }
    
    private storeOriginalTransform() {
        if (this.containerTransform) {
            this.originalPosition = this.containerTransform.getLocalPosition();
            this.originalRotation = this.containerTransform.getLocalRotation();
            this.originalScale = this.containerTransform.getLocalScale();
        }
    }
    
    private setupButtonInteraction() {
        if (!this.lockButton) {
            print("Warning: No lock button assigned to ContainerFrameLocker");
            return;
        }
        
        this.lockButton.onTriggerEnd.add((event: InteractorEvent) => {
            if (this.isToggleMode) {
                this.toggleLock();
            } else {
                this.lockContainer();
            }
        });
    }
    
    public toggleLock() {
        if (this.isLocked) {
            this.unlockContainer();
        } else {
            this.lockContainer();
        }
    }
    
    public lockContainer() {
        if (!this.containerTransform) return;
        
        this.isLocked = true;
        this.applyLock();
        this.updateStatusText("Container Locked");
        print("Container frame locked");
    }
    
    public unlockContainer() {
        if (!this.containerTransform) return;
        
        this.isLocked = false;
        this.removeLock();
        this.updateStatusText("Container Unlocked");
        print("Container frame unlocked");
    }
    
    private applyLock() {
        if (!this.containerTransform) return;
        
        // Store current transform as the locked state
        this.originalPosition = this.containerTransform.getLocalPosition();
        this.originalRotation = this.containerTransform.getLocalRotation();
        this.originalScale = this.containerTransform.getLocalScale();
    }
    
    private removeLock() {
        if (!this.containerTransform) return;
        
        // Restore original transform
        if (this.originalPosition && this.lockPosition) {
            this.containerTransform.setLocalPosition(this.originalPosition);
        }
        if (this.originalRotation && this.lockRotation) {
            this.containerTransform.setLocalRotation(this.originalRotation);
        }
        if (this.originalScale && this.lockScale) {
            this.containerTransform.setLocalScale(this.originalScale);
        }
    }
    
    private updateStatusText(message: string) {
        if (this.statusText) {
            this.statusText.text = message;
        }
    }
    
    onUpdate() {
        if (!this.isLocked || !this.containerTransform) return;
        
        // Continuously enforce the lock by resetting to locked values
        if (this.lockPosition && this.originalPosition) {
            const currentPos = this.containerTransform.getLocalPosition();
            if (!this.vectorsEqual(currentPos, this.originalPosition)) {
                this.containerTransform.setLocalPosition(this.originalPosition);
            }
        }
        
        if (this.lockRotation && this.originalRotation) {
            const currentRot = this.containerTransform.getLocalRotation();
            if (!this.quaternionsEqual(currentRot, this.originalRotation)) {
                this.containerTransform.setLocalRotation(this.originalRotation);
            }
        }
        
        if (this.lockScale && this.originalScale) {
            const currentScale = this.containerTransform.getLocalScale();
            if (!this.vectorsEqual(currentScale, this.originalScale)) {
                this.containerTransform.setLocalScale(this.originalScale);
            }
        }
    }
    
    private vectorsEqual(v1: vec3, v2: vec3): boolean {
        return Math.abs(v1.x - v2.x) < 0.001 && 
               Math.abs(v1.y - v2.y) < 0.001 && 
               Math.abs(v1.z - v2.z) < 0.001;
    }
    
    private quaternionsEqual(q1: quat, q2: quat): boolean {
        return Math.abs(q1.x - q2.x) < 0.001 && 
               Math.abs(q1.y - q2.y) < 0.001 && 
               Math.abs(q1.z - q2.z) < 0.001 && 
               Math.abs(q1.w - q2.w) < 0.001;
    }
    
    public getLockStatus(): boolean {
        return this.isLocked;
    }
    
    public setLockStatus(locked: boolean) {
        if (locked) {
            this.lockContainer();
        } else {
            this.unlockContainer();
        }
    }
} 
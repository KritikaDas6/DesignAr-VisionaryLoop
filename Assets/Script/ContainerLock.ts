import { Interactable } from "SpectaclesInteractionKit/Components/Interaction/Interactable/Interactable"
import { InteractorEvent } from "SpectaclesInteractionKit/Core/Interactor/InteractorEvent"
import { InteractorInputType, TargetingMode } from "SpectaclesInteractionKit/Core/Interactor/Interactor"
import Event from "SpectaclesInteractionKit/Utils/Event"
import NativeLogger from "SpectaclesInteractionKit/Utils/NativeLogger"

const log = new NativeLogger("ContainerLock")

/**
 * ContainerLock - A container script that locks position, scale, and rotation
 * when the user interacts with an assigned scene object.
 */
@component
export class ContainerLock extends BaseScriptComponent {
  
  @ui.group_start("Container Settings")
  @input
  @hint("The scene object that will trigger the lock when interacted with")
  triggerObject: SceneObject | null = null
  
  @input
  @hint("The scene object whose transform will be locked")
  targetObject: SceneObject | null = null
  
  @input
  @hint("Lock position when triggered")
  lockPosition: boolean = true
  
  @input
  @hint("Lock rotation when triggered")
  lockRotation: boolean = true
  
  @input
  @hint("Lock scale when triggered")
  lockScale: boolean = true
  
  @input
  @hint("Automatically unlock when interaction ends")
  autoUnlock: boolean = true
  
  @input
  @hint("Lock immediately on interaction start")
  lockOnStart: boolean = true
  
  @ui.group_end
  
  @ui.group_start("Lock State")
  @input
  @hint("Current lock state - can be manually toggled")
  isLocked: boolean = false
  @ui.group_end

  // Private properties
  private triggerInteractable: Interactable | null = null
  private targetTransform: Transform | null = null
  private triggerTransform: Transform | null = null
  
  // Stored values when locked
  private lockedPosition: vec3 = vec3.zero()
  private lockedRotation: quat = quat.quatIdentity()
  private lockedScale: vec3 = vec3.one()
  
  // Events
  private onLockEvent = new Event<void>()
  private onUnlockEvent = new Event<void>()
  
  /**
   * Public API for lock event
   */
  onLock = this.onLockEvent.publicApi()
  
  /**
   * Public API for unlock event
   */
  onUnlock = this.onUnlockEvent.publicApi()

  onAwake() {
    log.d("ContainerLock initialized")
    
    // Validate inputs
    if (!this.triggerObject) {
      log.e("Trigger object is required")
      return
    }
    
    if (!this.targetObject) {
      log.e("Target object is required")
      return
    }
    
    // Get transforms
    this.targetTransform = this.targetObject.getTransform()
    this.triggerTransform = this.triggerObject.getTransform()
    
    // Create interactable on trigger object
    this.triggerInteractable = this.triggerObject.createComponent(Interactable.getTypeName())
    this.triggerInteractable.targetingMode = TargetingMode.Direct
    
    // Set up event listeners
    this.setupEventListeners()
    
    // Store initial values
    this.storeCurrentValues()
  }

  private setupEventListeners() {
    if (!this.triggerInteractable) return
    
    // Listen for interaction start
    this.triggerInteractable.onTriggerStart.add((event: InteractorEvent) => {
      log.d("Trigger object interacted with")
      if (this.lockOnStart) {
        this.lock()
      }
    })
    
    // Listen for interaction end
    this.triggerInteractable.onTriggerEnd.add((event: InteractorEvent) => {
      log.d("Trigger object interaction ended")
      if (this.autoUnlock) {
        this.unlock()
      }
    })
    
    // Listen for hover start (optional lock on hover)
    this.triggerInteractable.onHoverEnter.add((event: InteractorEvent) => {
      log.d("Trigger object hovered")
      // Could add hover-based locking here if needed
    })
  }

  /**
   * Lock the target object's transform
   */
  lock() {
    if (!this.targetTransform) {
      log.e("Target transform not available")
      return
    }
    
    // Store current values
    this.storeCurrentValues()
    
    // Set lock state
    this.isLocked = true
    
    log.d("Container locked - Position: " + this.lockedPosition.toString() + " Rotation: " + this.lockedRotation.toString() + " Scale: " + this.lockedScale.toString())
    
    // Invoke lock event
    this.onLockEvent.invoke()
  }

  /**
   * Unlock the target object's transform
   */
  unlock() {
    if (!this.targetTransform) {
      log.e("Target transform not available")
      return
    }
    
    // Set lock state
    this.isLocked = false
    
    log.d("Container unlocked")
    
    // Invoke unlock event
    this.onUnlockEvent.invoke()
  }

  /**
   * Store current transform values
   */
  private storeCurrentValues() {
    if (!this.targetTransform) return
    
    this.lockedPosition = this.targetTransform.getWorldPosition()
    this.lockedRotation = this.targetTransform.getWorldRotation()
    this.lockedScale = this.targetTransform.getWorldScale()
  }

  /**
   * Update method to enforce locks
   */
  update() {
    if (!this.isLocked || !this.targetTransform) return
    
    // Enforce position lock
    if (this.lockPosition) {
      const currentPosition = this.targetTransform.getWorldPosition()
      if (!currentPosition.equal(this.lockedPosition)) {
        this.targetTransform.setWorldPosition(this.lockedPosition)
      }
    }
    
    // Enforce rotation lock
    if (this.lockRotation) {
      const currentRotation = this.targetTransform.getWorldRotation()
      if (!currentRotation.equal(this.lockedRotation)) {
        this.targetTransform.setWorldRotation(this.lockedRotation)
      }
    }
    
    // Enforce scale lock
    if (this.lockScale) {
      const currentScale = this.targetTransform.getWorldScale()
      if (!currentScale.equal(this.lockedScale)) {
        this.targetTransform.setWorldScale(this.lockedScale)
      }
    }
  }

  /**
   * Manually set the locked position
   */
  setLockedPosition(position: vec3) {
    this.lockedPosition = position
    if (this.isLocked && this.lockPosition && this.targetTransform) {
      this.targetTransform.setWorldPosition(position)
    }
  }

  /**
   * Manually set the locked rotation
   */
  setLockedRotation(rotation: quat) {
    this.lockedRotation = rotation
    if (this.isLocked && this.lockRotation && this.targetTransform) {
      this.targetTransform.setWorldRotation(rotation)
    }
  }

  /**
   * Manually set the locked scale
   */
  setLockedScale(scale: vec3) {
    this.lockedScale = scale
    if (this.isLocked && this.lockScale && this.targetTransform) {
      this.targetTransform.setWorldScale(scale)
    }
  }

  /**
   * Get the current locked position
   */
  getLockedPosition(): vec3 {
    return this.lockedPosition
  }

  /**
   * Get the current locked rotation
   */
  getLockedRotation(): quat {
    return this.lockedRotation
  }

  /**
   * Get the current locked scale
   */
  getLockedScale(): vec3 {
    return this.lockedScale
  }

  /**
   * Toggle lock state
   */
  toggleLock() {
    if (this.isLocked) {
      this.unlock()
    } else {
      this.lock()
    }
  }

  /**
   * Force update stored values from current transform
   */
  updateStoredValues() {
    this.storeCurrentValues()
    log.d("Updated stored values")
  }

  /**
   * Check if the container is currently locked
   */
  isContainerLocked(): boolean {
    return this.isLocked
  }

  /**
   * Get the trigger interactable component
   */
  getTriggerInteractable(): Interactable | null {
    return this.triggerInteractable
  }

  /**
   * Get the target transform
   */
  getTargetTransform(): Transform | null {
    return this.targetTransform
  }

  /**
   * Clean up on destroy
   */
  onDestroy() {
    log.d("ContainerLock destroyed")
    // Clean up any subscriptions if needed
  }
}

import { PinchDetector, PinchDetectionSelection } from "SpectaclesInteractionKit/Providers/HandInputData/GestureProvider/PinchDetection/PinchDetector";
import { HandInputData } from "SpectaclesInteractionKit/Providers/HandInputData/HandInputData";
import { HandType } from "SpectaclesInteractionKit/Providers/HandInputData/HandType";

// Global test to see if script is being loaded
print("[VFXBurst] Script file is being loaded");

/**
 * VFXBurst
 *
 * Activates VFX when the user's hand is within a specific range of the target object.
 * Uses distance-based detection with responsive range based on object size.
 */
@component
export class ContinuousVFXBurstOnPinchWithButtonFeedback extends BaseScriptComponent {
  @input
  @hint("SceneObject with the VFX to move and enable (not a prefab)")
  vfxObject: SceneObject;

  @input
  @hint("Which hand to listen for (left, right, or either)")
  hand: string = "either";

  @input
  @hint("Offset from hand position (in world units)")
  positionOffset: vec3 = new vec3(0, 0, 0);

  @input
  @hint("Target object to check for hand proximity")
  targetObject: SceneObject;

  @input
  @hint("Minimum distance multiplier (relative to object size)")
  minDistanceMultiplier: number = 0.5;

  @input
  @hint("Maximum distance multiplier (relative to object size)")
  maxDistanceMultiplier: number = 2.0;

  @input
  @hint("Enable responsive range based on object size")
  useResponsiveRange: boolean = true;

  @input
  @hint("Fixed minimum distance (used when responsive range is disabled)")
  fixedMinDistance: number = 0.3;

  @input
  @hint("Fixed maximum distance (used when responsive range is disabled)")
  fixedMaxDistance: number = 1.0;

  private handInputData: HandInputData;
  private isHandInRange: boolean = false;
  private lastHandPosition: vec3 = null;
  private calculatedMinDistance: number = 0.3;
  private calculatedMaxDistance: number = 1.0;

  onAwake() {
    print("[VFXBurst] onAwake called - script is loading");
    print("[VFXBurst] Script attached to: " + this.getSceneObject().name);
    
    this.createEvent("OnStartEvent").bind(() => {
      print("[VFXBurst] OnStartEvent triggered");
      this.onStart();
    });
    this.createEvent("UpdateEvent").bind(() => {
      this.onUpdate();
    });
  }

  onStart() {
    print("[VFXBurst] Script starting...");
    
    if (!this.vfxObject) {
      print("[VFXBurst] ERROR: Please assign a vfxObject SceneObject.");
      return;
    }
    
    if (!this.targetObject) {
      print("[VFXBurst] ERROR: Please assign a targetObject SceneObject.");
      return;
    }
    
    // Calculate responsive range based on object size
    this.calculateResponsiveRange();
    
    print("[VFXBurst] Target object assigned: " + this.targetObject.name);
    print("[VFXBurst] Responsive range: " + this.useResponsiveRange);
    print("[VFXBurst] Range: " + this.calculatedMinDistance + " to " + this.calculatedMaxDistance + " units");
    
    this.vfxObject.enabled = false;
    this.handInputData = HandInputData.getInstance();
    
    print("[VFXBurst] Script setup complete");
  }

  private calculateResponsiveRange() {
    if (this.useResponsiveRange) {
      // Get object's scale to calculate responsive range
      const targetTransform = this.targetObject.getTransform();
      const scale = targetTransform.getLocalScale();
      
      // Calculate object size (average of x, y, z scale)
      const objectSize = (scale.x + scale.y + scale.z) / 3;
      
      // Calculate range based on object size
      this.calculatedMinDistance = objectSize * this.minDistanceMultiplier;
      this.calculatedMaxDistance = objectSize * this.maxDistanceMultiplier;
      
      // Ensure minimum range values
      this.calculatedMinDistance = Math.max(this.calculatedMinDistance, 0.1);
      this.calculatedMaxDistance = Math.max(this.calculatedMaxDistance, this.calculatedMinDistance + 0.1);
      
      print("[VFXBurst] Object scale: " + scale + ", Size: " + objectSize);
      print("[VFXBurst] Responsive range calculated: " + this.calculatedMinDistance + " to " + this.calculatedMaxDistance);
    } else {
      // Use fixed range values
      this.calculatedMinDistance = this.fixedMinDistance;
      this.calculatedMaxDistance = this.fixedMaxDistance;
      
      print("[VFXBurst] Using fixed range: " + this.calculatedMinDistance + " to " + this.calculatedMaxDistance);
    }
  }

  onUpdate() {
    // Basic debug to see if script is running
    if (!this.vfxObject) {
      print("[VFXBurst] ERROR: vfxObject not assigned");
      return;
    }
    
    if (!this.targetObject) {
      print("[VFXBurst] ERROR: targetObject not assigned");
      return;
    }
    
    // Check if hand is within the calculated range
    this.isHandInRange = this.checkHandInRange();
    
    if (this.isHandInRange) {
      // Get hand position for VFX placement
      const handPosition = this.getHandPosition();
      if (handPosition) {
        print("[VFXBurst] Hand in range at position: " + handPosition);
        this.activateVFXAtPosition(handPosition);
      }
    } else {
      // Disable VFX when not in range
      this.vfxObject.enabled = false;
      if (Math.random() < 0.01) { // 1% chance per frame to avoid spam
        print("[VFXBurst] Hand not in range");
      }
    }
  }

  private getHandPosition(): vec3 | null {
    const hands: HandType[] = this.hand === "either" ? ["left", "right"] : [this.hand as HandType];
    
    for (const handType of hands) {
      const trackedHand = this.handInputData.getHand(handType);
      if (trackedHand && trackedHand.isTracked()) {
        const indexTip = trackedHand.indexTip;
        if (indexTip) {
          return indexTip.position;
        }
      }
    }
    
    return null;
  }

  private activateVFXAtPosition(handPosition: vec3) {
    const finalPosition = new vec3(
      handPosition.x + this.positionOffset.x,
      handPosition.y + this.positionOffset.y,
      handPosition.z + this.positionOffset.z
    );
    
    print("[VFXBurst] Setting VFX position to: " + finalPosition);
    this.vfxObject.getTransform().setWorldPosition(finalPosition);
    this.vfxObject.enabled = true;
    print("[VFXBurst] VFX enabled: " + this.vfxObject.enabled);
  }

  private checkHandInRange(): boolean {
    if (!this.targetObject) return false;
    
    const hands: HandType[] = this.hand === "either" ? ["left", "right"] : [this.hand as HandType];
    
    for (const handType of hands) {
      const trackedHand = this.handInputData.getHand(handType);
      if (trackedHand && trackedHand.isTracked()) {
        const indexTip = trackedHand.indexTip;
        if (indexTip) {
          const handPosition = indexTip.position;
          const targetPosition = this.targetObject.getTransform().getWorldPosition();
          const distance = handPosition.sub(targetPosition).length;
          
          const inRange = distance >= this.calculatedMinDistance && distance <= this.calculatedMaxDistance;
          
          print("[VFXBurst] Range check - Hand: " + handPosition + ", Target: " + targetPosition + 
                ", Distance: " + distance + " (Range: " + this.calculatedMinDistance + "-" + this.calculatedMaxDistance + 
                ", InRange: " + inRange + ")");
          
          if (inRange) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
} 
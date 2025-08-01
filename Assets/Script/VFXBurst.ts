import { PinchDetector, PinchDetectionSelection } from "SpectaclesInteractionKit/Providers/HandInputData/GestureProvider/PinchDetection/PinchDetector";
import { HandInputData } from "SpectaclesInteractionKit/Providers/HandInputData/HandInputData";
import { HandType } from "SpectaclesInteractionKit/Providers/HandInputData/HandType";
// import { clamp } from "SpectaclesInteractionKit/Utils/mathUtils"; // Temporarily commented out

// Global test to see if script is being loaded
print("[VFXBurst] Script file is being loaded");

/**
 * VFXBurst
 *
 * While the user is pinching AND their hand is colliding with a target object, moves and enables a VFX SceneObject at the finger position, repeatedly re-enabling it for a burst effect.
 * VFX only appears when pinching AND hand is near the collision target (if assigned).
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
  @hint("Offset from pinch position (in world units)")
  positionOffset: vec3 = new vec3(0, 0, 0);

  @input
  @allowUndefined
  @hint("Container frame or image to check for collision (optional)")
  collisionTarget: SceneObject;



  private pinchDetectors: PinchDetector[] = [];
  private handInputData: HandInputData;
  private isPinching: boolean = false;
  private lastHandType: HandType = null;
  private lastPinchPosition: vec3 = null;
  private isHandColliding: boolean = false;
  private colliderComponent: ColliderComponent = null;

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
    
    if (this.collisionTarget) {
      print("[VFXBurst] Collision target assigned: " + this.collisionTarget.name);
      
      // Try to get a collider component from the target
      this.colliderComponent = this.collisionTarget.getComponent("Physics.ColliderComponent");
      if (!this.colliderComponent) {
        const colliderComp = this.collisionTarget.getComponent("ColliderComponent");
        if (colliderComp && colliderComp.constructor.name.includes("Collider")) {
          this.colliderComponent = colliderComp as ColliderComponent;
        }
      }
      
      if (this.colliderComponent) {
        this.setupColliderEvents();
        print("[VFXBurst] Collider events set up successfully with component: " + this.colliderComponent.constructor.name);
      } else {
        print("[VFXBurst] No collider component found on target. Available components:");
        const components = this.collisionTarget.getComponents("Component");
        for (let i = 0; i < components.length; i++) {
          const comp = components[i];
          print("[VFXBurst] - " + comp.constructor.name);
        }
        print("[VFXBurst] Falling back to distance-based detection");
      }
    } else {
      print("[VFXBurst] No collision target assigned - VFX will appear whenever pinching");
    }
    
    this.vfxObject.enabled = false;
    this.handInputData = HandInputData.getInstance();
    const hands: HandType[] =
      this.hand === "either" ? ["left", "right"] : [this.hand as HandType];
    
    print("[VFXBurst] Setting up pinch detectors for hands: " + hands);
    
    for (const handType of hands) {
      const detector = new PinchDetector({
        pinchDetectionSelection: PinchDetectionSelection.LensCoreML,
        handType,
        isTracked: () => true,
        onHandLost: { add: () => {}, remove: () => {} },
      } as any);
      detector.onPinchDown.add(() => {
        print("[VFXBurst] PinchDown event triggered for " + handType);
        this.startPinch(handType);
      });
      detector.onPinchUp.add(() => {
        print("[VFXBurst] PinchUp event triggered for " + handType);
        this.stopPinch();
      });
      detector.onPinchCancel.add(() => {
        print("[VFXBurst] PinchCancel event triggered for " + handType);
        this.stopPinch();
      });
      
      // Test if detector is working
      print("[VFXBurst] Detector created for " + handType + " with events: " + 
            (detector.onPinchDown ? "onPinchDown available" : "onPinchDown missing") + ", " +
            (detector.onPinchUp ? "onPinchUp available" : "onPinchUp missing"));
      this.pinchDetectors.push(detector);
      print("[VFXBurst] Pinch detector set up for " + handType);
    }
    
    print("[VFXBurst] Script setup complete");
  }

  private startPinch(handType: HandType) {
    this.isPinching = true;
    this.lastHandType = handType;
    this.lastPinchPosition = null; // Reset so first move always triggers
    print("[VFXBurst] Pinch started with " + handType + " hand");
    print("[VFXBurst] Pinch state: isPinching=" + this.isPinching + ", lastHandType=" + this.lastHandType);
  }

  private stopPinch() {
    this.isPinching = false;
    this.lastPinchPosition = null;
    this.vfxObject.enabled = false;
    print("[VFXBurst] Pinch stopped");
    print("[VFXBurst] Pinch state: isPinching=" + this.isPinching + ", lastHandType=" + this.lastHandType);
  }

  onUpdate() {
    // Basic debug to see if script is running
    if (!this.vfxObject) {
      print("[VFXBurst] ERROR: vfxObject not assigned");
      return;
    }
    
    if (!this.isPinching || !this.lastHandType) {
      // Only print this occasionally to avoid spam
      if (Math.random() < 0.01) { // 1% chance per frame
        print("[VFXBurst] Update running - not pinching");
      }
      return;
    }
    
    print("[VFXBurst] Update running - pinching with " + this.lastHandType + " hand");
    
    // TEMPORARY: Bypass collision check for testing
    print("[VFXBurst] TEMPORARY: Bypassing collision check for testing");
    
    // Check if hand is colliding with the target (if assigned)
    if (this.collisionTarget) {
      this.isHandColliding = this.isHandCollidingWithTarget();
      print("[VFXBurst] Hand colliding with target: " + this.isHandColliding);
      
      // TEMPORARILY DISABLED: Only proceed if hand is colliding with the target
      // if (!this.isHandColliding) {
      //   this.vfxObject.enabled = false;
      //   print("[VFXBurst] VFX disabled - hand not colliding with target");
      //   return;
      // } else {
      //   print("[VFXBurst] VFX should appear - hand is colliding with target");
      // }
      print("[VFXBurst] TEMPORARILY: Ignoring collision check - VFX will appear when pinching");
    } else {
      print("[VFXBurst] No collision target - VFX will appear when pinching");
    }
    
    const trackedHand = this.handInputData.getHand(this.lastHandType);
    if (!trackedHand || !trackedHand.isTracked()) return;
    const thumbTip = trackedHand.thumbTip;
    const indexTip = trackedHand.indexTip;
    if (!thumbTip || !indexTip) return;
    const thumbPosition = thumbTip.position;
    const indexPosition = indexTip.position;
    const pinchPosition = new vec3(
      (thumbPosition.x + indexPosition.x) * 0.5,
      (thumbPosition.y + indexPosition.y) * 0.5,
      (thumbPosition.z + indexPosition.z) * 0.5
    );
    // Only burst if the pinch position has moved since last frame
    if (
      !this.lastPinchPosition ||
      !this.vec3Equals(this.lastPinchPosition, pinchPosition)
    ) {
      print("[VFXBurst] Bursting VFX at position: " + pinchPosition);
      this.burstAtPosition(pinchPosition);
      this.lastPinchPosition = new vec3(pinchPosition.x, pinchPosition.y, pinchPosition.z);
    } else {
      print("[VFXBurst] Pinch position hasn't moved, skipping burst");
    }
  }

  private burstAtPosition(pinchPosition: vec3) {
    const finalPosition = new vec3(
      pinchPosition.x + this.positionOffset.x,
      pinchPosition.y + this.positionOffset.y,
      pinchPosition.z + this.positionOffset.z
    );
    print("[VFXBurst] Setting VFX position to: " + finalPosition);
    this.vfxObject.getTransform().setWorldPosition(finalPosition);
    this.vfxObject.enabled = false; // Reset to allow burst
    this.vfxObject.enabled = true;
    print("[VFXBurst] VFX enabled: " + this.vfxObject.enabled);
  }

  private setupColliderEvents() {
    if (!this.colliderComponent) return;

    this.colliderComponent.onOverlapEnter.add((e) => {
      const overlap = e.overlap;
      print("[VFXBurst] OverlapEnter detected with: " + overlap.collider.getSceneObject().name);
      // Check if the overlapping object is a hand (we'll use a simple check)
      if (this.isHandOverlapping(overlap.collider.getSceneObject())) {
        print("[VFXBurst] Hand entered collision target");
        this.isHandColliding = true;
      }
    });

    this.colliderComponent.onOverlapStay.add((e) => {
      const overlap = e.overlap;
      if (this.isHandOverlapping(overlap.collider.getSceneObject())) {
        this.isHandColliding = true;
      }
    });

    this.colliderComponent.onOverlapExit.add((e) => {
      const overlap = e.overlap;
      if (this.isHandOverlapping(overlap.collider.getSceneObject())) {
        print("[VFXBurst] Hand exited collision target");
        this.isHandColliding = false;
        this.vfxObject.enabled = false;
      }
    });
  }

  private isHandOverlapping(collidingObject: SceneObject): boolean {
    // Check if we're pinching (anywhere) and the object is close to our hand
    if (!this.isPinching || !this.lastHandType) {
      print("[VFXBurst] Not pinching or no hand type");
      return false;
    }
    
    const trackedHand = this.handInputData.getHand(this.lastHandType);
    if (!trackedHand || !trackedHand.isTracked()) {
      print("[VFXBurst] Hand not tracked");
      return false;
    }
    
    const indexTip = trackedHand.indexTip;
    if (!indexTip) {
      print("[VFXBurst] No index tip");
      return false;
    }
    
    const handPosition = indexTip.position;
    const objectPosition = collidingObject.getTransform().getWorldPosition();
    const distance = handPosition.sub(objectPosition).length;
    
    print("[VFXBurst] Hand position: " + handPosition + ", Object position: " + objectPosition + ", Distance: " + distance);
    
    // If the object is very close to our hand, consider it a hand overlap
    const isClose = distance < 0.5; // 0.5 units close to hand
    print("[VFXBurst] Is close to hand: " + isClose);
    return isClose;
  }

  private isHandCollidingWithTarget(): boolean {
    if (!this.isPinching || !this.lastHandType || !this.collisionTarget) return false;
    
    const trackedHand = this.handInputData.getHand(this.lastHandType);
    if (!trackedHand || !trackedHand.isTracked()) return false;
    
    const indexTip = trackedHand.indexTip;
    if (!indexTip) return false;
    
    const handPosition = indexTip.position;
    const targetPosition = this.collisionTarget.getTransform().getWorldPosition();
    const distance = handPosition.sub(targetPosition).length;
    
    // Use a reasonable detection range for collision
    const collisionRange = 1.0; // 1 unit radius around the target
    
    print("[VFXBurst] Collision check - Hand: " + handPosition + ", Target: " + targetPosition + ", Distance: " + distance + "/" + collisionRange);
    
    return distance <= collisionRange;
  }

  private vec3Equals(a: vec3, b: vec3, epsilon: number = 0.0001): boolean {
    return (
      Math.abs(a.x - b.x) < epsilon &&
      Math.abs(a.y - b.y) < epsilon &&
      Math.abs(a.z - b.z) < epsilon
    );
  }
} 
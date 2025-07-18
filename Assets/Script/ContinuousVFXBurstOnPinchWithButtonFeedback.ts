import { PinchDetector, PinchDetectionSelection } from "SpectaclesInteractionKit/Providers/HandInputData/GestureProvider/PinchDetection/PinchDetector";
import { HandInputData } from "SpectaclesInteractionKit/Providers/HandInputData/HandInputData";
import { HandType } from "SpectaclesInteractionKit/Providers/HandInputData/HandType";
import { setTimeout, clearTimeout } from "SpectaclesInteractionKit/Utils/FunctionTimingUtils";
import { EnhancedButtonFeedback } from "./EnhancedButtonFeedback";

/**
 * ContinuousVFXBurstOnPinchWithButtonFeedback
 *
 * While the user is pinching, moves and enables a VFX SceneObject at the finger position, repeatedly re-enabling it for a burst effect. Disables it when not pinching.
 * Only active when the assigned EnhancedButtonFeedback script has swapped to the swapMaterial.
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
  @hint("EnhancedButtonFeedback script to monitor for material swap")
  buttonFeedback: EnhancedButtonFeedback;

  private pinchDetectors: PinchDetector[] = [];
  private handInputData: HandInputData;
  private isPinching: boolean = false;
  private lastHandType: HandType = null;
  private lastPinchPosition: vec3 = null;

  onAwake() {
    this.createEvent("OnStartEvent").bind(() => {
      this.onStart();
    });
    this.createEvent("UpdateEvent").bind(() => {
      this.onUpdate();
    });
  }

  onStart() {
    if (!this.vfxObject) {
      print("[ContinuousVFXBurstOnPinchWithButtonFeedback] Please assign a vfxObject SceneObject.");
      return;
    }
    this.vfxObject.enabled = false;
    this.handInputData = HandInputData.getInstance();
    const hands: HandType[] =
      this.hand === "either" ? ["left", "right"] : [this.hand as HandType];
    for (const handType of hands) {
      const detector = new PinchDetector({
        pinchDetectionSelection: PinchDetectionSelection.LensCoreML,
        handType,
        isTracked: () => true,
        onHandLost: { add: () => {}, remove: () => {} },
      } as any);
      detector.onPinchDown.add(() => this.startPinch(handType));
      detector.onPinchUp.add(() => this.stopPinch());
      detector.onPinchCancel.add(() => this.stopPinch());
      this.pinchDetectors.push(detector);
    }
  }

  private startPinch(handType: HandType) {
    this.isPinching = true;
    this.lastHandType = handType;
    this.lastPinchPosition = null; // Reset so first move always triggers
  }

  private stopPinch() {
    this.isPinching = false;
    this.lastPinchPosition = null;
    this.vfxObject.enabled = false;
  }

  onUpdate() {
    if (!this.isPinching || !this.lastHandType) return;
    // Only run if buttonFeedback is assigned and is in swapped state
    if (
      this.buttonFeedback &&
      this.buttonFeedback.meshIdleMaterial !== this.buttonFeedback.swapMaterial
    ) {
      this.vfxObject.enabled = false;
      return;
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
      this.burstAtPosition(pinchPosition);
      this.lastPinchPosition = new vec3(pinchPosition.x, pinchPosition.y, pinchPosition.z);
    }
  }

  private burstAtPosition(pinchPosition: vec3) {
    const finalPosition = new vec3(
      pinchPosition.x + this.positionOffset.x,
      pinchPosition.y + this.positionOffset.y,
      pinchPosition.z + this.positionOffset.z
    );
    this.vfxObject.getTransform().setWorldPosition(finalPosition);
    this.vfxObject.enabled = false; // Reset to allow burst
    this.vfxObject.enabled = true;
  }

  private vec3Equals(a: vec3, b: vec3, epsilon: number = 0.0001): boolean {
    return (
      Math.abs(a.x - b.x) < epsilon &&
      Math.abs(a.y - b.y) < epsilon &&
      Math.abs(a.z - b.z) < epsilon
    );
  }
} 
import { PinchDetector, PinchDetectionSelection } from "SpectaclesInteractionKit/Providers/HandInputData/GestureProvider/PinchDetection/PinchDetector"
import { HandType } from "SpectaclesInteractionKit/Providers/HandInputData/HandType"
import { setTimeout, clearTimeout } from "SpectaclesInteractionKit/Utils/FunctionTimingUtils"
import Event from "SpectaclesInteractionKit/Utils/Event"
import TrackedHand from "SpectaclesInteractionKit/Providers/HandInputData/TrackedHand"
import { HandInputData } from "SpectaclesInteractionKit/Providers/HandInputData/HandInputData"

@component
export class SpawnParticleOnPinch extends BaseScriptComponent {
  @input
  @hint("SceneObject with the particle effect (e.g., Sparkles)")
  particleObject: SceneObject = null

  @input
  @hint("Which hand to listen for (left, right, or both)")
  hand: string = "either" // "left", "right", or "either"

  @input
  @hint("How long to show the particle effect (seconds)")
  duration: number = 0.5

  @input
  @hint("Offset from pinch position (in world units)")
  positionOffset: vec3 = new vec3(0, 0, 0)

  private pinchDetectors: PinchDetector[] = []
  private timeoutId: any = null
  private handInputData: HandInputData

  onAwake() {
    if (!this.particleObject) {
      print("[SpawnParticleOnPinch] Please assign a particleObject SceneObject.")
      return
    }
    this.particleObject.enabled = false

    // Get the hand input data to access tracked hands
    this.handInputData = HandInputData.getInstance()

    const hands: HandType[] =
      this.hand === "either"
        ? ["left", "right"]
        : [this.hand as HandType]

    for (const handType of hands) {
      // Use a dummy Event for onHandLost to satisfy PublicApi<void>
      const dummyEvent = new Event();
      const detector = new PinchDetector({
        pinchDetectionSelection: PinchDetectionSelection.LensCoreML,
        handType,
        isTracked: () => true,
        onHandLost: dummyEvent.publicApi(),
      } as any);
      detector.onPinchDown.add(() => this.spawnParticle(handType))
      this.pinchDetectors.push(detector)
    }
  }

  spawnParticle(handType: HandType) {
    if (!this.particleObject) return

    // Get the tracked hand for this hand type
    const trackedHand = this.handInputData.getHand(handType)
    if (!trackedHand || !trackedHand.isTracked()) {
      // Fallback: just enable the particle at its current position
      this.particleObject.enabled = true
    } else {
      // Calculate pinch position as midpoint between thumb tip and index tip
      const thumbTip = trackedHand.thumbTip
      const indexTip = trackedHand.indexTip
      
      if (thumbTip && indexTip) {
        const thumbPosition = thumbTip.position
        const indexPosition = indexTip.position
        
        // Calculate midpoint between thumb and index tip
        const pinchPosition = new vec3(
          (thumbPosition.x + indexPosition.x) * 0.5,
          (thumbPosition.y + indexPosition.y) * 0.5,
          (thumbPosition.z + indexPosition.z) * 0.5
        )
        
        // Apply offset
        const finalPosition = new vec3(
          pinchPosition.x + this.positionOffset.x,
          pinchPosition.y + this.positionOffset.y,
          pinchPosition.z + this.positionOffset.z
        )
        
        // Move particle object to pinch position
        this.particleObject.getTransform().setWorldPosition(finalPosition)
        this.particleObject.enabled = true
      } else {
        // Fallback: just enable the particle at its current position
        this.particleObject.enabled = true
      }
    }

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId)
    }
    this.timeoutId = setTimeout(() => {
      this.particleObject.enabled = false
      this.timeoutId = null
    }, this.duration * 1000)
  }
} 
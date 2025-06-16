//import { VectorUtils } from "./VectorUtils";
import { HandInputData } from '../SpectaclesInteractionKit/Providers/HandInputData/HandInputData';
import { HandType } from "../SpectaclesInteractionKit/Providers/HandInputData/HandType";
import TrackedHand from "../SpectaclesInteractionKit/Providers/HandInputData/TrackedHand"
import WorldCameraFinderProvider from "../SpectaclesInteractionKit/Providers/CameraProvider/WorldCameraFinderProvider"

@component
export class HandFollower extends BaseScriptComponent {
    @input private handFollowObject: SceneObject;
    @input private distanceToHand: number = 5
    
    private handProvider: HandInputData = HandInputData.getInstance()
    private leftHand = this.handProvider.getHand("left" as HandType);
    private rightHand = this.handProvider.getHand("right" as HandType);
    private camera = WorldCameraFinderProvider.getInstance();
    private noTrackCount = 0;
    
    onAwake() {
        this.createEvent("UpdateEvent").bind(() => {
            this.update();
        })
        this.handFollowObject.enabled = false;
    }
    
    update() {
        if (this.tryShowHandMenu(this.leftHand) || this.tryShowHandMenu(this.rightHand))
        {
            this.handFollowObject.enabled = true;
            this.noTrackCount = 0;
        }
        else
        {
            this.noTrackCount++;
            if(this.noTrackCount > 10)
            {
                this.handFollowObject.enabled = false;
            }
        }
    }

   private tryShowHandMenu(hand: TrackedHand): boolean {
        if (!hand.isTracked()) {
            return false;
        }

        const currentPosition = hand.pinkyKnuckle.position;
        if (currentPosition == null) {
            return false;
        }

        const knuckleForward = hand.indexKnuckle.forward;
        const cameraForward = this.camera.getTransform().forward;
        const angle = Math.acos(knuckleForward.dot(cameraForward) / (knuckleForward.length * cameraForward.length)) * 180.0 / Math.PI;

        if (Math.abs(angle) > 20) {
            return false;
        }

        // === Positioning the button ===
        // Hardcoded left offset in world space
        const offsetDirection = new vec3(.2, -.2, 0); // world left
        const offset = offsetDirection.uniformScale(this.distanceToHand);

        const finalPosition = currentPosition.add(offset);

        // Apply rotation and position
        this.handFollowObject.getTransform().setWorldRotation(hand.indexKnuckle.rotation);
        this.handFollowObject.getTransform().setWorldPosition(finalPosition);

        // Debug
        print("Hand Type: " + hand.handType + ", Placing at: " + finalPosition.toString());

        return true;
    }
}
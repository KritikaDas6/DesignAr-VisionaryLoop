import { VectorUtils } from "./VectorUtils";
import { HandInputData } from 'SpectaclesInteractionKit.lspkg/Providers/HandInputData/HandInputData';
import { HandType } from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/HandType";
import TrackedHand from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/TrackedHand"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"

@component
export class HandFollowerWithAngleRange extends BaseScriptComponent {
    @input private handFollowObject: SceneObject;
    @input private distanceToHand: number = 5;
    
    // Position offset parameters
    @input private positionOffsetX: number = 0;
    @input private positionOffsetY: number = 0;
    @input private positionOffsetZ: number = 0;
    
    // Rotation offset parameters (in degrees)
    @input private rotationOffsetX: number = 130;
    @input private rotationOffsetY: number = 0;
    @input private rotationOffsetZ: number = 180;

    // Hand angle range parameters (in degrees)
    @input private minHandAngle: number = -20;
    @input private maxHandAngle: number = 20;

    private handProvider = HandInputData.getInstance();
    private leftHand = this.handProvider.getHand("left" as HandType);
    private rightHand = this.handProvider.getHand("right" as HandType);
    private camera = WorldCameraFinderProvider.getInstance();
    private noTrackCount = 0;

    onAwake() {
        this.createEvent("UpdateEvent").bind(() => {
            this.update();
        });
        this.handFollowObject.enabled = false;
    }

    update() {
        if (this.tryShowHandMenu(this.leftHand) || this.tryShowHandMenu(this.rightHand)) {
            this.handFollowObject.enabled = true;
            this.noTrackCount = 0;
        } else {
            this.noTrackCount++;
            if (this.noTrackCount > 10) {
                this.handFollowObject.enabled = false;
            }
        }
    }

    private tryShowHandMenu(hand: TrackedHand): boolean {
        if (!hand.isTracked()) {
            return false;
        }

        const currentPosition = hand.pinkyKnuckle.position;
        if (currentPosition != null) {
            const knuckleForward = hand.indexKnuckle.forward;
            const cameraForward = this.camera.getTransform().forward;
            const angle = Math.acos(knuckleForward.dot(cameraForward) / (knuckleForward.length * cameraForward.length)) * 180.0 / Math.PI;
            // Use the configurable angle range
            if (angle < this.minHandAngle || angle > this.maxHandAngle) {
                return false;
            }

            const directionNextToKnuckle = hand.handType == "left"
                ? hand.indexKnuckle.right
                : hand.indexKnuckle.right.mult(VectorUtils.scalar3(-6));

            const targetPosition = currentPosition.add(directionNextToKnuckle.mult(VectorUtils.scalar3(this.distanceToHand)));
            
            // Apply position offsets
            const finalPosition = targetPosition.add(new vec3(this.positionOffsetX, this.positionOffsetY, this.positionOffsetZ));
            
            const transform = this.handFollowObject.getTransform();
            transform.setWorldPosition(finalPosition);

            // === Manual Rotation with editable offsets ===
            const rotation = quat.fromEulerAngles(
                this.degToRad(this.rotationOffsetX),   // Pitch
                this.degToRad(this.rotationOffsetY),   // Yaw
                this.degToRad(this.rotationOffsetZ)    // Roll
            );
            transform.setWorldRotation(rotation);
            return true;
        }

        return false;
    }

    private degToRad(degrees: number): number {
        return degrees * Math.PI / 180;
    }
} 
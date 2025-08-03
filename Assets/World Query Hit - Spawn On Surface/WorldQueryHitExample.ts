// Import necessary modules
const WorldQueryModule = require("LensStudio:WorldQueryModule");
const SIK = require("SpectaclesInteractionKit/SIK").SIK;
const InteractorTriggerType = require("SpectaclesInteractionKit/Core/Interactor/Interactor").InteractorTriggerType;

const EPSILON = 0.01;

@component
export class NewScript extends BaseScriptComponent {

    private primaryInteractor;
    private hitTestSession: HitTestSession;
    private transform: Transform;
    private isPlaced: boolean = false;

    @input indexToSpawn: number;
    @input targetObject: SceneObject;
    @input objectsToSpawn: SceneObject[];
    @input filterEnabled: boolean;

    onAwake() {
        this.hitTestSession = this.createHitTestSession(this.filterEnabled);

        if (!this.sceneObject) {
            print("Please set Target Object input");
            return;
        }

        this.transform = this.targetObject.getTransform();
        this.targetObject.enabled = false;
        this.setObjectEnabled(this.indexToSpawn);

        this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
    }

    createHitTestSession(filterEnabled) {
        let options = HitTestSessionOptions.create();
        options.filter = filterEnabled;
        return WorldQueryModule.createHitTestSessionWithOptions(options);
    }

    onHitTestResult(results) {
        if (this.isPlaced || results === null) {
            this.targetObject.enabled = false;
            return;
        }

        this.targetObject.enabled = true;

        const hitPosition = results.position;
        const hitNormal = results.normal;

        let lookDirection;
        if (1 - Math.abs(hitNormal.normalize().dot(vec3.up())) < EPSILON) {
            lookDirection = vec3.forward();
        } else {
            lookDirection = hitNormal.cross(vec3.up());
        }

        const toRotation = quat.lookAt(lookDirection, hitNormal);

        this.targetObject.getTransform().setWorldPosition(hitPosition);
        this.targetObject.getTransform().setWorldRotation(toRotation);

        // If the trigger ended (tap/click released), lock in place
        if (
            this.primaryInteractor.previousTrigger !== InteractorTriggerType.None &&
            this.primaryInteractor.currentTrigger === InteractorTriggerType.None
        ) {
            this.isPlaced = true; // ✅ Lock object
        }
    }

    onUpdate() {
        if (this.isPlaced) return;

        this.primaryInteractor = SIK.InteractionManager.getTargetingInteractors().shift();

        if (
            this.primaryInteractor &&
            this.primaryInteractor.isActive() &&
            this.primaryInteractor.isTargeting()
        ) {
            const rayStart = new vec3(
                this.primaryInteractor.startPoint.x,
                this.primaryInteractor.startPoint.y,
                this.primaryInteractor.startPoint.z + 30
            );
            const rayEnd = this.primaryInteractor.endPoint;

            this.hitTestSession.hitTest(rayStart, rayEnd, this.onHitTestResult.bind(this));
        } else {
            this.targetObject.enabled = false;
        }
    }

    setObjectEnabled(i) {
        for (let j = 0; j < this.objectsToSpawn.length; j++) {
            this.objectsToSpawn[j].enabled = j === i;
        }
    }

    setObjectIndex(i) {
        this.indexToSpawn = i;
    }
}

/**
 * WorldQueryHit_Modified.ts
 * 
 * Handles hit test logic and surface following for ProjectionController.
 * Extracted from WorldQueryHit_Modified to separate concerns.
 */

const WorldQueryModule = require("LensStudio:WorldQueryModule");

export interface WorldQueryHit_ModifiedCallbacks {
    onSurfaceHit?: (position: vec3, normal: vec3) => void;
    onNoSurfaceHit?: () => void;
}

export interface WorldQueryHit_ModifiedState {
    isPlaced: boolean;
    isClicked: boolean;
    resetCooldownTime: number;
    ignoreNextHitTest: boolean;
    allowAutoPositioning: boolean;
    lastPosition: vec3 | null;
    lastRotation: quat | null;
}

export class WorldQueryHit_Modified {
    private hitTestSession: HitTestSession;
    private camera: Camera;
    private targetObject: SceneObject;
    private transform: Transform;
    private filterEnabled: boolean;
    private floorRotationZ: number;
    private ceilingRotationZ: number;
    private callbacks: WorldQueryHit_ModifiedCallbacks;
    private state: WorldQueryHit_ModifiedState;
    private log: any; // Logger instance

    constructor(
        camera: Camera,
        targetObject: SceneObject,
        filterEnabled: boolean,
        floorRotationZ: number,
        ceilingRotationZ: number,
        callbacks: WorldQueryHit_ModifiedCallbacks,
        state: WorldQueryHit_ModifiedState,
        log: any
    ) {
        this.camera = camera;
        this.targetObject = targetObject;
        this.transform = targetObject.getTransform();
        this.filterEnabled = filterEnabled;
        this.floorRotationZ = floorRotationZ;
        this.ceilingRotationZ = ceilingRotationZ;
        this.callbacks = callbacks;
        this.state = state;
        this.log = log;
        
        this.hitTestSession = this.createHitTestSession(filterEnabled);
    }

    /**
     * Create hit test session
     */
    private createHitTestSession(filterEnabled: boolean): HitTestSession {
        let options = HitTestSessionOptions.create();
        options.filter = filterEnabled;
        return WorldQueryModule.createHitTestSessionWithOptions(options);
    }

    /**
     * Handle hit test result
     */
    public onHitTestResult(results: any): void {
        this.log.debug("WorldQueryHit_Modified: onHitTestResult called - results: " + (results ? "HIT" : "null") + 
            ", allowAutoPositioning: " + this.state.allowAutoPositioning + 
            ", resetCooldownTime: " + this.state.resetCooldownTime + 
            ", ignoreNextHitTest: " + this.state.ignoreNextHitTest + 
            ", isPlaced: " + this.state.isPlaced + 
            ", isClicked: " + this.state.isClicked);
        
        // If object is placed and locked, stop repositioning
        if (this.state.isPlaced && this.state.isClicked) {
            this.log.debug("WorldQueryHit_Modified: Object is locked to surface - ignoring hit test results");
            return;
        }
        
        if (this.state.resetCooldownTime > 0 || this.state.ignoreNextHitTest) {
            if (this.state.ignoreNextHitTest) {
                this.state.ignoreNextHitTest = false;
            }
            this.log.debug("WorldQueryHit_Modified: onHitTestResult - ignoring due to cooldown or ignore flag");
            return;
        }
        
        if (results === null) {
            this.log.debug("WorldQueryHit_Modified: onHitTestResult - no surface hit (results is null)");
            if (this.callbacks.onNoSurfaceHit) {
                this.callbacks.onNoSurfaceHit();
            }
            return;
        }
        
        const hitPosition = results.position;
        const hitNormal = results.normal;
        
        this.log.debug("WorldQueryHit_Modified: ✓ SURFACE HIT! Position: (" + 
            hitPosition.x.toFixed(2) + ", " + hitPosition.y.toFixed(2) + ", " + hitPosition.z.toFixed(2) + 
            "), Normal: (" + hitNormal.x.toFixed(2) + ", " + hitNormal.y.toFixed(2) + ", " + hitNormal.z.toFixed(2) + ")");
        
        // Calculate rotation
        const toRotation = this.calculateRotation(hitNormal);
        
        // Position the object on the surface
        this.transform.setWorldPosition(hitPosition);
        this.transform.setWorldRotation(toRotation);
        
        // Store position/rotation for immediate placement when button is clicked
        this.state.lastPosition = hitPosition;
        this.state.lastRotation = toRotation;
        
        // Preview mode - object follows surfaces but doesn't lock
        if (!this.state.isClicked || !this.state.isPlaced) {
            this.log.debug("WorldQueryHit_Modified: [DEBUG] Object previewing at: (" + 
                hitPosition.x.toFixed(2) + ", " + hitPosition.y.toFixed(2) + ", " + hitPosition.z.toFixed(2) + ")");
        }
        
        if (this.callbacks.onSurfaceHit) {
            this.callbacks.onSurfaceHit(hitPosition, hitNormal);
        }
    }

    /**
     * Calculate rotation based on surface normal
     */
    private calculateRotation(hitNormal: vec3): quat {
        const upDot = hitNormal.dot(vec3.up());
        const cameraTransform = this.camera.getTransform();
        const cameraDirection = cameraTransform.back;
        
        if (upDot > 0.9) {
            return this.createFloorRotation(cameraDirection);
        } else if (upDot < -0.9) {
            return this.createCeilingRotation(cameraDirection);
        } else {
            return quat.lookAt(hitNormal, vec3.up());
        }
    }

    /**
     * Create rotation for floor surfaces
     */
    private createFloorRotation(cameraDirection: vec3): quat {
        const forwardDirection = new vec3(cameraDirection.x, 0, cameraDirection.z).normalize();
        const forwardRotation = quat.lookAt(forwardDirection, vec3.up());
        const floorRotationQuat = this.createRotationFromZ(this.floorRotationZ);
        return forwardRotation.multiply(floorRotationQuat);
    }

    /**
     * Create rotation for ceiling surfaces
     */
    private createCeilingRotation(cameraDirection: vec3): quat {
        const forwardDirection = new vec3(cameraDirection.x, 0, cameraDirection.z).normalize();
        const forwardRotation = quat.lookAt(forwardDirection, vec3.up());
        const ceilingRotationQuat = this.createRotationFromZ(this.ceilingRotationZ);
        return forwardRotation.multiply(ceilingRotationQuat);
    }

    /**
     * Create rotation from Z angle
     */
    private createRotationFromZ(rotationZ: number): quat {
        const zRad = rotationZ * Math.PI / 180;
        return new quat(0, 0, Math.sin(zRad / 2), Math.cos(zRad / 2));
    }

    /**
     * Perform hit test (called from update loop)
     */
    public performHitTest(): void {
        if (!this.hitTestSession) return;
        
        if (this.state.resetCooldownTime > 0 || (this.state.isPlaced && this.state.isClicked)) {
            return; // Skip hit tests if on cooldown or object is locked
        }
        
        const cameraTransform = this.camera.getTransform();
        const cameraPosition = cameraTransform.getWorldPosition();
        const cameraDirection = cameraTransform.back;
        
        const rayStart = cameraPosition;
        const rayEnd = new vec3(
            cameraPosition.x + cameraDirection.x * 1000,
            cameraPosition.y + cameraDirection.y * 1000,
            cameraPosition.z + cameraDirection.z * 1000
        );
        
        this.hitTestSession.hitTest(rayStart, rayEnd, this.onHitTestResult.bind(this));
    }

    /**
     * Get hit test session
     */
    public getHitTestSession(): HitTestSession {
        return this.hitTestSession;
    }

    /**
     * Update reset cooldown
     */
    public updateCooldown(deltaTime: number): void {
        if (this.state.resetCooldownTime > 0) {
            this.state.resetCooldownTime -= deltaTime;
            if (this.state.resetCooldownTime <= 0) {
                this.state.resetCooldownTime = 0;
            }
        }
    }
}


/**
 * ContainerFrameEdgeAttach.ts
 * 
 * Keeps an object positioned at a specific distance from a ContainerFrameLocker edge.
 * The object will automatically update its position when the frame scales or moves.
 */

import { ContainerFrame } from "./ContainerFrameLocker";

@component
export class ContainerFrameEdgeAttach extends BaseScriptComponent {
    
    @ui.group_start("Container Frame")
    @input
    @hint("The ContainerFrameLocker component to attach to")
    containerFrame: ContainerFrame;
    @ui.group_end
    
    @ui.group_start("Target Object")
    @input
    @hint("The object to position relative to the frame edge")
    targetObject: SceneObject;
    @ui.group_end
    
    @ui.group_start("Position Settings")
    @input
    @hint("Which edge to attach to: 'top', 'bottom', 'left', 'right'")
    edge: string = "top";
    
    @input
    @hint("Distance from the edge in world units (cm)")
    distanceFromEdge: number = 2.0;
    
    @input
    @hint("Offset along the edge (0 = center, positive = right/up, negative = left/down)")
    edgeOffset: number = 0.0;
    
    @input
    @hint("Offset in Z direction (depth)")
    zOffset: number = 0.0;
    
    @input
    @hint("If true, updates position every frame (for testing - less efficient)")
    updateEveryFrame: boolean = false;
    @ui.group_end
    
    @ui.group_start("Button Handling")
    @input
    @hint("Array of buttons attached to the ContainerFrameLocker (optional)")
    attachedButtons: SceneObject[] = [];
    
    @input
    @hint("If true, buttons will be positioned relative to the frame edge as well")
    positionButtons: boolean = false;
    @ui.group_end
    
    private targetTransform: Transform;
    private frameTransform: Transform;
    private lastFrameSize: vec2 = vec2.zero();
    private lastFramePosition: vec3 = vec3.zero();
    private lastFrameRotation: quat = quat.quatIdentity();
    private lastDistanceFromEdge: number = -1;
    private lastEdgeOffset: number = -1;
    private lastZOffset: number = -1;
    private lastEdge: string = "";
    
    onAwake() {
        if (!this.targetObject) {
            print("ContainerFrameEdgeAttach: WARNING - targetObject not assigned!");
            return;
        }
        
        this.targetTransform = this.targetObject.getTransform();
        
        // Get frame transform from the ContainerFrame's scene object
        if (this.containerFrame) {
            // Get the scene object that has the ContainerFrame component
            // The ContainerFrame's parent is the scene object it's attached to
            const frameSceneObject = this.containerFrame.getSceneObject();
            if (frameSceneObject) {
                this.frameTransform = frameSceneObject.getTransform();
                print("ContainerFrameEdgeAttach: Got frame transform from scene object: " + frameSceneObject.name);
            } else {
                print("ContainerFrameEdgeAttach: WARNING - Could not get scene object from containerFrame!");
                return;
            }
        } else {
            print("ContainerFrameEdgeAttach: WARNING - containerFrame not assigned!");
            return;
        }
        
        this.createEvent("OnStartEvent").bind(this.onStart.bind(this));
        this.createEvent("UpdateEvent").bind(this.onUpdate.bind(this));
    }
    
    private onStart() {
        // Initialize last values
        this.lastDistanceFromEdge = this.distanceFromEdge;
        this.lastEdgeOffset = this.edgeOffset;
        this.lastZOffset = this.zOffset;
        this.lastEdge = this.edge;
        
        // Subscribe to frame scaling events if available
        if (this.containerFrame && this.containerFrame.onScalingUpdateEvent) {
            this.containerFrame.onScalingUpdateEvent.add(() => {
                this.updatePosition();
            });
        }
        
        // Initial position update
        this.updatePosition();
    }
    
    private onUpdate() {
        if (!this.containerFrame || !this.targetObject || !this.frameTransform) return;
        
        // If updateEveryFrame is enabled, update every frame (for testing)
        if (this.updateEveryFrame) {
            this.updatePosition();
            return;
        }
        
        // Check if input values have changed
        const distanceChanged = Math.abs(this.distanceFromEdge - this.lastDistanceFromEdge) > 0.001;
        const edgeOffsetChanged = Math.abs(this.edgeOffset - this.lastEdgeOffset) > 0.001;
        const zOffsetChanged = Math.abs(this.zOffset - this.lastZOffset) > 0.001;
        const edgeChanged = this.edge !== this.lastEdge;
        
        // Check if frame has moved, rotated, or scaled
        const currentFrame = this.containerFrame;
        const currentSize = currentFrame.totalInnerSize;
        const currentPosition = this.frameTransform.getWorldPosition();
        const currentRotation = this.frameTransform.getWorldRotation();
        
        // Check if we need to update position
        const sizeChanged = !currentSize.equal(this.lastFrameSize);
        const positionDelta = currentPosition.sub(this.lastFramePosition);
        const positionChanged = positionDelta.length > 0.01;
        
        // Compare quaternions by checking if dot product is close to 1 (same rotation)
        const rotationDot = currentRotation.dot(this.lastFrameRotation);
        const rotationChanged = Math.abs(rotationDot - 1.0) > 0.001;
        
        // Update if any value changed
        if (sizeChanged || positionChanged || rotationChanged || 
            distanceChanged || edgeOffsetChanged || zOffsetChanged || edgeChanged) {
            this.updatePosition();
            this.lastFrameSize = new vec2(currentSize.x, currentSize.y);
            this.lastFramePosition = new vec3(currentPosition.x, currentPosition.y, currentPosition.z);
            this.lastFrameRotation = new quat(currentRotation.x, currentRotation.y, currentRotation.z, currentRotation.w);
            this.lastDistanceFromEdge = this.distanceFromEdge;
            this.lastEdgeOffset = this.edgeOffset;
            this.lastZOffset = this.zOffset;
            this.lastEdge = this.edge;
        }
    }
    
    /**
     * Update the position of the target object based on the frame edge
     */
    private updatePosition() {
        if (!this.containerFrame || !this.targetObject) return;
        
        const frame = this.containerFrame;
        const frameTransform = this.frameTransform;
        
        // Get frame size - use innerSize directly from ContainerFrame
        // totalInnerSize = innerSize + constantPadding
        // Total frame size = innerSize + constantPadding + border * 2
        const innerSize = frame.innerSize;
        const constantPadding = frame.constantPadding;
        const border = frame.border;
        const totalWidth = innerSize.x + constantPadding.x + border * 2;
        const totalHeight = innerSize.y + constantPadding.y + border * 2;
        
        // Get frame's world position and rotation
        const frameWorldPos = frameTransform.getWorldPosition();
        const frameWorldRot = frameTransform.getWorldRotation();
        
        // Calculate edge position in local frame space
        let edgeLocalPos = vec3.zero();
        
        switch (this.edge.toLowerCase()) {
            case "top":
                edgeLocalPos = new vec3(this.edgeOffset, totalHeight / 2 + this.distanceFromEdge, this.zOffset);
                break;
            case "bottom":
                edgeLocalPos = new vec3(this.edgeOffset, -totalHeight / 2 - this.distanceFromEdge, this.zOffset);
                break;
            case "left":
                edgeLocalPos = new vec3(-totalWidth / 2 - this.distanceFromEdge, this.edgeOffset, this.zOffset);
                break;
            case "right":
                edgeLocalPos = new vec3(totalWidth / 2 + this.distanceFromEdge, this.edgeOffset, this.zOffset);
                break;
            default:
                print("ContainerFrameEdgeAttach: Invalid edge '" + this.edge + "'. Use 'top', 'bottom', 'left', or 'right'");
                return;
        }
        
        // Convert local position to world position
        // Get frame's forward, right, and up vectors in world space
        const frameForward = frameWorldRot.multiplyVec3(vec3.forward());
        const frameRight = frameWorldRot.multiplyVec3(vec3.right());
        const frameUp = frameWorldRot.multiplyVec3(vec3.up());
        
        // Calculate world position
        const edgeWorldPos = frameWorldPos
            .add(frameRight.uniformScale(edgeLocalPos.x))
            .add(frameUp.uniformScale(edgeLocalPos.y))
            .add(frameForward.uniformScale(edgeLocalPos.z));
        
        // Set target object position
        this.targetTransform.setWorldPosition(edgeWorldPos);
        
        // Update button positions if enabled
        if (this.positionButtons && this.attachedButtons.length > 0) {
            this.updateButtonPositions();
        }
    }
    
    /**
     * Update positions of attached buttons
     */
    private updateButtonPositions() {
        if (!this.containerFrame || this.attachedButtons.length === 0) return;
        
        const frame = this.containerFrame;
        const frameTransform = this.frameTransform;
        
        // Get frame size - use innerSize directly from ContainerFrame
        const innerSize = frame.innerSize;
        const constantPadding = frame.constantPadding;
        const border = frame.border;
        const totalWidth = innerSize.x + constantPadding.x + border * 2;
        const totalHeight = innerSize.y + constantPadding.y + border * 2;
        
        // Position buttons along the same edge
        const buttonSpacing = 3.0; // Space between buttons in cm
        const startOffset = -(this.attachedButtons.length - 1) * buttonSpacing / 2;
        
        for (let i = 0; i < this.attachedButtons.length; i++) {
            const button = this.attachedButtons[i];
            if (!button) continue;
            
            const buttonTransform = button.getTransform();
            let buttonLocalPos = vec3.zero();
            
            switch (this.edge.toLowerCase()) {
                case "top":
                    buttonLocalPos = new vec3(
                        startOffset + i * buttonSpacing,
                        totalHeight / 2 + this.distanceFromEdge,
                        this.zOffset
                    );
                    break;
                case "bottom":
                    buttonLocalPos = new vec3(
                        startOffset + i * buttonSpacing,
                        -totalHeight / 2 - this.distanceFromEdge,
                        this.zOffset
                    );
                    break;
                case "left":
                    buttonLocalPos = new vec3(
                        -totalWidth / 2 - this.distanceFromEdge,
                        startOffset + i * buttonSpacing,
                        this.zOffset
                    );
                    break;
                case "right":
                    buttonLocalPos = new vec3(
                        totalWidth / 2 + this.distanceFromEdge,
                        startOffset + i * buttonSpacing,
                        this.zOffset
                    );
                    break;
            }
            
            // Convert to world position
            const frameWorldPos = frameTransform.getWorldPosition();
            const frameWorldRot = frameTransform.getWorldRotation();
            const frameForward = frameWorldRot.multiplyVec3(vec3.forward());
            const frameRight = frameWorldRot.multiplyVec3(vec3.right());
            const frameUp = frameWorldRot.multiplyVec3(vec3.up());
            
            const buttonWorldPos = frameWorldPos
                .add(frameRight.uniformScale(buttonLocalPos.x))
                .add(frameUp.uniformScale(buttonLocalPos.y))
                .add(frameForward.uniformScale(buttonLocalPos.z));
            
            buttonTransform.setWorldPosition(buttonWorldPos);
        }
    }
    
    /**
     * Manually trigger position update (useful for external calls)
     */
    public refreshPosition() {
        this.updatePosition();
    }
    
    /**
     * Set the edge to attach to
     */
    public setEdge(edge: string) {
        this.edge = edge;
        this.updatePosition();
    }
    
    /**
     * Set the distance from the edge
     */
    public setDistanceFromEdge(distance: number) {
        this.distanceFromEdge = distance;
        this.updatePosition();
    }
    
    /**
     * Set the offset along the edge
     */
    public setEdgeOffset(offset: number) {
        this.edgeOffset = offset;
        this.updatePosition();
    }
}


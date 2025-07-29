import { setTimeout, clearTimeout } from "SpectaclesInteractionKit/Utils/FunctionTimingUtils"
import WorldCameraFinderProvider from "SpectaclesInteractionKit/Providers/CameraProvider/WorldCameraFinderProvider"

@component
export class guidescript extends BaseScriptComponent {
  @input
  @hint("The button SceneObject to position at top-left corner")
  buttonObject: SceneObject = null

  @input
  @hint("Distance from camera (in world units)")
  distanceFromCamera: number = 1.0

  @input
  @hint("Corner position: 0=Top-Left, 1=Top-Right, 2=Bottom-Right, 3=Bottom-Left")
  cornerPosition: number = 0

  @input
  @hint("Offset from corner (0-1, where 0,0 is exact corner, 1,1 is center)")
  screenOffset: vec2 = new vec2(0.3, 0.3)

  @input
  @hint("Update position every frame (true) or only when needed (false)")
  updateEveryFrame: boolean = true

  @input
  @hint("Enable debug logging")
  debugMode: boolean = true

  private camera: SceneObject
  private cameraTransform: Transform
  private buttonTransform: Transform
  private updateTimeoutId: any = null
  private frameCount: number = 0

  onAwake() {
    if (this.debugMode) {
      print("[TopLeftButton] Script initialized")
    }

    if (!this.buttonObject) {
      print("[TopLeftButton] ERROR: Please assign a buttonObject SceneObject.")
      return
    }

    if (this.debugMode) {
      print("[TopLeftButton] Button object assigned: " + this.buttonObject.name)
    }

    // Get the camera object
    try {
      this.camera = WorldCameraFinderProvider.getInstance().getComponent().getSceneObject()
      if (!this.camera) {
        print("[TopLeftButton] ERROR: Camera not found.")
        return
      }
    } catch (error) {
      print("[TopLeftButton] ERROR: Failed to get camera: " + error)
      return
    }

    if (this.debugMode) {
      print("[TopLeftButton] Camera found: " + this.camera.name)
    }

    this.cameraTransform = this.camera.getTransform()
    this.buttonTransform = this.buttonObject.getTransform()

    // Make sure button is enabled
    this.buttonObject.enabled = true

    // Set initial position
    this.updateButtonPosition()

    if (this.debugMode) {
      print("[TopLeftButton] Initial position set")
    }

    // Set up continuous updates if needed
    if (this.updateEveryFrame) {
      this.startContinuousUpdate()
    }
  }

  onUpdate() {
    this.frameCount++
    
    if (this.updateEveryFrame) {
      this.updateButtonPosition()
    }

    // Debug info every 60 frames (1 second at 60fps)
    if (this.debugMode && this.frameCount % 60 === 0) {
      this.logDebugInfo()
    }
  }

  private startContinuousUpdate() {
    // Update every 16ms (60 FPS) for smooth positioning
    this.updateTimeoutId = setTimeout(() => {
      this.updateButtonPosition()
      if (this.updateEveryFrame) {
        this.startContinuousUpdate()
      }
    }, 16)
  }

  private updateButtonPosition() {
    if (!this.camera || !this.buttonObject) return

    try {
      // Get camera position and rotation
      const cameraPosition = this.cameraTransform.getWorldPosition()
      const cameraRotation = this.cameraTransform.getWorldRotation()

      // Calculate the top-left corner position in world space
      const topLeftPosition = this.calculateTopLeftPosition(cameraPosition, cameraRotation)

      // Set button position
      this.buttonTransform.setWorldPosition(topLeftPosition)

      // Make button face the camera
      this.buttonTransform.setWorldRotation(cameraRotation)

    } catch (error) {
      if (this.debugMode) {
        print("[TopLeftButton] Error updating position: " + error)
      }
    }
  }

  private calculateTopLeftPosition(cameraPosition: vec3, cameraRotation: quat): vec3 {
    // Get camera forward and right vectors
    const cameraForward = cameraRotation.multiplyVec3(new vec3(0, 0, 1))
    const cameraRight = cameraRotation.multiplyVec3(new vec3(1, 0, 0))
    const cameraUp = cameraRotation.multiplyVec3(new vec3(0, 1, 0))

    // Calculate the corner offset based on corner position
    let horizontalOffset = this.screenOffset.x
    let verticalOffset = this.screenOffset.y

    // Adjust offset direction based on corner position
    switch (this.cornerPosition) {
      case 0: // Top-Left
        horizontalOffset = -horizontalOffset
        verticalOffset = verticalOffset
        break
      case 1: // Top-Right
        horizontalOffset = horizontalOffset
        verticalOffset = verticalOffset
        break
      case 2: // Bottom-Right
        horizontalOffset = horizontalOffset
        verticalOffset = -verticalOffset
        break
      case 3: // Bottom-Left
        horizontalOffset = -horizontalOffset
        verticalOffset = -verticalOffset
        break
      default: // Default to Top-Left
        horizontalOffset = -horizontalOffset
        verticalOffset = verticalOffset
        break
    }

    // Calculate the position relative to camera
    // Start with the camera position, then move forward by distance
    let position = cameraPosition.add(cameraForward.scale(new vec3(this.distanceFromCamera, this.distanceFromCamera, this.distanceFromCamera)))
    
    // Move horizontally (left or right)
    position = position.add(cameraRight.scale(new vec3(horizontalOffset, horizontalOffset, horizontalOffset)))
    
    // Move vertically (up or down)
    position = position.add(cameraUp.scale(new vec3(verticalOffset, verticalOffset, verticalOffset)))

    return position
  }

  private logDebugInfo() {
    if (!this.camera || !this.buttonObject) return

    const cameraPos = this.cameraTransform.getWorldPosition()
    const buttonPos = this.buttonTransform.getWorldPosition()
    
    const cornerNames = ["Top-Left", "Top-Right", "Bottom-Right", "Bottom-Left"]
    const cornerName = cornerNames[this.cornerPosition] || "Unknown"
    
    print("[TopLeftButton] Debug - Camera pos: " + cameraPos.x.toFixed(2) + ", " + cameraPos.y.toFixed(2) + ", " + cameraPos.z.toFixed(2))
    print("[TopLeftButton] Debug - Button pos: " + buttonPos.x.toFixed(2) + ", " + buttonPos.y.toFixed(2) + ", " + buttonPos.z.toFixed(2))
    print("[TopLeftButton] Debug - Button enabled: " + this.buttonObject.enabled)
    print("[TopLeftButton] Debug - Corner: " + cornerName + " (" + this.cornerPosition + ")")
    print("[TopLeftButton] Debug - Distance: " + this.distanceFromCamera + ", Offset: " + this.screenOffset.x + ", " + this.screenOffset.y)
  }

  onDestroy() {
    if (this.updateTimeoutId) {
      clearTimeout(this.updateTimeoutId)
      this.updateTimeoutId = null
    }
  }

  // Public method to manually update position (useful for event-driven updates)
  public forceUpdatePosition() {
    this.updateButtonPosition()
  }

  // Public method to change the screen offset at runtime
  public setScreenOffset(offset: vec2) {
    this.screenOffset = offset
    this.updateButtonPosition()
  }

  // Public method to change the distance from camera at runtime
  public setDistanceFromCamera(distance: number) {
    this.distanceFromCamera = distance
    this.updateButtonPosition()
  }

  // Public method to toggle debug mode
  public setDebugMode(enabled: boolean) {
    this.debugMode = enabled
  }

  // Public method to set corner position (0=top-left, 1=top-right, 2=bottom-right, 3=bottom-left)
  public setCornerPosition(corner: number) {
    switch (corner) {
      case 0: // Top-left
        this.screenOffset = new vec2(0.3, 0.3)
        break
      case 1: // Top-right
        this.screenOffset = new vec2(-0.3, 0.3)
        break
      case 2: // Bottom-right
        this.screenOffset = new vec2(-0.3, -0.3)
        break
      case 3: // Bottom-left
        this.screenOffset = new vec2(0.3, -0.3)
        break
    }
    this.updateButtonPosition()
  }
} 
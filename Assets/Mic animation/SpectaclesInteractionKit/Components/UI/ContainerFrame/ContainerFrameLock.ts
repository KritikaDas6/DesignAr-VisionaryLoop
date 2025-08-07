import animate, {AnimationManager, CancelSet} from "../../../Utils/animate"
import Event, {PublicApi, unsubscribe} from "../../../Utils/Event"
import {FrameInputHandler, FrameInputOptions} from "./modules/FrameInputHandler"

import {Billboard} from "../../../Components/Interaction/Billboard/Billboard"
import {Interactable} from "../../../Components/Interaction/Interactable/Interactable"
import {InteractableManipulation} from "../../../Components/Interaction/InteractableManipulation/InteractableManipulation"
import {InteractionPlane} from "../../../Components/Interaction/InteractionPlane/InteractionPlane"
import {HandInteractor} from "../../../Core/HandInteractor/HandInteractor"
import {
  Interactor,
  InteractorInputType,
  TargetingMode,
} from "../../../Core/Interactor/Interactor"
import {InteractorEvent} from "../../../Core/Interactor/InteractorEvent"
import WorldCameraFinderProvider from "../../../Providers/CameraProvider/WorldCameraFinderProvider"
import {CursorControllerProvider} from "../../../Providers/CursorControllerProvider/CursorControllerProvider"
import {lerp} from "../../../Utils/mathUtils"
import NativeLogger from "../../../Utils/NativeLogger"
import {validate} from "../../../Utils/validate"
import {CursorHandler} from "./modules/CursorHandler"
import {HoverBehavior} from "./modules/HoverBehavior"
import {LabeledPinchButton} from "./modules/LabeledPinchButton"
import {SmoothFollow} from "./modules/SmoothFollow"
import {SnappableBehavior} from "./modules/SnappableBehavior"

const log = new NativeLogger("ContainerFrameLock")

export type InputState = {
  isHovered: boolean
  rawHovered: boolean
  isPinching: boolean
  position: vec3
  drag: vec3
  innerInteractableActive: boolean
}

export type ContainerFrameConfig = {
  target: SceneObject
  parent: SceneObject
}

const OPACITY_TWEEN_DURATION = 0.2
const SQUEEZE_TWEEN_DURATION = 0.4

const DEFAULT_BACKING_ALPHA = 1
const CAPTURE_BACKING_ALPHA = 0.1

const scaleZ = 1
const scaleFactor = 50
const zScaleAdjuster = 15
const CURSOR_HIGHLIGHT_ANIMATION_DURATION = 0.15
const magicScalar = 0.1213592233

const scaleFactorVector = new vec3(
  scaleFactor + magicScalar,
  scaleFactor + magicScalar,
  scaleZ * zScaleAdjuster,
)

const buttonMagicNumber = 0.4474272931
const defaultButtonSize = 3 * buttonMagicNumber
const BUTTON_CORNER_OFFSET = 1 / scaleFactor
const NEAR_FIELD_INTERACTION_ZONE_DISTANCE_CM = 30

/**
 * ContainerFrameLock - A container frame with locking functionality
 * Based on ContainerFrame but with added lock/unlock capability
 */
@component
export class ContainerFrameLock extends BaseScriptComponent {
  private framePrefab: ObjectPrefab = requireAsset(
    "./Prefabs/FramePrefab.prefab",
  ) as ObjectPrefab
  private labeledButtonPrefab = requireAsset(
    "./Prefabs/container-button.prefab",
  ) as ObjectPrefab
  private closeIcon: Texture = requireAsset(
    "./Textures/close-icon-1.png",
  ) as Texture
  private followIcon: Texture = requireAsset(
    "./Textures/follow-white.png",
  ) as Texture
  private unfollowIcon: Texture = requireAsset(
    "./Textures/follow-black.png",
  ) as Texture

  @ui.group_start("Frame Settings")
  @input
  autoShowHide: boolean = true
  @input("vec2", "{32,32}")
  innerSize: vec2 = new vec2(32, 32)
  @input
  border: number = 7
  @input("vec2", "{0,0}")
  @hint("In world units (cm), stays constant through scaling")
  constantPadding: vec2 = new vec2(0, 0)
  @input
  private allowScaling: boolean = true
  @input
  autoScaleContent: boolean = true
  @input
  private isContentInteractable: boolean = false
  @input
  allowTranslation: boolean = true
  @ui.group_end

    @ui.group_start("Lock Settings")
  @input
  @hint("The interactable that will trigger lock/unlock")
  private lockInteractable: Interactable;
  
  @input
  @hint("Current lock state - when locked, frame cannot be moved, scaled, or rotated")
  isLocked: boolean = false
  @ui.group_end

  @ui.group_start("Min/Max Size")
  @input("vec2", "{10,10}")
  @hint("In world units (cm)")
  private minimumSize: vec2 = new vec2(10, 10)
  @input("vec2", "{150,150}")
  @hint("In world units (cm)")
  private maximumSize: vec2 = new vec2(150, 150)
  @ui.group_end

  @ui.group_start("Billboarding")
  @input
  private useBillboarding: boolean = false
  @input
  @showIf("useBillboarding")
  private xOnTranslate: boolean = false
  @input
  @showIf("xOnTranslate")
  private xAlways: boolean = false
  @input
  @showIf("useBillboarding")
  private yOnTranslate: boolean = false
  @input
  @showIf("yOnTranslate")
  private yAlways: boolean = false
  @ui.group_end

  @ui.group_start("Snapping")
  @input
  @hint("Use Snapping Behaviors")
  private useSnapping: boolean = false
  @input
  @showIf("useSnapping")
  @hint("Container to Container Snapping")
  private itemSnapping: boolean = false
  @input
  @showIf("useSnapping")
  @hint("Container to World Snapping")
  private worldSnapping: boolean = false
  @ui.group_end

  @ui.group_start("Follow Behavior")
  @input
  showFollowButton: boolean = false
  @input
  @label("Front Follow Behavior")
  @showIf("showFollowButton")
  private useFOVFollow: boolean = false
  @input
  @showIf("useFOVFollow")
  isFollowing: boolean = false
  @ui.group_end

  @ui.group_start("Close Button")
  @input
  showCloseButton: boolean = true
  @ui.group_end

  @ui.group_start("Interaction Plane")
  @input
  private _enableInteractionPlane: boolean = false
  @ui.group_end

  @ui.separator
  private squeezeAmount = this.border * 0.15

  private frame!: SceneObject
  material!: Material
  private frameTransform!: Transform
  private target!: SceneObject
  private targetTransform!: Transform
  private targetScaleCache!: vec2
  private originalScale!: vec2
  scalingSizeStart: vec2 | null = null
  private parent!: SceneObject
  parentTransform!: Transform
  private collider: ColliderComponent | null = null
  private colliderShape: BoxShape | null = null
  private colliderTransform: Transform | null = null

  closeButton!: LabeledPinchButton
  followButton!: LabeledPinchButton

  private buttonSize: number = defaultButtonSize
  private buttonScaleVector: vec3 = vec3
    .one()
    .uniformScale(defaultButtonSize)
    .div(scaleFactorVector)

  private cursorHandler!: CursorHandler
  private animationManager: AnimationManager = new AnimationManager()

  // Events
  private onScalingUpdate: Event = new Event()
  onScalingStart: Event = new Event()
  onScalingEnd: Event = new Event()
  onScalingUpdateEvent = this.onScalingUpdate.publicApi()
  onScalingStartEvent = this.onScalingStart.publicApi()
  onScalingEndEvent = this.onScalingEnd.publicApi()

  private onTranslationStartEvent = new Event()
  onTranslationStart = this.onTranslationStartEvent.publicApi()

  private onTranslationEndEvent = new Event()
  onTranslationEnd = this.onTranslationEndEvent.publicApi()

  private onHoverEnterInnerInteractableEvent = new Event()
  onHoverEnterInnerInteractable = this.onHoverEnterInnerInteractableEvent.publicApi()

  private onHoverExitInnerInteractableEvent = new Event()
  onHoverExitInnerInteractable = this.onHoverExitInnerInteractableEvent.publicApi()

  // Lock events
  private onLockEvent = new Event<void>()
  private onUnlockEvent = new Event<void>()
  onLock = this.onLockEvent.publicApi()
  onUnlock = this.onUnlockEvent.publicApi()

  forceTranslate: boolean = false

  private inputState: InputState = {
    isHovered: false,
    rawHovered: false,
    isPinching: false,
    position: vec3.zero(),
    drag: vec3.zero(),
    innerInteractableActive: false,
  }

  private _opacity: number = 1
  private opacityCancel: CancelSet = new CancelSet()
  private _isVisible: boolean = true

  private set isVisible(isVisible: boolean) {
    this._isVisible = isVisible
  }

  get isVisible() {
    return this._isVisible
  }

  private scalingLastFrame: boolean = false
  private translatingLastFrame: boolean = false

  private onMovingShrinkFactor: number = 0
  private squeezeCancel: CancelSet = new CancelSet()

  private translateMode: number = 0
  private translateModeCancel: CancelSet = new CancelSet()

  private interactable!: Interactable
  private manipulate!: InteractableManipulation

  private allInteractables: Interactable[] = []

  billboardComponent: Billboard | null = null
  private interactableCached: Interactable | null = null
  private manipulateCached: InteractableManipulation | null = null

  private parentCollider!: ColliderComponent
  private parentInteractable!: Interactable
  parentHoverBehavior!: HoverBehavior

  private renderMeshVisual: RenderMeshVisual | null = null
  private inputHandlerOptions!: FrameInputOptions
  private inputHandler!: FrameInputHandler
  private snapBehavior: SnappableBehavior | null = null

  currentInteractor: Interactor | null = null
  onSnappingComplete: PublicApi<void> | null = null

  worldCamera: Camera = WorldCameraFinderProvider.getInstance().getComponent()
  smoothFollow: SmoothFollow | null = null

  private currentBorder: number = this.border
  private destroyed: boolean = false

  private hoveringInnerInteractableLast: boolean = false
  private interactableHoverOpacity: number = 0.34
  private backingAlphaCache: number = DEFAULT_BACKING_ALPHA

  private hoveringContentInteractable: boolean = false
  private hoveringContentInteractableLast: boolean = false
  private cursorHighlightCancel = new CancelSet()

  private forcePreserveScale: boolean = false
  private lastConstantPadding: vec2 = this.constantPadding.uniformScale(1)
  private frustumBuffer: number = 0
  private unSubscribeList: unsubscribe[] = []
  private interactionPlane: InteractionPlane

  // Backing alpha property
  private _backingAlpha: number = DEFAULT_BACKING_ALPHA

  onAwake() {
    log.d("ContainerFrameLock initialized")
    
    // Initialize frame components
    this.initializeFrame()
    
    // Set up lock interactable if provided
    this.setupLockInteractable()
    
    // Initialize other components
    this.initializeComponents()
    
    // Set up event listeners
    this.setupEventListeners()
    
    // Start update loop
    this.update()
  }

  private initializeFrame() {
    // Frame setup
    this.frame = this.framePrefab.instantiate(null)
    this.frameTransform = this.frame.getTransform()

    this.targetScaleCache = new vec2(this.innerSize.x, this.innerSize.y)
    this.originalScale = new vec2(this.innerSize.x, this.innerSize.y)
    
    // Parent setup
    this.parent = this.getSceneObject()
    this.parentTransform = this.parent.getTransform()
    
    // Target setup
    this.target = global.scene.createSceneObject("ContainerInner")
    this.targetTransform = this.target.getTransform()
    this.parent.children.forEach((child: SceneObject) => {
      child.setParent(this.target)
    })
    this.target.setParent(this.parent)

    // Collider setup
    this.collider = this.frame.getComponent("Physics.ColliderComponent")
    this.colliderShape = this.collider.shape as BoxShape
    this.colliderTransform = this.collider.getSceneObject().getTransform()
  }

  private setupLockInteractable() {
    if (this.lockInteractable) {
      this.lockInteractable.onTriggerStart.add((event: InteractorEvent) => {
        this.toggleLock()
      })
      log.d("Successfully set up lock interactable")
    } else {
      log.d("No lock interactable assigned - locking will be manual only")
    }
  }

  private initializeComponents() {
    // Buttons
    this.closeButton = new LabeledPinchButton({
      prefab: this.labeledButtonPrefab,
      parent: this.frame,
      labels: [this.closeIcon],
    })

    this.closeButton.onTrigger.add(() => {
      this.inputState.isPinching = false
    })

    this.followButton = new LabeledPinchButton({
      prefab: this.labeledButtonPrefab,
      parent: this.frame,
      labels: [this.followIcon, this.unfollowIcon],
      toggle: true,
      triggerColor: new vec4(0.8, 0.8, 0.8, 1),
    })
    this.followButton.setIconScale(new vec2(1.85, 1.85))

    this.followButton.onTrigger.add(() => {
      this.inputState.isPinching = false
      this.setIsFollowing(!this.isFollowing)
    })

    // Cursor handler
    this.cursorHandler = new CursorHandler({
      target: this.target,
      frame: this as any, // Type assertion to avoid type mismatch
      margin: this.border,
    })

    // SIK Components
    this.interactable = this.frame.createComponent(Interactable.getTypeName())
    this.interactable.targetingMode = TargetingMode.Indirect
    this.interactable.allowMultipleInteractors = false

    this.manipulate = this.frame.createComponent(InteractableManipulation.getTypeName())

    // Billboard component
    this.billboardComponent = this.useBillboarding
      ? this.parent.createComponent(Billboard.getTypeName())
      : null

    if (this.billboardComponent !== null) {
      this.billboardComponent.xAxisEnabled = false || this.xAlways
      this.billboardComponent.yAxisEnabled = false || this.yAlways
    }

    // Material setup
    this.renderMeshVisual = this.frame.getComponent("Component.RenderMeshVisual")
    this.material = this.renderMeshVisual.mainMaterial.clone()
    this.renderMeshVisual.mainMaterial = this.material

    this.material.mainPass.frustumCullMode = FrustumCullMode.UserDefinedAABB
    this.material.mainPass.baseColor = new vec4(0.184, 0.184, 0.184, 1)
    this.material.mainPass.backingAlpha = 1

    // Input handler
    this.inputHandlerOptions = {
      frame: this as any, // Type assertion to avoid type mismatch
      manipulate: this.manipulate,
      target: this.target,
      parentTransform: this.parentTransform,
      cursorHandler: this.cursorHandler,
      isInteractable: this.isContentInteractable,
      scaleSpeed: undefined,
      allowScaling: this.allowScaling,
      minimumSize: this.minimumSize,
      maximumSize: this.maximumSize,
    }

    this.inputHandler = new FrameInputHandler(this.inputHandlerOptions)

    // Parent components
    this.parentCollider = this.parent.createComponent("Physics.ColliderComponent")
    const shape = Shape.createBoxShape()
    shape.size = new vec3(0.01, 0.01, 0.01)
    this.parentCollider.shape = shape

    this.parentInteractable = this.parent.createComponent(Interactable.getTypeName())
    this.parentHoverBehavior = new HoverBehavior(this.parentInteractable)

    // Interaction plane
    this.interactionPlane = this.sceneObject.createComponent(InteractionPlane.getTypeName())
    this.interactionPlane.planeSize = this.totalInnerSize.add(
      vec2.one().uniformScale(this.border * 2),
    )
    this.interactionPlane.proximityDistance = NEAR_FIELD_INTERACTION_ZONE_DISTANCE_CM
    this.interactionPlane.enabled = this.enableInteractionPlane

    // Initial setup
    this.manipulate.setManipulateRoot(this.parentTransform)
    this.manipulate.setCanScale(false)

    this.parentTransform.setWorldPosition(this.targetTransform.getWorldPosition())
    this.parentTransform.setWorldRotation(this.targetTransform.getWorldRotation())
    this.frame.setParentPreserveWorldTransform(this.parent)

    this.frameTransform.setLocalPosition(vec3.zero())
    this.frameTransform.setLocalRotation(quat.quatIdentity())
    this.frameTransform.setWorldScale(scaleFactorVector)

    this.targetTransform.setLocalPosition(new vec3(0, 0, 0.5))
    this.targetTransform.setLocalRotation(quat.quatIdentity())

    this.opacity = this.material.mainPass.opacity as number
    this.scaleFrame()

    // Button setup
    this.enableCloseButton(this.showCloseButton)
    this.enableFollowButton(this.showFollowButton)
    this.setIsFollowing(this.isFollowing)

    // Snapping and following
    if (this.useSnapping) {
      this.createSnappableBehavior()
    }

    if (this.useFOVFollow) {
      this.setUseFollow(true)
    }

    // Collect all interactables
    this.allInteractables.push(this.interactable)
    this.allInteractables.push(this.parentInteractable)
    const closeButton = this.closeButton.getInteractable()
    if (closeButton) {
      this.allInteractables.push(closeButton)
    }
    const followButton = this.followButton.getInteractable()
    if (followButton) {
      this.allInteractables.push(followButton)
    }

    // Initial visibility
    if (this.autoShowHide) {
      this.hideVisual()
    } else {
      this._opacity = 0
      this.showVisual()
    }

    this.setAllowScaling(this.allowScaling)
    this.createEvent("OnDestroyEvent").bind(this.onDestroy)
    this.material.mainPass.isHovered = 0
    this.backingAlpha = this.material.mainPass.backingAlpha
    this.createEvent("LateUpdateEvent").bind(this.lateUpdate)
  }

  private setupEventListeners() {
    // Parent hover events
    this.unSubscribeList.push(
      this.parentHoverBehavior.onHoverStart.add((e: InteractorEvent) => {
        if (!this.isLocked) {
          this.cursorHandler.setCursor(
            CursorControllerProvider.getInstance().getCursorByInteractor(e.interactor),
          )
          if (this.autoShowHide) this.showVisual()
          if (this.material.mainPass.isHovered === 0) {
            this.showCursorHighlight()
          }
          this.inputState.isHovered = true
          this.inputState.rawHovered = true
        }
      }),
    )

    this.unSubscribeList.push(
      this.parentHoverBehavior.onHoverUpdate.add((e: InteractorEvent) => {
        if (!this.isLocked) {
          const targetObject = e?.target.sceneObject
          this.updateCursorHighlightPosition(e)

          let targetParent: SceneObject | null = targetObject
          let hoveringInteractable = false

          while (targetParent !== null && !targetParent.isSame(this.sceneObject)) {
            if (targetObject === this.target || targetParent === this.target) {
              hoveringInteractable = true
              break
            }
            targetParent = isNull(targetParent) ? null : targetParent.getParent()
          }

          const isNearFieldMode =
            (e.interactor.inputType & InteractorInputType.BothHands) !== 0 &&
            !(e.interactor as HandInteractor).isFarField()

          if (hoveringInteractable && !isNearFieldMode) {
            if (!this.hoveringContentInteractableLast) {
              this.hideCursorHighlight()
            }
          } else {
            if (this.hoveringContentInteractableLast) {
              this.showCursorHighlight()
            }
          }
          this.hoveringContentInteractableLast = hoveringInteractable

          if (hoveringInteractable || this.inputHandler.state.hoveringInteractable) {
            this.inputState.innerInteractableActive = true
          } else {
            this.inputState.innerInteractableActive = false
          }
        }
      }),
    )

    this.unSubscribeList.push(
      this.parentHoverBehavior.onHoverEnd.add(() => {
        if (this.autoShowHide) this.hideVisual()
        if (this.material.mainPass.isHovered > 0) {
          this.hideCursorHighlight()
        }
        this.inputState.isHovered = false
        this.inputState.rawHovered = false
        this.inputState.innerInteractableActive = false
      }),
    )

    // Frame interactable events
    this.unSubscribeList.push(
      this.interactable.onHoverUpdate.add((event: InteractorEvent) => {
        if (!this.isLocked && event.interactor.targetHitInfo) {
          this.updateCursorHighlightPosition(event)
          if (event.target === this.interactable)
            this.inputHandler.lastHovered = true
        }
      }),
    )

    let dragStart = vec3.zero()

    this.unSubscribeList.push(
      this.interactable.onTriggerStart((e: InteractorEvent) => {
        if (!this.isLocked) {
          const targetObject = e?.target.sceneObject
          let targetParent: SceneObject | null = targetObject
          validate(e.interactor.planecastPoint)
          dragStart = this.parentTransform
            .getInvertedWorldTransform()
            .multiplyPoint(e.interactor.planecastPoint)

          while (targetParent !== null && !targetParent.isSame(this.sceneObject)) {
            if (
              targetObject === this.target ||
              targetObject === this.frame ||
              targetParent === this.target
            ) {
              this.inputState.isPinching = true
              this.currentInteractor = e.interactor
            }
            if (targetObject === this.target || targetParent === this.target) {
              break
            }
            targetParent = targetParent?.getParent()
          }
        }
      }),
    )

    this.unSubscribeList.push(
      this.interactable.onTriggerUpdate((event: InteractorEvent) => {
        if (!this.isLocked && event.interactor.targetHitInfo && this.inputHandler.state.scaling) {
          validate(event.interactor.planecastPoint)
          validate(this.scalingSizeStart)
          const dragPos = this.parentTransform
            .getInvertedWorldTransform()
            .multiplyPoint(event.interactor.planecastPoint)
          const dragDelta = dragPos.sub(dragStart)
          const sizeDelta = new vec2(
            dragDelta.x * Math.sign(dragStart.x) * 2,
            dragDelta.y * Math.sign(dragStart.y) * 2,
          )
          const dragScale =
            1 +
            Math.max(
              sizeDelta.x / this.scalingSizeStart.x,
              sizeDelta.y / this.scalingSizeStart.y,
            )
          const minScale = Math.max(
            this.minimumSize.x / this.scalingSizeStart.x,
            this.minimumSize.y / this.scalingSizeStart.y,
          )
          const maxScale = Math.min(
            this.maximumSize.x / this.scalingSizeStart.x,
            this.maximumSize.y / this.scalingSizeStart.y,
          )
          this.innerSize = this.scalingSizeStart.uniformScale(
            MathUtils.clamp(dragScale, minScale, maxScale),
          )
          this.interactionPlane.planeSize = this.totalInnerSize.add(
            vec2.one().uniformScale(this.border * 2),
          )
        }
      }),
    )

    this.unSubscribeList.push(
      this.interactable.onTriggerEnd(() => {
        this.inputState.isPinching = false
        this.currentInteractor = null
      }),
    )

    this.unSubscribeList.push(
      this.interactable.onTriggerCanceled(() => {
        this.inputState.isPinching = false
        this.currentInteractor = null
      }),
    )

    // Input handler events
    this.inputHandler.onTranslationStart.add(() => {
      if (!this.isLocked) {
        this.onTranslationStartEvent.invoke()
        this.smoothFollow?.startDragging()
      }
    })
    
    this.inputHandler.onTranslationEnd.add(() => {
      this.onTranslationEndEvent.invoke()
      this.smoothFollow?.finishDragging()
    })
  }

  /**
   * Toggle the lock state
   */
  toggleLock() {
    this.isLocked = !this.isLocked
    if (this.isLocked) {
      this.lock()
    } else {
      this.unlock()
    }
  }

  /**
   * Lock the container frame
   */
  lock() {
    this.isLocked = true
    log.d("ContainerFrameLock locked")
    this.onLockEvent.invoke()
    
    // Disable all interactables
    this.enableInteractables(false)
  }

  /**
   * Unlock the container frame
   */
  unlock() {
    this.isLocked = false
    log.d("ContainerFrameLock unlocked")
    this.onUnlockEvent.invoke()
    
    // Re-enable all interactables
    this.enableInteractables(true)
  }

  /**
   * Check if the frame is currently locked
   */
  isFrameLocked(): boolean {
    return this.isLocked
  }

  // ... rest of the ContainerFrame methods would go here
  // For brevity, I'm including the most essential methods

  private update = () => {
    if (getDeltaTime() === 0 && !this.autoShowHide) {
      if (this.backingAlpha !== CAPTURE_BACKING_ALPHA) {
        this.material.mainPass.backingAlpha = CAPTURE_BACKING_ALPHA
      }
    } else {
      if (this.backingAlpha !== this.backingAlphaCache) {
        this.backingAlpha = this.backingAlphaCache
      }
    }

    if (this.destroyed) {
      return
    }

    // Only update if not locked
    if (!this.isLocked) {
      this.inputHandler.update(this.inputState)

      if (this.inputHandler.state.translating) {
        if (this.billboardComponent !== null) {
          this.billboardComponent.xAxisEnabled =
            (this.xOnTranslate && (this.allowTranslation || this.forceTranslate)) ||
            this.xAlways
          this.billboardComponent.yAxisEnabled =
            (this.yOnTranslate && (this.allowTranslation || this.forceTranslate)) ||
            this.yAlways
        }
        if (!this.translatingLastFrame) {
          const currentSqueeze = this.onMovingShrinkFactor
          this.tweenMarginSqueeze(currentSqueeze, this.squeezeAmount)
          const currentTranslateMode = this.translateMode
          this.tweenTranslateMode(currentTranslateMode, 1)
        }
        this.translatingLastFrame = true
      } else {
        if (this.billboardComponent !== null && (!this.isFollowing || this.xAlways || this.yAlways)) {
          this.billboardComponent.xAxisEnabled = false || this.xAlways
          this.billboardComponent.yAxisEnabled = false || this.yAlways
        }
        if (this.translatingLastFrame) {
          const currentSqueeze = this.onMovingShrinkFactor
          this.tweenMarginSqueeze(currentSqueeze, 0)
          const currentTranslateMode = this.translateMode
          this.tweenTranslateMode(currentTranslateMode, 0)
        }
        this.translatingLastFrame = false
      }

      this.currentBorder = this.border - this.onMovingShrinkFactor

      if (
        !this.innerSize.equal(this.targetScaleCache) ||
        this.currentBorder !== this.material.mainPass.frameMargin ||
        !this.constantPadding.equal(this.lastConstantPadding)
      ) {
        this.targetScaleCache.x = this.innerSize.x
        this.targetScaleCache.y = this.innerSize.y
        this.lastConstantPadding.x = this.constantPadding.x
        this.lastConstantPadding.y = this.constantPadding.y
        this.scaleFrame()
      }

      this.inputState.innerInteractableActive =
        this.inputState.innerInteractableActive ||
        this.inputHandler.state.hoveringInteractable

      if (this.inputState.innerInteractableActive && !this.hoveringInnerInteractableLast) {
        const currentOpacity = this._opacity
        if (this.autoShowHide) {
          this.tweenOpacity(currentOpacity, this.interactableHoverOpacity)
        }
        this.onHoverEnterInnerInteractableEvent.invoke()
      } else if (!this.inputState.innerInteractableActive && this.hoveringInnerInteractableLast) {
        const currentOpacity = this._opacity
        if (this.inputState.rawHovered) {
          if (this.autoShowHide) {
            this.tweenOpacity(currentOpacity, 1)
          }
        }
        this.onHoverExitInnerInteractableEvent.invoke()
      }
      this.hoveringInnerInteractableLast = this.inputState.innerInteractableActive

      this.cursorHandler.update(this.inputState, this.inputHandler.state)

      this.material.mainPass.translateMode = this.translateMode

      if (!this.scalingLastFrame && !this.translatingLastFrame) {
        this.material.mainPass.touchPosition = this.inputState.position
      }

      if (this.inputHandler.state.scaling && !this.scalingLastFrame) {
        this.smoothFollow?.startDragging()
      }

      if (!this.inputHandler.state.scaling && this.scalingLastFrame) {
        this.smoothFollow?.finishDragging()
      }

      this.scalingLastFrame = this.inputHandler.state.scaling

      this.snapBehavior?.setScaling(this.inputHandler.state.scaling)

      if (this.inputHandler.state.translating) this.snapBehavior?.update()
    }

    if (this.isFollowing) {
      this.smoothFollow?.onUpdate()
    }

    this.animationManager.requestAnimationFrame(this.update)
  }

  private lateUpdate = () => {
    this.parentHoverBehavior.lateUpdate()
  }

  private scaleFrame = () => {
    validate(this.colliderShape)
    validate(this.renderMeshVisual)

    this.material.mainPass.frameMargin = this.currentBorder
    this.material.mainPass.scaleFactor = scaleFactor

    const doubleMargin = this.currentBorder * 2
    const meshEdges = scaleFactor * magicScalar

    this.material.mainPass.scaleX =
      this.targetScaleCache.x + doubleMargin - meshEdges + this.constantPadding.x
    this.material.mainPass.scaleY =
      this.targetScaleCache.y + doubleMargin - meshEdges + this.constantPadding.y

    this.material.mainPass.scaleZ = scaleZ / zScaleAdjuster

    this.material.mainPass.rawScale = new vec2(
      this.targetScaleCache.x + this.constantPadding.x,
      this.targetScaleCache.y + this.constantPadding.y,
    )

    const fullScale = new vec2(
      this.targetScaleCache.x + this.constantPadding.x + doubleMargin,
      this.targetScaleCache.y + this.constantPadding.y + doubleMargin,
    )

    this.material.mainPass.fullScale = new vec2(fullScale.x, fullScale.y)

    let aspectRatio = new vec2(1, 1)
    if (fullScale.x > fullScale.y) {
      aspectRatio.y = fullScale.x / fullScale.y
    } else {
      aspectRatio.x = fullScale.y / fullScale.x
    }

    this.material.mainPass.aspectRatio = new vec2(aspectRatio.x, aspectRatio.y)

    this.material.mainPass.originalScale = new vec2(
      this.originalScale.x + this.currentBorder,
      this.originalScale.y + this.currentBorder,
    )

    this.colliderShape.size = new vec3(
      (this.targetScaleCache.x + this.currentBorder * 2 + this.constantPadding.x) / scaleFactor,
      (this.targetScaleCache.y + this.currentBorder * 2 + this.constantPadding.y) / scaleFactor,
      scaleZ / zScaleAdjuster,
    )

    this.renderMeshVisual.mainMaterial.mainPass.frustumCullMin = new vec3(
      this.colliderShape.size.x * -0.5 - this.frustumBuffer,
      this.colliderShape.size.y * -0.5 - this.frustumBuffer,
      this.colliderShape.size.z * -0.5,
    )

    this.renderMeshVisual.mainMaterial.mainPass.frustumCullMax = new vec3(
      this.colliderShape.size.x * 0.5 + this.frustumBuffer,
      this.colliderShape.size.y * 0.5 + this.frustumBuffer,
      this.colliderShape.size.z * 0.5,
    )

    this.inputHandler.gutterSize.x = this.currentBorder / (scaleFactor * this.colliderShape.size.x)
    this.inputHandler.gutterSize.y = this.currentBorder / (scaleFactor * this.colliderShape.size.y)

    this.scaleAndPositionButtons()

    this.frameTransform.setLocalPosition(vec3.zero())
    this.frameTransform.setLocalRotation(quat.quatIdentity())

    this.targetTransform.setLocalPosition(new vec3(0, 0, scaleZ + 0.5))
    this.targetTransform.setLocalRotation(quat.quatIdentity())

    if (this.autoScaleContent) {
      if (!this.forcePreserveScale) {
        const factor = this.innerSize.div(this.originalScale)
        this.targetTransform.setLocalScale(new vec3(factor.x, factor.y, 1))
      } else {
        this.originalScale = this.targetScaleCache.uniformScale(1)
      }
    }

    this.smoothFollow?.resize(this.innerSize.x + doubleMargin + this.constantPadding.x)

    if (!this.forcePreserveScale) {
      this.onScalingUpdate.invoke()
    } else {
      this.forcePreserveScale = false
    }
  }

  private scaleAndPositionButtons = () => {
    this.closeButton.transform.setLocalScale(this.buttonScaleVector)
    this.followButton.transform.setLocalScale(this.buttonScaleVector)

    const halfFrameWidth = (this.innerSize.x * 0.5 + this.constantPadding.x * 0.5 + this.currentBorder) / scaleFactor
    const halfFrameHeight = (this.innerSize.y * 0.5 + this.constantPadding.y * 0.5 + this.currentBorder) / scaleFactor

    const buttonOffset = (this.buttonSize / scaleFactor) * -1 - BUTTON_CORNER_OFFSET

    this.closeButton.transform.setLocalPosition(
      new vec3(-halfFrameWidth - buttonOffset, halfFrameHeight + buttonOffset, 0.1),
    )

    this.followButton.transform.setLocalPosition(
      new vec3(halfFrameWidth + buttonOffset, halfFrameHeight + buttonOffset, 0.1),
    )
  }

  private updateCursorHighlightPosition = (e: InteractorEvent) => {
    validate(this.colliderShape)
    validate(this.colliderTransform)

    if (e.interactor.targetHitInfo) {
      const hitPosition = e.interactor.targetHitInfo?.hit.position
      const normalizer = vec3.one().div(this.colliderShape.size)
      this.inputState.position = this.colliderTransform
        .getInvertedWorldTransform()
        .multiplyPoint(hitPosition)
        .mult(normalizer)
    }
  }

  private showCursorHighlight = () => {
    if (this.cursorHighlightCancel) this.cursorHighlightCancel.cancel()
    const startingHighlight = this.material.mainPass.isHovered
    animate({
      duration: CURSOR_HIGHLIGHT_ANIMATION_DURATION * (1 - startingHighlight),
      cancelSet: this.cursorHighlightCancel,
      update: (t) => {
        this.material.mainPass.isHovered = t
      },
    })
  }

  private hideCursorHighlight = () => {
    if (this.cursorHighlightCancel) this.cursorHighlightCancel.cancel()
    const startingHighlight = this.material.mainPass.isHovered
    animate({
      duration: CURSOR_HIGHLIGHT_ANIMATION_DURATION * startingHighlight,
      cancelSet: this.cursorHighlightCancel,
      update: (t) => {
        this.material.mainPass.isHovered = startingHighlight - t * startingHighlight
      },
    })
  }

  private tweenOpacity = (currentOpacity: number, targetOpacity: number, endCallback = () => {}) => {
    if (this.opacityCancel) this.opacityCancel.cancel()
    animate({
      duration: OPACITY_TWEEN_DURATION * Math.abs(targetOpacity - currentOpacity),
      update: (t: number) => {
        this.opacity = lerp(currentOpacity, targetOpacity, t)
      },
      ended: endCallback,
      cancelSet: this.opacityCancel,
    })
  }

  private tweenMarginSqueeze = (currentSqueeze: number, targetSqueeze: number) => {
    animate({
      duration: SQUEEZE_TWEEN_DURATION,
      easing: "ease-out-back-cubic",
      update: (t: number) => {
        this.onMovingShrinkFactor = lerp(currentSqueeze, targetSqueeze, t)
      },
      cancelSet: this.squeezeCancel,
    })
  }

  private tweenTranslateMode = (current: number, target: number) => {
    animate({
      duration: SQUEEZE_TWEEN_DURATION,
      update: (t: number) => {
        this.translateMode = lerp(current, target, t)
      },
      cancelSet: this.translateModeCancel,
    })
  }

  // Essential getter/setter methods
  set opacity(opacity: number) {
    if (opacity > 0) {
      this.isVisible = true
    } else {
      this.isVisible = false
    }
    if (!this.destroyed) {
      this._opacity = opacity
      this.material.mainPass.opacity = opacity
      this.closeButton.setAlpha(opacity)
      this.followButton.setAlpha(opacity)
    }
  }

  get opacity(): number {
    return this._opacity
  }

  get totalInnerSize(): vec2 {
    return new vec2(
      this.innerSize.x + this.constantPadding.x,
      this.innerSize.y + this.constantPadding.y,
    )
  }

  set enableInteractionPlane(enabled: boolean) {
    this.interactionPlane.enabled = enabled
    this._enableInteractionPlane = enabled
  }

  get enableInteractionPlane(): boolean {
    return this._enableInteractionPlane
  }

  /**
   * @param alpha sets alpha of the dark backing effect of the frame
   */
  set backingAlpha(alpha: number) {
    if (!this.destroyed) {
      this.backingAlphaCache = alpha
      this.material.mainPass.backingAlpha = alpha
    }
  }

  /**
   * @returns alpha of the dark backing effect of the frame
   */
  get backingAlpha(): number {
    return this.material.mainPass.backingAlpha
  }

  enableInteractables = (isInteractable: boolean) => {
    for (let i = 0; i < this.allInteractables.length; i++) {
      this.allInteractables[i].enabled = isInteractable
    }
  }

  setAllowScaling = (allowScaling: boolean) => {
    this.allowScaling = allowScaling
    this.inputHandler.allowScaling = this.allowScaling

    const scaleHandles = vec4.zero()
    if (allowScaling) {
      if (!this.showFollowButton) scaleHandles.x = 1
      scaleHandles.y = 1
      scaleHandles.z = 1
      if (!this.showCloseButton) scaleHandles.w = 1
    }
    this.material.mainPass.scaleHandles = scaleHandles
  }

  enableCloseButton = (enabled: boolean) => {
    this.showCloseButton = enabled
    this.closeButton.object.enabled = enabled
    const scaleHandles = this.material.mainPass.scaleHandles
    scaleHandles.w = enabled && this.allowScaling ? 1 : 0
    this.material.mainPass.scaleHandles = scaleHandles
  }

  enableFollowButton = (enabled: boolean) => {
    this.showFollowButton = enabled
    this.followButton.object.enabled = enabled
    const scaleHandles = this.material.mainPass.scaleHandles
    scaleHandles.y = enabled && this.allowScaling ? 1 : 0
    this.material.mainPass.scaleHandles = scaleHandles
  }

  setIsFollowing = (isFollowing: boolean): void => {
    this.isFollowing = isFollowing

    if (this.isFollowing) {
      if (this.billboardComponent !== null) {
        this.billboardComponent.xAxisEnabled = (this.xOnTranslate && this.allowTranslation) || this.xAlways
        this.billboardComponent.yAxisEnabled = (this.yOnTranslate && this.allowTranslation) || this.yAlways
      }
      this.followButton.toggled = true
      this.followButton.setColor("trigger")
      this.followButton.setTexture(1)
    } else {
      this.followButton.setColor("default")
      this.followButton.toggled = false
      this.followButton.setTexture(0)
    }
  }

  setUseFollow = (useFollow: boolean) => {
    this.useFOVFollow = useFollow
    if (useFollow && !this.smoothFollow) {
      this.smoothFollow = new SmoothFollow({
        frame: this as any, // Type assertion to avoid type mismatch
      })
    }
  }

  private createSnappableBehavior = () => {
    this.snapBehavior = new SnappableBehavior({
      frame: this as any, // Type assertion to avoid type mismatch
      worldSnapping: this.worldSnapping,
      itemSnapping: this.itemSnapping,
    })
    this.onSnappingComplete = this.snapBehavior.snappingComplete()
  }

  showVisual = () => {
    validate(this.renderMeshVisual)
    const currentOpacity = this._opacity
    this.renderMeshVisual.enabled = true
    if (this.closeButton && this.showCloseButton) this.closeButton.object.enabled = true
    if (this.followButton && this.showFollowButton) this.followButton.object.enabled = true
    this.tweenOpacity(currentOpacity, 1)
  }

  hideVisual = () => {
    const currentOpacity = this._opacity
    this.tweenOpacity(currentOpacity, 0, () => {
      validate(this.renderMeshVisual)
      this.renderMeshVisual.enabled = false
      if (this.closeButton) this.closeButton.object.enabled = false
      if (this.followButton) this.followButton.object.enabled = false
    })
  }

  onDestroy = (): void => {
    log.d("destroy isDestroyed:" + this.destroyed)
    if (!this.destroyed) {
      this.destroyed = true
      this.unSubscribeList.forEach((sub) => {
        sub()
      })
      this.parentHoverBehavior.destroy()
      this.snapBehavior?.destroy()

      if (!isNull(this.frame)) {
        this.frame.destroy()
      }

      this.enabled = false
    }
  }
}

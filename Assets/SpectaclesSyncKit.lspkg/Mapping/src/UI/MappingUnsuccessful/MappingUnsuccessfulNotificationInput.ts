import {Interactable} from "../../../../../SpectaclesInteractionKit/Components/Interaction/Interactable/Interactable"
import {PinchButton} from "../../../../../SpectaclesInteractionKit/Components/UI/PinchButton/PinchButton"

@component
export class MappingUnsuccessfulNotificationInput extends BaseScriptComponent {
  script: ScriptComponent

  @input
  readonly root: SceneObject

  @typename
  PinchButton: string

  @input("float", "160.0")
  readonly distance: number

  @input
  readonly tile: RenderMeshVisual

  @input
  readonly titleText: Text

  @input
  readonly hintsTitle: Text[]

  @input
  readonly hintsText: Text[]

  @input
  readonly keepLookingButton: PinchButton

  @input
  readonly keepLookingInteractable: Interactable

  @input
  readonly keepLookingButtonMesh: RenderMeshVisual
}

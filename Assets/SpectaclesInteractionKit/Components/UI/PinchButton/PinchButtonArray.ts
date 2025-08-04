import {InteractorEvent} from "../../../Core/Interactor/InteractorEvent"
import Event from "../../../Utils/Event"
import {createCallback} from "../../../Utils/InspectorCallbacks"
import NativeLogger from "../../../Utils/NativeLogger"
import {Interactable} from "../../Interaction/Interactable/Interactable"

const TAG = "PinchButtonArray"

/**
 * This class provides pinch button functionality with support for multiple target objects.
 * It is meant to be added to a Scene Object with an Interactable component, with visual behavior configured in the Lens Studio scene.
 */
@component
export class PinchButtonArray extends BaseScriptComponent {
  @input("SceneObject[]")
  @allowUndefined
  @hint("Array of objects to disable when the pinch is triggered")
  private targetObjectsToDisable: SceneObject[] = []
    
  @input("SceneObject[]")
  @allowUndefined
  @hint("Array of objects to enable when the pinch is triggered")
  private targetObjectsToEnable: SceneObject[] = []
  
  @input
  @allowUndefined
  @hint("Is toggle on or off")
  private isToggleButton: boolean = false
    
  @input
  @hint(
    "Enable this to add functions from another script to this component's callback events",
  )
  editEventCallbacks: boolean = false
  @ui.group_start("On Button Pinched Callbacks")
  @showIf("editEventCallbacks")
  @input("Component.ScriptComponent")
  @hint("The script containing functions to be called when button is pinched")
  @allowUndefined
  private customFunctionForOnButtonPinched: ScriptComponent | undefined
  @input
  @hint(
    "The names for the functions on the provided script, to be called on button pinch",
  )
  @allowUndefined
  private onButtonPinchedFunctionNames: string[] = []
  @ui.group_end
  private interactable: Interactable | null = null

  private onButtonPinchedEvent = new Event<InteractorEvent>()
  public readonly onButtonPinched = this.onButtonPinchedEvent.publicApi()

  // Native Logging
  private log = new NativeLogger(TAG)

  onAwake(): void {
    this.interactable = this.getSceneObject().getComponent(
      Interactable.getTypeName(),
    )

    this.createEvent("OnStartEvent").bind(() => {
      if (!this.interactable) {
        throw new Error(
          "Pinch Button Array requires an Interactable Component on the same Scene object in order to work - please ensure one is added.",
        )
      }
      this.interactable.onTriggerEnd.add((interactorEvent: InteractorEvent) => {
        if (this.enabled) {
          this.onButtonPinchedEvent.invoke(interactorEvent)
          if (!this.isToggleButton) {
              // Enable all target objects if assigned
              if (this.targetObjectsToEnable && this.targetObjectsToEnable.length > 0) {
                for (let i = 0; i < this.targetObjectsToEnable.length; i++) {
                  if (this.targetObjectsToEnable[i]) {
                    this.targetObjectsToEnable[i].enabled = true;
                  }
                }
              }
                        
              // Disable all target objects if assigned
              if (this.targetObjectsToDisable && this.targetObjectsToDisable.length > 0) {
                for (let i = 0; i < this.targetObjectsToDisable.length; i++) {
                  if (this.targetObjectsToDisable[i]) {
                    this.targetObjectsToDisable[i].enabled = false;
                  }
                }
              }        
          }
          else {
              // Toggle mode - check if any objects are enabled and toggle accordingly
              if (this.targetObjectsToDisable && this.targetObjectsToDisable.length > 0) {
                let anyEnabled = false;
                
                // Check if any objects are currently enabled
                for (let i = 0; i < this.targetObjectsToDisable.length; i++) {
                  if (this.targetObjectsToDisable[i] && this.targetObjectsToDisable[i].enabled) {
                    anyEnabled = true;
                    break;
                  }
                }
                
                // Toggle all objects based on the first enabled state
                for (let i = 0; i < this.targetObjectsToDisable.length; i++) {
                  if (this.targetObjectsToDisable[i]) {
                    this.targetObjectsToDisable[i].enabled = !anyEnabled;
                  }
                }
              }
          }
        }
      })
    })
    if (this.editEventCallbacks && this.customFunctionForOnButtonPinched) {
      this.onButtonPinched.add(
        createCallback<InteractorEvent>(
          this.customFunctionForOnButtonPinched,
          this.onButtonPinchedFunctionNames,
        ),
      )
    }
  }
} 
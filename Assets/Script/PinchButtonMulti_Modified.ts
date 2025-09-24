import {InteractorEvent} from "SpectaclesInteractionKit.lspkg/Core/Interactor/InteractorEvent"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {createCallback} from "SpectaclesInteractionKit.lspkg/Utils/InspectorCallbacks"
import NativeLogger from "SpectaclesInteractionKit.lspkg/Utils/NativeLogger"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"

const TAG = "PinchButton"

/**
 * This class provides basic pinch button functionality for the prefab pinch button. It is meant to be added to a Scene Object with an Interactable component, with visual behavior configured in the Lens Studio scene.
 */
@component
export class PinchButton_Modified extends BaseScriptComponent {
  @input("SceneObject[]")
  @allowUndefined
  @hint("The objects to disable when the pinch is triggered")
  private targetObjectsToDisable: SceneObject[] = []
    
  @input("SceneObject[]")
  @allowUndefined
  @hint("The objects to enable when the pinch is triggered")
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
          "Pinch Button requires an Interactable Component on the same Scene object in order to work - please ensure one is added.",
        )
      }
      this.interactable.onTriggerEnd.add((interactorEvent: InteractorEvent) => {
        if (this.enabled) {
          this.onButtonPinchedEvent.invoke(interactorEvent)
          if (!this.isToggleButton) {
              // Enable all target objects if assigned
              if (this.targetObjectsToEnable && this.targetObjectsToEnable.length > 0) {
                this.targetObjectsToEnable.forEach(obj => {
                  if (obj) {
                    obj.enabled = true;
                  }
                });
              }
                        
              // Disable all target objects if assigned
              if (this.targetObjectsToDisable && this.targetObjectsToDisable.length > 0) {
                this.targetObjectsToDisable.forEach(obj => {
                  if (obj) {
                    obj.enabled = false;
                  }
                });
              }        
          }
          else {
              // Toggle mode - only works with disable objects for simplicity
              if (this.targetObjectsToDisable && this.targetObjectsToDisable.length > 0) {
                this.targetObjectsToDisable.forEach(obj => {
                  if (obj) {
                    obj.enabled = !obj.enabled;
                  }
                });
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
//      if (this.sceneObject) {
//            print("hi")
//            this.sceneObject.enabled = false;
//            
//        }
    }
  }
}

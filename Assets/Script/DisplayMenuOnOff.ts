import { Interactable } from "../SpectaclesInteractionKit/Components/Interaction/Interactable/Interactable";
import { InteractorEvent } from "../SpectaclesInteractionKit/Core/Interactor/InteractorEvent";

@component
export class displayMenuMenuOnOff extends BaseScriptComponent {
    
    @input private targetMenu: SceneObject
    @input private interactable: Interactable;
    
    private isVisible = false
    
     onAwake(): void {
         if (!this.interactable || !this.targetMenu) {
             print("Missing required inputs");
              return;
            }
    
        this.targetMenu.enabled = false; // Menu starts hidden
        
    // Use Interaction Kit’s onTriggerEnd to detect press
    this.interactable.onTriggerEnd.add(() => {
      this.isVisible = !this.isVisible;
      this.targetMenu.enabled = this.isVisible;
    });
        

  }

}

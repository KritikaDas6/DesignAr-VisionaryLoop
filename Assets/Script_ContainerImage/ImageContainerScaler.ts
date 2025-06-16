import { ContainerFrame } from "../SpectaclesInteractionKit/Components/UI/ContainerFrame/ContainerFrame";
import { setTimeout } from "../SpectaclesInteractionKit/Utils/FunctionTimingUtils";

/**
 * Resizes an assigned ContainerFrame to match image aspect ratio, and scales image with it.
 */
@component
export class ImageContainerScaler extends BaseScriptComponent {
  @input
  private container: ContainerFrame; // existing ContainerFrame in the scene

  @input
  private imageObject: SceneObject; // child image prefab inside the container

  @input
  @allowUndefined
  private imageTexture: Texture;

  private originalAspectRatio: number = 1;

  onStart() {
    if (!this.container || !this.imageObject) {
      print("Missing container or imageObject input");
      return;
    }

    if (this.imageTexture) {
      this.setImage(this.imageTexture);
    }

    this.createEvent("UpdateEvent").bind(() => this.syncImageWithContainer());
  }

  private setImage(texture: Texture) {
    const width = texture.getWidth();
    const height = texture.getHeight();
    if (width <= 0 || height <= 0) return;

    this.originalAspectRatio = width / height;

    const containerHeight = this.container.innerSize.y;
    const containerWidth = containerHeight * this.originalAspectRatio;
    this.container.innerSize = new vec2(containerWidth, containerHeight);

    const imageComponent = this.imageObject.getComponent("Component.Image") as any;
    if (imageComponent?.mainPass) {
      imageComponent.mainPass.baseTex = texture;
    }

    setTimeout(() => this.syncImageWithContainer(), 50);
  }

  private syncImageWithContainer() {
    const size = this.container.innerSize;
    const imageTransform = this.imageObject.getTransform();

    imageTransform.setLocalScale(new vec3(size.x, size.y, 1));
    imageTransform.setLocalPosition(new vec3(0, 0, 0)); // center inside frame
  }
}

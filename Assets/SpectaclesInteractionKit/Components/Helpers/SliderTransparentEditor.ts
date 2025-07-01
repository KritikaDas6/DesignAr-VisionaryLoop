import { Slider } from "../UI/Slider/Slider";

@component
export class SliderTransparentEditor extends BaseScriptComponent {
    @input
    private image!: Image;

    @input
    private slider!: Slider;

    private targetAlpha: number = 1.0;
    private currentAlpha: number = 1.0;
    private lerpSpeed: number = 5.0; // Adjust for smoothness

    onAwake(): void {
        if (!this.image || !this.slider) {
            print("SliderTransparentEditor: Missing image or slider input.");
            return;
        }
        // Set initial alpha
        this.setAlpha(this.slider.currentValue ?? 1.0);
        // Listen for slider value changes
        this.slider.onValueUpdate.add(this.onSliderValueChanged.bind(this));
        // Start update loop for smooth transition
        this.createEvent("UpdateEvent").bind(this.update.bind(this));
    }

    private onSliderValueChanged(value: number) {
        this.targetAlpha = value;
    }

    private update() {
        // Smoothly interpolate currentAlpha to targetAlpha
        if (Math.abs(this.currentAlpha - this.targetAlpha) > 0.001) {
            this.currentAlpha += (this.targetAlpha - this.currentAlpha) * Math.min(this.lerpSpeed * getDeltaTime(), 1.0);
            this.setAlpha(this.currentAlpha);
        }
    }

    private setAlpha(alpha: number) {
        if (this.image && this.image.mainMaterial && this.image.mainMaterial.mainPass) {
            let color = this.image.mainMaterial.mainPass.baseColor;
            color.w = alpha;
            this.image.mainMaterial.mainPass.baseColor = color;
        }
    }
} 
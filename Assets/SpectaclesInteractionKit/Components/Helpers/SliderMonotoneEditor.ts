import { Slider } from "../UI/Slider/Slider";

@component
export class SliderMonotoneEditor extends BaseScriptComponent {
    @input
    private image!: Image;

    @input
    private slider!: Slider;

    private targetMonotone: number = 0.0;
    private currentMonotone: number = 0.0;
    private lerpSpeed: number = 5.0; // Adjust for smoothness

    onAwake(): void {
        if (!this.image || !this.slider) {
            return;
        }
        // Clone the material so we have a unique instance
        this.image.mainMaterial = this.image.mainMaterial.clone();

        // Set initial monotone
        this.setMonotone(this.slider.currentValue ?? 0.0);
        // Listen for slider value changes
        this.slider.onValueUpdate.add(this.onSliderValueChanged.bind(this));
        // Start update loop for smooth transition
        this.createEvent("UpdateEvent").bind(this.update.bind(this));
    }

    private onSliderValueChanged(value: number) {
        this.targetMonotone = value;
    }

    private update() {
        // Smoothly interpolate currentMonotone to targetMonotone
        if (Math.abs(this.currentMonotone - this.targetMonotone) > 0.001) {
            this.currentMonotone += (this.targetMonotone - this.currentMonotone) * Math.min(this.lerpSpeed * getDeltaTime(), 1.0);
            this.setMonotone(this.currentMonotone);
        }
    }

    private setMonotone(amount: number) {
        if (!this.image || !this.image.mainMaterial || !this.image.mainMaterial.mainPass) {
            return;
        }
        if (typeof this.image.mainMaterial.mainPass["MonotoneAmount"] !== "undefined") {
            this.image.mainMaterial.mainPass["MonotoneAmount"] = amount;
        }
    }
} 
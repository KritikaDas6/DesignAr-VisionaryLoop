import { Slider } from "SpectaclesInteractionKit.lspkg/Components/UI/Slider/Slider";

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
        print("Slider value changed: " + value);
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
        if (!this.image) {
            print("[SliderMonotoneEditor] ERROR: image is not assigned.");
            return;
        }
        if (!this.image.mainMaterial) {
            print("[SliderMonotoneEditor] ERROR: image.mainMaterial is not assigned.");
            return;
        }
        if (!this.image.mainMaterial.mainPass) {
            print("[SliderMonotoneEditor] ERROR: image.mainMaterial.mainPass is not assigned.");
            return;
        }
        if (typeof this.image.mainMaterial.mainPass["MonotoneAmount"] === "undefined") {
            print("[SliderMonotoneEditor] ERROR: MonotoneAmount property is not defined on mainPass.");
            return;
        }
        print("[SliderMonotoneEditor] Setting MonotoneAmount to: " + amount);
        this.image.mainMaterial.mainPass["MonotoneAmount"] = amount;
    }
} 
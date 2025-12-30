# Scene Hierarchy Setup

A visual guide showing the scene structure and setup requirements for the application.

## Complete Scene Tree

```
Scene (Root)
│
├── 📦 GameManager 
│
├── 🏠 Intro_State
│   └── 🎮 PlayButton
│
├── 🎨 ImageGen_State 
│   │
│   ├── 📖 imageGenGuide (child)
│   │
│   ├── 🎤 micButtonContainer (child)
│   │
│   ├── ⏳ generatingSpinner (child)
│   │
│   ├── 🖼️ imagePreviewContainer (child)
│   │
│   └── 💬 textHint (child)
│
├── 📐 Projection_State
│   ├── 🖼️ ProjectedImageObject 
│   │
│   ├── 📖 projectionGuide
│   │
│   ├── 📍 ProjectButton
│   │
│   ├── ✅ confirmButton
│   │
│   ├── 🔄 resetButton
│   │
│   └── 📚 HowToEdit_State 
│       ├── 🎓 HowToEditController 
│       │
│       ├── ➡️ nextButton
│       │
│       ├── ⬅️ backButton
│       │
│       └── ✅ doneButton
│
├── ✋ HandMenu_State
│   ├── 🎛️ HandMenuController
│   │
│   ├── 🏠 HomeButton
│   │
│   ├── 🔒 LockButton
│   │
│   ├── ✏️ EditButton
│   │
│   └── 📊 sliderMenuPanel
│       ├── 🎚️ OpacitySlider
│       │
│       └── 🎨 SaturationSlider
│
└── ✏️ Tracing_State
    └── (Tracing state UI - future implementation)
```

## Legend

- 📦 = Root/Manager object
- 🎮 = Button object
- 🎯 = Controller script
- 🎙️ = Voice/ASR component
- 🖼️ = Image object
- 📖 = Guide/hint object
- 🎛️ = UI Controller
- 🎚️ = Slider component

## State Flow

```
INTRO
  ↓ (PlayButton clicked)
IMAGE_GEN
  ↓ (Voice prompt → Image generated → ConfirmImageButton clicked)
PROJECTION (SURFACE_DETECTION)
  ↓ (Surface detected → ProjectButton clicked)
PROJECTION (PLACED)
  ↓ (confirmButton clicked)
HOW_TO_EDIT
  ↓ (Tutorial completed)
TRACING (or back to PROJECTION)
```


# DesignAR VisionaryLoop - Scene Hierarchy & Flow

## Scene Hierarchy Structure

```
Scene (Root)
│
├── INTRO Root (introRoot)
│   └── Play Button
│       └── Interactable Component
│
├── IMAGE_GEN Root (imageGenRoot)
│   ├── Image Gen Guide (imageGenGuide)
│   ├── Mic Button Container (micButtonContainer)
│   │   ├── Mic On Button
│   │   └── Mic Off Button
│   ├── Generating Spinner (generatingSpinner)
│   ├── Image Preview Container (imagePreviewContainer)
│   │   ├── Generated Image Display
│   │   └── Confirm Image Button (imageConfirmButton)
│   └── Text Hint (textHint)
│
├── PROJECTION Root (projectionRoot)
│   ├── Projection Guide (projectionGuide)
│   ├── Place Button (placeButton)
│   │   └── Interactable Component
│   ├── Confirm Button (WorldQueryHit.confirmButton)
│   │   └── Interactable Component
│   └── Reset/Decline Button (WorldQueryHit.resetButtonObject)
│       └── Interactable Component (WorldQueryHit.resetInteractable)
│
├── Projected Image Object (projectedImageObject)
│   ├── Image Component
│   ├── WorldQueryHit Component
│   │   ├── targetObject: projectedImageObject (self)
│   │   ├── resetInteractable: Reset button interactable
│   │   ├── resetButtonObject: Reset button SceneObject
│   │   └── confirmButton: Confirm button SceneObject
│   └── ContainerFrame Component (optional)
│
├── HOW_TO_EDIT Root (howToEditRoot)
│   ├── Tutorial Object 1 (tutorialObject1)
│   └── Tutorial Object 2 (tutorialObject2)
│
├── TRACING Root (tracingRoot)
│   └── Tracing UI elements
│
└── Hand Menu Root (handMenuRoot)
    ├── Home Button
    │   └── Interactable Component
    ├── Lock Button (lockButtonObject)
    │   ├── Interactable Component
    │   └── ButtonFeedback_Modified Component
    ├── Edit Button (editButtonObject)
    │   ├── Interactable Component
    │   └── ButtonFeedback_Modified Component
    └── Slider Menu Panel (sliderMenuPanel)
        ├── Opacity Slider
        │   └── Slider Component
        └── Saturation Slider
            └── Slider Component
```

## Application Flow

### State Flow Diagram

```
INTRO
  │
  │ [Play Button Clicked]
  ▼
IMAGE_GEN
  │
  ├── READY_TO_RECORD
  │   │ [Mic Button Clicked]
  │   ▼
  │   RECORDING
  │   │ [Recording Complete]
  │   ▼
  │   GENERATING
  │   │ [Image Generated]
  │   ▼
  │   PREVIEW
  │   │ [Confirm Image Button Clicked]
  │   ▼
  │   SURFACE_DETECTION
  │   │ [Place Button Clicked]
  │   ▼
  │   PLACED
  │   │ [Confirm Button Clicked] ──┐
  │   │ [Reset Button Clicked] ────┼──► SURFACE_DETECTION (loop back)
  │   └─────────────────────────────┘
  │
  │ [Confirm Button Clicked]
  ▼
HOW_TO_EDIT
  │
  │ [Tutorial Complete]
  ▼
TRACING
  │
  │ [Home Button Clicked]
  ▼
INTRO (loop back)
```

## Component Relationships

### GameManager (Central Controller)
- **Manages**: All state transitions, root object visibility
- **Listens to**: Button clicks, state changes
- **Controls**: Which root objects are enabled/disabled

### ProjectionController (Projection Coordinator)
- **Manages**: Place button visibility, WorldQueryHit coordination
- **Listens to**: GameManager state changes
- **Controls**: Place button show/hide based on state

### WorldQueryHit (Placement Logic)
- **Manages**: Surface detection, image placement, confirm/reset buttons
- **Listens to**: Manual placement triggers
- **Controls**: Confirm and reset button visibility, image positioning

### HandMenuController (Hand Menu UI)
- **Manages**: Home, lock, edit buttons, opacity/saturation sliders
- **Listens to**: GameManager state/lock/opacity changes
- **Controls**: Hand menu visibility, button states, slider values

### ImageGenController (Image Generation)
- **Manages**: Voice recording, image generation, preview
- **Listens to**: Mic button, ASR events
- **Controls**: Image generation flow, preview display

## User Journey

### 1. INTRO State
- **Visible**: Play button
- **User Action**: Click play button
- **Result**: Transition to IMAGE_GEN → READY_TO_RECORD

### 2. IMAGE_GEN → READY_TO_RECORD
- **Visible**: Mic button, guide
- **User Action**: Click mic button
- **Result**: Transition to RECORDING

### 3. IMAGE_GEN → RECORDING
- **Visible**: Mic button (recording), spinner
- **User Action**: Speak prompt, mic button stops recording
- **Result**: Transition to GENERATING

### 4. IMAGE_GEN → GENERATING
- **Visible**: Spinner
- **User Action**: Wait
- **Result**: Transition to PREVIEW (when image ready)

### 5. IMAGE_GEN → PREVIEW
- **Visible**: Generated image, confirm button, text hint
- **User Action**: Click confirm button
- **Result**: Transition to SURFACE_DETECTION

### 6. IMAGE_GEN → SURFACE_DETECTION
- **Visible**: 
  - Projected image (following raycast)
  - Place button
  - Projection guide
  - Hand menu (home, lock, edit buttons)
- **User Action**: Click place button
- **Result**: Transition to PLACED

### 7. IMAGE_GEN → PLACED
- **Visible**:
  - Projected image (fixed position)
  - Confirm button
  - Reset/Decline button
  - Hand menu
- **User Action**: 
  - Click confirm → Transition to HOW_TO_EDIT
  - Click reset → Transition back to SURFACE_DETECTION
- **Result**: Image stays visible in HOW_TO_EDIT

### 8. HOW_TO_EDIT State
- **Visible**:
  - Projected image (still visible from previous state)
  - Tutorial objects
  - Hand menu
- **User Action**: Complete tutorial
- **Result**: Transition to TRACING

### 9. TRACING State
- **Visible**:
  - Projected image (still visible)
  - Tracing UI
  - Hand menu
- **User Action**: Use tracing features
- **Result**: Can go home anytime

### 10. Back to INTRO
- **User Action**: Click home button (from hand menu)
- **Result**: 
  - All states reset
  - Projected image disabled
  - Returns to INTRO state

## Key Component Connections

### ProjectionController ↔ WorldQueryHit
- **ProjectionController** finds **WorldQueryHit** component on targetObject
- **ProjectionController** calls `worldQueryHit.manualPlace()` when place button clicked
- **WorldQueryHit** controls confirm/reset button visibility
- **WorldQueryHit** handles image positioning via surface detection

### GameManager ↔ All Controllers
- **GameManager** is the single source of truth for state
- All controllers subscribe to **GameManager** events:
  - `onStateChange` - Main state transitions
  - `onSubStateChange` - Sub-state changes within IMAGE_GEN
  - `onLockChange` - Lock state changes
  - `onOpacityChange` - Opacity changes

### HandMenuController ↔ GameManager
- **HandMenuController** listens to state changes to show/hide buttons
- **HandMenuController** calls `gameManager.goHome()` when home clicked
- **HandMenuController** calls `gameManager.setLocked()` when lock toggled
- **HandMenuController** calls `gameManager.setImageOpacity()` when opacity changed

## Button Visibility Logic

### Place Button
- **Shown**: SURFACE_DETECTION state
- **Hidden**: All other states
- **Controlled by**: ProjectionController

### Confirm Button (after placement)
- **Shown**: PLACED state
- **Hidden**: All other states
- **Controlled by**: WorldQueryHit

### Reset/Decline Button
- **Shown**: PLACED state
- **Hidden**: All other states
- **Controlled by**: WorldQueryHit

### Hand Menu Buttons
- **Home Button**: Always visible (except in INTRO)
- **Lock Button**: Visible in IMAGE_GEN (PLACED), HOW_TO_EDIT, TRACING
- **Edit Button**: Visible in IMAGE_GEN (PLACED), HOW_TO_EDIT, TRACING
- **Sliders**: Visible when edit button panel is open

## State Transition Rules

### From INTRO
- **To**: IMAGE_GEN (via play button)
- **Action**: Reset all previous state

### From IMAGE_GEN
- **To**: HOW_TO_EDIT (via confirm button after placement)
- **Action**: Keep projected image visible
- **To**: INTRO (via home button)
- **Action**: Reset placement, hide projected image

### From HOW_TO_EDIT
- **To**: TRACING (after tutorial complete)
- **Action**: Keep projected image visible
- **To**: INTRO (via home button)
- **Action**: Reset all state

### From TRACING
- **To**: INTRO (via home button)
- **Action**: Reset all state

## Important Notes

1. **Projected Image Persistence**: The projected image stays visible when transitioning from PLACED → HOW_TO_EDIT → TRACING. It only disappears when going to INTRO.

2. **Placement Reset**: Placement is reset when:
   - Going to INTRO (home)
   - Clicking reset button (goes back to SURFACE_DETECTION)
   - Entering SURFACE_DETECTION from INTRO (fresh start)

3. **Button Coordination**: 
   - Place button and Confirm/Reset buttons never show at the same time
   - Place button shows in SURFACE_DETECTION
   - Confirm/Reset buttons show in PLACED

4. **State Guards**: Multiple guards prevent infinite loops:
   - ProjectionController checks if already active before resetting
   - WorldQueryHit doesn't trigger state changes when reset is called programmatically






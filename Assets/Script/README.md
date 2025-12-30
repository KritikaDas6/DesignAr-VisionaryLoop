# Architecture Documentation

## Table of Contents

### [Overview](#overview)
### [Modified Script List](#modified-script-list)
### [Newly Created Scripts](#newly-created-scripts)
### [All Script Descriptions](#all-script-descriptions)
- [Core Components](#core-components)
- [Controllers](#controllers)
- [Interaction Modules](#interaction-modules)
- [Utilities](#utilities)
- [Storage](#storage)
- [Effects](#effects)
- [UI Components](#ui-components)
- [UI Sliders](#ui-sliders)
- [Setup Requirements](#setup-requirements)
- [Usage Guidelines](#usage-guidelines)
- [Future Considerations](#future-considerations)

---

## Overview {#overview}

This codebase uses a modular, scalable architecture with clear separation of concerns. Controllers orchestrate game logic, utilities provide reusable functionality, and interaction modules handle specific features. This structure ensures maintainability, type safety, and easy extensibility.

---

## Modified Script List {#modified-script-list}

The following scripts were refactored and improved during the architecture migration:

### Interaction Modules
- **WorldQueryHit_Modified.ts**
- **ContainerFrameLocker.ts**
- **ASRQueryController.ts**

### Storage
- **PersistentStorageManager.ts**

### Utilities
- **HandFollowerWithAngleRange.ts**

### Effects
- **VFXBurst.ts**
- **AnimationStop.ts**

### UI Components
- **ButtonFeedBack_Modified.ts**

---

## Newly Created Scripts {#newly-created-scripts}

The following scripts were created during the architecture refactoring:

### Core Components
- **Core/GameState.ts**
- **Core/Constants/ObjectNames.ts**

### Controllers
- **GameManager.ts**
- **HandMenuController.ts**
- **HowToEditController.ts**
- **ImageGenController.ts**
- **StateManager.ts**
- **UIVisibilityController.ts**
- **ButtonVisibilityController.ts**
- **ProjectionController.ts**

### Interaction Modules
- **PlacementController.ts**
- **ProjectionUIHandler.ts**
- **ContainerFrameEdgeAttach.ts**

### Utilities
- **Base/BaseController.ts**
- **Logging/Logger.ts**
- **UI/SliderManager.ts**
- **UI/UIVisibilityManager.ts**
- **TypeGuards.ts**
- **MaterialTextureReplacer.ts**

### UI Components
- **Buttons/ButtonManager.ts**
- **Buttons/ConfirmImageButton.ts**
- **Buttons/PlayButton.ts**

### UI Sliders
- **Sliders/SliderMonotoneEditor.ts**
- **Sliders/SliderTransparentEditor.ts**

---

## All Script Descriptions {#all-script-descriptions}

## Core Components {#core-components}

### Core/GameState.ts [New]
**Purpose**: Defines the central state machine enums and types for the entire application.  
**Setup**: Import and use `GameState`, `ImageGenSubState`, and related types throughout controllers.  
**Usage**: Import `GameState` and `ImageGenSubState` enums in controllers to access state values and perform type-safe state comparisons and transitions.

### Core/Constants/ObjectNames.ts [New]
**Purpose**: Provides type-safe constants for object names, eliminating magic strings throughout the codebase.  
**Setup**: Import `ObjectNames` and helper functions (`isButtonType`, `isGuideType`) to check object names safely.  
**Usage**: Use `ObjectNames.BUTTON_*` constants and helper functions like `isButtonType()` or `isGuideType()` instead of hardcoded strings when checking object names in controllers.

---

## Controllers {#controllers}

> **Note**: Controllers orchestrate the application flow and manage state transitions. They coordinate between different modules to make transitioning from one state to another easier, ensuring smooth user experience and proper initialization order.

### Controllers/GameManager.ts [New]
**Purpose**: Central orchestrator that coordinates state management, UI visibility, and button visibility through delegated modules.  
**Setup**: Attach to root scene object, wire all scene object references, and initialize as singleton.  
**Usage**: Access via `GameManager.getInstance()` from other controllers to get current state, trigger state transitions, and manage UI/button visibility. Delegates to StateManager, UIVisibilityController, and ButtonVisibilityController.

### Controllers/StateManager.ts [New]
**Purpose**: Handles all state transitions, sub-state management, and state-related business logic extracted from GameManager.  
**Setup**: Instantiated by GameManager with references to scene objects and event emitters.  
**Usage**: Used internally by GameManager to manage state transitions, sub-states, and emit state change events. Controllers call GameManager methods which delegate to StateManager.

### Controllers/UIVisibilityController.ts [New]
**Purpose**: Manages visibility of UI elements (guides, containers, states) based on current game state and sub-state.  
**Setup**: Instantiated by GameManager with references to all scene objects that need visibility control.  
**Usage**: Used internally by GameManager to show/hide UI elements based on current state. Calls `enableAllChildren()` and `hideAllStates()` methods to manage visibility of guides, containers, and state objects.

### Controllers/ButtonVisibilityController.ts [New]
**Purpose**: Handles visibility and interaction state of all buttons (Project, Confirm, Reset, Next, Back, Done) based on game state.  
**Setup**: Instantiated by GameManager with references to button SceneObjects and Interactable components.  
**Usage**: Used internally by GameManager to show/hide buttons and enable/disable button interactions based on current game state. Methods like `setProjectButtonVisible()` and `setConfirmResetButtonsVisible()` control button states.

### Controllers/ImageGenController.ts [New]
**Purpose**: Manages the image generation workflow including ASR queries, image generation, preview, and confirmation.  
**Setup**: Attach to ImageGen_State parent object, wire ASR module, image generator, and UI references.  
**Usage**: Handles voice prompt recording via ASR, generates images using ImageGenerator utility, displays preview, and manages confirmation flow. Coordinates with GameManager for state transitions.

### Controllers/ProjectionController.ts [New]
**Purpose**: Orchestrates surface detection, image placement, and projection UI through delegated modules (WorldQueryHit_Modified, PlacementController, ProjectionUIHandler).  
**Setup**: Attach to ProjectedImageObject, wire camera, target object, project button interactable, and related scene objects.  
**Usage**: Performs hit tests via WorldQueryHit_Modified, manages placement via PlacementController, and handles UI/button visibility via ProjectionUIHandler. Responds to project button clicks and manages the projection workflow.

### Controllers/HandMenuController.ts [New]
**Purpose**: Controls the hand menu UI including opacity/saturation sliders, home/lock/edit buttons, and menu visibility.  
**Setup**: Attach to HandMenu_State, wire sliders, buttons, target image, and GameManager reference.  
**Usage**: Uses ButtonManager to setup home/lock/edit buttons, SliderManager for opacity and saturation sliders. Manages menu visibility and coordinates with GameManager for state transitions.

### Controllers/HowToEditController.ts [New]
**Purpose**: Manages the tutorial flow for teaching users how to edit projected images with step-by-step navigation.  
**Setup**: Attach to HowToEdit_State, wire navigation buttons (Next, Back, Done) and tutorial content references.  
**Usage**: Uses ButtonManager to setup Next, Back, and Done buttons. Manages tutorial step progression, shows/hides tutorial content, and transitions to main game flow when tutorial completes.

---

## Interaction Modules {#interaction-modules}

### Interaction/WorldQueryHit_Modified.ts [Modified]
**Purpose**: Handles hit test logic, surface detection, and object positioning based on world query results.  
**Setup**: Used internally by ProjectionController, requires camera, target object, and filter settings.  
**Usage**: Called by ProjectionController to perform hit tests using world query. Returns hit test results with surface information, which are used to position projected images on detected surfaces.  
**Modifications**: Turned into a reusable class-based module. Added callback interface (`WorldQueryHit_ModifiedCallbacks`) for surface hit and no-hit events, state management interface for placement tracking, and cooldown/reset logic. Now uses Logger for debugging instead of print statements.

### Interaction/PlacementController.ts [New]
**Purpose**: Manages placement state, locking behavior, reset logic, and position/rotation tracking for projected images.  
**Setup**: Used internally by ProjectionController, initialized with target object and callbacks.  
**Usage**: Called by ProjectionController to place images at hit test positions, track placement state, handle locking/unlocking, and reset image position. Manages cooldown timers and placement validation.

### Interaction/ProjectionUIHandler.ts [New]
**Purpose**: Handles button setup, UI enabling/disabling, and button visibility management for the projection workflow.  
**Setup**: Used internally by ProjectionController, initialized with button interactables and GameManager reference.  
**Usage**: Called by ProjectionController to setup project button, enable/disable UI elements, and manage button visibility based on placement state. Coordinates with GameManager for button state updates.

### Interaction/ASRQueryController.ts [Modified]
**Purpose**: Processes voice recognition queries and triggers image generation requests based on user speech input.  
**Setup**: Attach to mic button container, wire ASR module and ImageGenController reference.  
**Usage**: Listens for mic button interactions, processes ASR queries to capture voice prompts, and passes transcribed text to ImageGenController for image generation.  
**Modifications**: Enhanced error handling with ASR module validation and try-catch blocks. Added `onTranscriptionUpdateEvent` for real-time transcription updates. Added timeout guard (8 seconds) to prevent hanging sessions. Improved mic state switching with default/active icon management. Added session reset functionality to handle errors and cancellations gracefully.

### Interaction/ContainerFrameLocker.ts [Modified]
**Purpose**: Manages container frame locking behavior for projected images, allowing users to lock/unlock image positioning.  
**Setup**: Attach to projected image container frame, wire lock button and target image references.  
**Usage**: Responds to lock button interactions to toggle lock state. When locked, prevents image from being moved or repositioned. When unlocked, allows normal placement behavior.  
**Modifications**: Added lock/unlock functionality with `lockInteractable` input, `isLocked` state, and `toggleLock()`, `lock()`, `unlock()` methods. Added lock event system (`onLock`, `onUnlock` events). Integrated lock state with frame interaction - when locked, disables all interactables and prevents scaling/translation. Disabled close and follow buttons (hidden and scaled to zero) as they should never show in this implementation.

### Interaction/ContainerFrameEdgeAttach.ts [New]
**Purpose**: Keeps an object positioned at a specific distance from a ContainerFrameLocker edge, automatically updating position when the frame scales or moves.  
**Setup**: Attach to object that needs edge attachment, wire ContainerFrame reference and specify target edge (top, bottom, left, right).  
**Usage**: Automatically updates attached object's position relative to specified container frame edge. Maintains offset distance and updates position when frame scales or moves during user interaction.

---

## Utilities {#utilities}

### Utilities/Base/BaseController.ts [New]
**Purpose**: Base class providing common functionality (GameManager access, logging, error handling) for all controllers.  
**Setup**: Extend this class instead of BaseScriptComponent for controllers that need shared functionality.  
**Usage**: Extend this class in controllers (e.g., `class MyController extends BaseController`) to automatically get `this.gameManager` access and `this.log` logger instance. Provides consistent error handling patterns.

### Utilities/Logging/Logger.ts [New]
**Purpose**: Centralized logging system with log levels (DEBUG, INFO, WARN, ERROR) that can be disabled for production.  
**Setup**: Import Logger and use `Logger.create("ContextName")` to get logger instances, replace all print statements.  
**Usage**: Create logger instances with `Logger.create("ContextName")`, then use `logger.info()`, `logger.debug()`, `logger.warn()`, or `logger.error()` instead of print statements. Can be globally disabled for production.

### Utilities/UI/ButtonManager.ts [New]
**Purpose**: Standardized button setup utility that handles trigger events, hover states, and toggle behavior consistently.  
**Setup**: Import and use `ButtonManager.setupButton()`, `setupToggleButton()`, or `setupMethodButton()` with interactable and callbacks.  
**Usage**: Call `ButtonManager.setupButton(interactable, callback)` for standard buttons, `setupToggleButton(interactable, onToggle)` for toggle buttons, or `setupMethodButton(interactable, methodName, target)` for method-based buttons. Handles event binding and error checking automatically.

### Utilities/UI/SliderManager.ts [New]
**Purpose**: Manages slider setup with smooth interpolation, retry logic for initialization timing issues, and consistent value handling.  
**Setup**: Import and use `SliderManager.setupSlider()` with slider component, callback, and optional configuration.  
**Usage**: Call `SliderManager.setupSlider(slider, callback, options)` to setup sliders with automatic retry logic for initialization. Handles cases where `onValueUpdate` may not be ready immediately, provides smooth interpolation between values.

### Utilities/UI/UIVisibilityManager.ts [New]
**Purpose**: Centralized UI visibility management that consolidates multiple `enableAllChildren` implementations with state-aware logic.  
**Setup**: Import and use helper functions to enable/disable UI elements based on object names and current game state.  
**Usage**: Import helper functions to enable/disable UI elements based on object names and current game state. Provides state-aware visibility management that prevents UI conflicts.

### Utilities/TypeGuards.ts [New]
**Purpose**: Type-safe checking utilities for common components (Interactable, Slider, GameManager) to prevent runtime errors.  
**Setup**: Import and use `isValidInteractable()`, `isValidSlider()`, `isValidGameManager()` before accessing component properties.  
**Usage**: Call `isValidInteractable(component)`, `isValidSlider(component)`, or `isValidGameManager(manager)` before accessing component properties to safely check if components exist and are valid.

### Utilities/MaterialTextureReplacer.ts [New]
**Purpose**: Utility for replacing textures on materials, useful for dynamically updating image materials during runtime.  
**Setup**: Attach to SceneObject with Interactable, wire target material and original/replacement textures.  
**Usage**: When user interacts with the object, toggles between original and replacement textures on the target material. Useful for dynamic material updates during runtime.

### Utilities/HandFollowerWithAngleRange.ts [Modified]
**Purpose**: Makes an object follow hand position within a specified angle range, providing constrained hand tracking behavior.  
**Setup**: Attach to SceneObject that should follow hands, configure angle range and hand selection.  
**Usage**: Automatically updates object position to follow hand within specified angle range. Constrains movement to stay within configured min/max angle limits, useful for UI elements that should track hands but remain within bounds.  
**Modifications**: Added angle range constraints (`minHandAngle`, `maxHandAngle` parameters) to restrict hand following to specific angle ranges relative to camera forward direction. Added configurable position offsets (`positionOffsetX`, `positionOffsetY`, `positionOffsetZ`) and rotation offsets (`rotationOffsetX`, `rotationOffsetY`, `rotationOffsetZ`) for fine-tuning object placement. Integrated VectorUtils for scalar vector operations. Added auto-hide functionality when hand is not tracked for 10+ frames.

---

## Storage

### Storage/PersistentStorageManager.ts [Modified]
**Purpose**: Manages persistent data storage for user preferences, image history, and application state across sessions.  
**Setup**: Use `PersistentStorageManager.getInstance()` to access singleton instance, call save/load methods as needed.  
**Usage**: Access singleton with `PersistentStorageManager.getInstance()`, then call `save(key, data)` and `load(key)` methods to persist and retrieve data across sessions. Handles serialization/deserialization automatically.  
**Modifications**: Added comprehensive image history management system with `addImageToHistory()`, `getImageFromHistory()`, `setActiveImage()`, `deleteImageFromHistory()`, and `clearImageHistory()` methods. Images are stored with unique IDs, prompts, timestamps, and active state tracking. Added automatic history trimming when exceeding max images limit. Added active image tracking to maintain current image across sessions. Images are stored separately from session data to handle large base64 strings efficiently.

---

## Effects

### Effects/VFXBurst.ts [Modified]
**Purpose**: Activates visual effects when user's hand is within a specific range of a target object, using distance-based detection with responsive range.  
**Setup**: Attach to VFX SceneObject, wire target object, configure hand selection and position offset.  
**Usage**: Automatically activates VFX when hand is within configured distance range of target object. Updates VFX position relative to hand with offset, and deactivates when hand moves out of range.  
**Modifications**: Added responsive range calculation based on target object size. Range can be calculated dynamically using `minDistanceMultiplier` and `maxDistanceMultiplier` relative to object scale, or use fixed distances. Added `useResponsiveRange` toggle to switch between responsive and fixed range modes. Range automatically adjusts based on object's average scale (x, y, z), ensuring VFX activation distance scales appropriately with object size.

### Effects/AnimationStop.ts [Modified]
**Purpose**: Controls animation playback timing, pausing animations at specific frames and optionally revealing objects or playing audio at precise moments.  
**Setup**: Attach to animated object, wire audio track and reveal object references, configure timing.  
**Usage**: Starts animation playback, pauses at configured time (default 3.15s), optionally reveals objects and plays audio at precise moments. Provides synchronized animation and audio effects.  
**Modifications**: Added audio synchronization with low-latency playback mode (`Audio.PlaybackMode.LowLatency`) for better timing precision. Audio starts at 0.1s delay after animation start to ensure proper synchronization. Enhanced animation control with proper reset and play calls before pausing. Added reveal object functionality that enables objects at pause moment for synchronized reveals.

---

## UI Components {#ui-components}

### UI/Buttons/ButtonManager.ts [New]
**Purpose**: See Utilities section above (same file, documented in both locations for discoverability).

### UI/Buttons/ConfirmImageButton.ts [New]
**Purpose**: Handles confirmation button click for generated images, triggering state transition to projection phase.  
**Setup**: Attach to confirm button SceneObject, wire ImageGenController reference.  
**Usage**: Responds to confirm button click, calls ImageGenController to confirm the generated image, and triggers state transition to projection phase.

### UI/Buttons/PlayButton.ts [New]
**Purpose**: Initiates the main application flow, transitioning from intro state to image generation state.  
**Setup**: Attach to play button SceneObject, wire GameManager reference.  
**Usage**: Responds to play button click, calls GameManager to transition from intro state to image generation state, starting the main application flow.

### UI/Buttons/ButtonFeedBack_Modified.ts [Modified]
**Purpose**: Provides visual feedback for different button types (Pinch Button, Toggle Button, State Button) with customizable appearance and behavior based on button state.  
**Setup**: Attach to button SceneObject, configure button type and visual feedback settings.  
**Usage**: Automatically provides visual feedback (hover states, pinch states, toggle states) based on configured button type. Updates button appearance during user interactions to provide visual feedback.  
**Modifications**: Enhanced button feedback system with support for multiple button types (Pinch Button, Toggle Button, State Button) via `buttonType` parameter. Added glow mesh support with independent material and blend shape animations. Added configurable blend shape weight control (`maxBlendShapeWeight`) and customizable blend shape name. Supports different materials for idle, hover, and pinch states. Added persistent pinched state option for State Button type.

---

## UI Sliders {#ui-sliders}

### UI/Sliders/SliderMonotoneEditor.ts [New]
**Purpose**: Controls image monotone (grayscale) effect via slider with smooth interpolation for visual transitions.  
**Setup**: Attach to slider SceneObject, wire image component and slider component references.  
**Usage**: Listens to slider value changes and smoothly interpolates monotone/grayscale effect on the target image material. Updates image appearance in real-time as user adjusts slider.

### UI/Sliders/SliderTransparentEditor.ts [New]
**Purpose**: Controls image transparency/opacity via slider with smooth interpolation for visual transitions.  
**Setup**: Attach to slider SceneObject, wire image component and slider component references.  
**Usage**: Listens to slider value changes and smoothly interpolates alpha/opacity on the target image material. Updates image transparency in real-time as user adjusts slider.

---

## Setup Requirements {#setup-requirements}

### Scene Hierarchy
All controllers must be attached to the correct SceneObjects as documented in `SCENE_HIERARCHY.md`. The hierarchy uses `*_State` naming convention (e.g., `Intro_State`, `ImageGen_State`, `Projection_State`) to clearly identify state containers.

### GameManager Setup
GameManager must be attached to the root scene object and initialized first, as it acts as a singleton that other controllers depend on. All scene object references must be wired correctly for state management to function.

### Module Dependencies
Controllers follow a clear dependency chain: GameManager → StateManager/UIVisibilityController/ButtonVisibilityController → ProjectionController → WorldQueryHit_Modified/PlacementController/ProjectionUIHandler. This hierarchy ensures proper initialization order.

---

## Usage Guidelines {#usage-guidelines}

1. **Always extend BaseController** for new controllers that need GameManager access
2. **Use Logger instead of print** for all logging needs
3. **Use ButtonManager** for any button setup to ensure consistency
4. **Use ObjectNames constants** instead of hardcoded strings
5. **Follow the controller pattern**: Orchestrators delegate to focused modules
6. **Keep modules focused**: Each module should have a single, clear responsibility


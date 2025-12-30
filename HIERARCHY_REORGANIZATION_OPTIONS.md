# Hierarchy Reorganization Options

## Current Structure (Separated)

```
Scene
├── projectionRoot
│   ├── projectionGuide
│   └── placeButton
├── projectedImageObject (with WorldQueryHit component)
│   └── [Image component, etc.]
├── confirmButton (separate object)
└── resetButtonObject (separate object)
```

**Problem**: Guide and buttons don't move with the image, breaking immersion.

---

## Option 1: Move Everything Under Projected Image (Recommended)

### New Hierarchy Structure

```
Scene
└── projectedImageObject (with WorldQueryHit component)
    ├── Image Component
    ├── projectionGuide (moved here)
    ├── placeButton (moved here)
    ├── confirmButton (moved here)
    └── resetButtonObject (moved here)
```

### Implementation Steps

1. **In Lens Studio Scene Hierarchy:**
   - Drag `projectionGuide` to be a child of `projectedImageObject`
   - Drag `placeButton` to be a child of `projectedImageObject`
   - Drag `confirmButton` to be a child of `projectedImageObject`
   - Drag `resetButtonObject` to be a child of `projectedImageObject`

2. **Code Changes Needed:**
   - Update references to find these objects as children of `projectedImageObject`
   - No need to change input fields - they'll still work, just point to children now
   - The objects will automatically follow the image's transform

### Pros
- ✅ Simple - just move objects in hierarchy
- ✅ Automatic - objects follow image transform automatically
- ✅ No code changes needed for positioning
- ✅ Most immersive experience

### Cons
- ⚠️ Objects rotate with image (may need offset/rotation adjustments)
- ⚠️ Objects scale with image (if image is scaled)

---

## Option 2: Use Transform Offsets (Keep Separate but Follow) ⭐ RECOMMENDED

### New Hierarchy Structure

```
Scene
├── projectedImageObject (with WorldQueryHit component)
│   └── [Image component]
└── projectionUI (sibling, not child - prevents scaling!)
    ├── projectionGuide
    ├── placeButton
    ├── confirmButton
    └── resetButtonObject
```

### Implementation Steps

1. **Keep UI as siblings** (not children) of `projectedImageObject` to prevent automatic scaling

2. **Create `FollowTargetUI` script** (already created: `Assets/Script/StabilizeUI.ts`)
   - Rename the class to `FollowTargetUI` if you prefer
   - This script makes UI follow position but maintain its own scale and rotation

3. **In Lens Studio:**
   - Keep `projectionUI` as a sibling of `projectedImageObject` (same parent)
   - Add `FollowTargetUI` component to `projectionUI`
   - Set `targetObject` to `projectedImageObject`
   - Set `positionOffset` (e.g., `(0, 0.5, 0)` for 0.5 units above)
   - Set `keepUpright = true` (UI stays upright)
   - Set `maintainScale = true` (UI doesn't scale)

### Pros
- ✅ UI maintains constant size (doesn't scale with image)
- ✅ UI stays upright (doesn't rotate with image)
- ✅ Can control offset precisely
- ✅ More control over UI positioning
- ✅ Best for immersive experience without scaling issues
- ✅ Configurable: instant following (no lag) or smooth following (reduces jitter)

### Cons
- ⚠️ Requires script component (already created)
- ⚠️ Minimal lag with instant following (~1 frame = 16ms at 60fps, usually imperceptible)
- ⚠️ Smooth following adds intentional lag but reduces jitter

### Performance Notes
- **Instant Following** (`useSmoothing = false`): 
  - Minimal lag: ~1 frame delay (16ms at 60fps)
  - Usually imperceptible to users
  - May show slight jitter if image moves very erratically
  
- **Smooth Following** (`useSmoothing = true`):
  - Intentional lag for smoother motion
  - Reduces jitter from erratic movement
  - Adjustable with `smoothingSpeed` parameter

---

## Option 3: Hybrid Approach (NOT Recommended - UI will scale)

⚠️ **Note**: This option makes UI children of the image, which means UI WILL scale with the image. 
If you don't want scaling, use **Option 2** instead.

### New Hierarchy Structure

```
Scene
└── projectedImageObject (with WorldQueryHit component)
    ├── Image Component
    ├── projectionUI (new container - CHILD, so will scale!)
    │   ├── projectionGuide
    │   ├── placeButton
    │   ├── confirmButton
    │   └── resetButtonObject
    └── [Other children if any]
```

### Why Not Recommended
- ❌ UI will scale with image (if image scales, UI scales)
- ❌ Requires constant scale override in script (less efficient)
- ❌ More complex to prevent scaling

### If You Still Want This:
You'd need to add `FollowTargetUI` script and constantly override scale, which is less efficient than Option 2.

---

## Recommended Implementation: Hybrid Approach (Child with Smart Positioning) ⭐ BEST

### New Hierarchy Structure

```
Scene
└── projectedImageObject (with WorldQueryHit component)
    ├── Image Component
    └── projectionUI (CHILD - for zero lag)
        ├── projectionGuide
        ├── placeButton
        ├── confirmButton
        └── resetButtonObject
```

### Why This is Best
- ✅ **Zero lag** - Position follows instantly as child
- ✅ **No scaling** - Scale overridden every frame
- ✅ **No rotation** - Rotation overridden every frame  
- ✅ **Smart positioning** - Offset adjusts with parent scale to prevent overlap
- ✅ **Best performance** - Minimal CPU cost for scale/rotation override

### Implementation Steps

1. **In Lens Studio:**
   ```
   a. Select projectedImageObject in hierarchy
   b. Create new empty SceneObject → Name it "ProjectionUI" (as CHILD)
   c. Set ProjectionUI local position: (0, 0.5, 0) - this is the base offset
   d. Drag projectionGuide → under ProjectionUI
   e. Drag placeButton → under ProjectionUI  
   f. Drag confirmButton → under ProjectionUI
   g. Drag resetButtonObject → under ProjectionUI
   ```

2. **Add FollowTargetUI_Optimized Script:**
   ```
   a. Select ProjectionUI object
   b. Add Component → Script → FollowTargetUI_Optimized
   c. In inspector:
      - Set baseOffset → (0, 0.5, 0) or adjust as needed
      - Set scaleOffsetWithParent → true (adjusts offset with scale)
      - Set offsetScaleFactor → 0.5 (how much to scale offset)
      - Set keepUpright → true
      - Set maintainScale → true
   ```

3. **How Smart Positioning Works:**
   - When parent (image) scales up, the offset scales proportionally
   - Example: If image scales 2x and offsetScaleFactor is 0.5:
     - Base offset: (0, 0.5, 0)
     - Adjusted offset: (0, 0.75, 0) - moves further to prevent overlap
   - Adjust `offsetScaleFactor` to control how much the offset scales

4. **Update Component References:**
   - No code changes needed! Just reassign in inspector
   - Objects are now children, but scale/rotation are overridden

5. **Test:**
   - UI should follow image with zero lag
   - UI should maintain constant size
   - UI should stay upright
   - UI should adjust position when image scales (no overlap!)

---

## Script Assignment Guide

### Which Script Goes on Which SceneObject

| SceneObject | Script(s) | File Location | Purpose |
|------------|-----------|---------------|---------|
| **ProjectionUI** (container for guide/buttons) | `FollowTargetUI_Optimized` | `Assets/Script/FollowTargetUI_Optimized.ts` | Makes UI follow image position, prevents scaling/rotation, adjusts offset with scale |
| **projectedImageObject** | `WorldQueryHit` | `Assets/Script/WorldQueryHit.ts` | Surface detection, placement logic, confirm/reset button control |
| **projectedImageObject** (or separate manager) | `ProjectionController` (optional) | `Assets/Script2/ProjectionController.ts` | Coordinates placement flow, manages place button visibility |
| **HandMenuRoot** | `HandMenuController` | `Assets/Script2/HandMenuController.ts` | Home, lock, edit buttons, opacity/saturation sliders |
| **Root/Manager Object** | `GameManager` | `Assets/Script2/GameManager.ts` | Central state management, coordinates all states |
| **ImageGenRoot** | `ImageGenController` | `Assets/Script2/ImageGenController.ts` | Image generation, voice recording, preview |
| **HowToEditRoot** | `HowToEditController` | `Assets/Script2/HowToEditController.ts` | Tutorial management, step progression |
| **IntroRoot** (or Play Button) | `PlayButton` | `Assets/Script2/PlayButton.ts` | Play button handler, starts experience |

### Detailed Script Setup

#### 1. ProjectionUI Object
- **Add Script**: `FollowTargetUI_Optimized`
- **Configuration**:
  - `baseOffset`: `(0, 0.5, 0)` - Base position offset
  - `scaleOffsetWithParent`: `true` - Adjust offset with parent scale
  - `offsetScaleFactor`: `0.5` - How much offset scales (adjust as needed)
  - `keepUpright`: `true` - Keep UI upright
  - `maintainScale`: `true` - Prevent UI from scaling

#### 2. projectedImageObject
- **Add Script**: `WorldQueryHit`
- **Configuration**:
  - `targetObject`: `projectedImageObject` (self)
  - `resetInteractable`: Reset button Interactable
  - `resetButtonObject`: Reset button SceneObject
  - `confirmButton`: Confirm button SceneObject
  - `camera`: Main camera
  - Other WorldQueryHit settings

#### 3. ProjectionController (Optional - can be on separate object)
- **Add Script**: `ProjectionController`
- **Configuration**:
  - `targetObject`: `projectedImageObject`
  - `placeButtonInteractable`: Place button Interactable
  - `placeButtonObject`: Place button SceneObject

#### 4. HandMenuRoot
- **Add Script**: `HandMenuController`
- **Configuration**:
  - `handMenuRoot`: Hand menu root SceneObject
  - `homeButtonInteractable`: Home button
  - `lockButtonInteractable`: Lock button
  - `editButtonInteractable`: Edit button
  - `opacitySlider`: Opacity slider component
  - `saturationSlider`: Saturation slider component
  - Other hand menu settings

#### 5. GameManager (Usually on root or separate manager object)
- **Add Script**: `GameManager`
- **Configuration**:
  - All root objects (introRoot, imageGenRoot, projectionRoot, etc.)
  - `projectedImageObject`: The projected image
  - Other GameManager settings

---

## Alternative: Option 2 (Separate but Follow)

### Step-by-Step Guide (Alternative - if you prefer sibling approach)

1. **In Lens Studio:**
   ```
   a. Keep projectionGuide, placeButton, confirmButton, resetButtonObject as siblings 
      of projectedImageObject (same parent, NOT children)
   b. Create new empty SceneObject → Name it "ProjectionUI" (as sibling of projectedImageObject)
   c. Drag projectionGuide → under ProjectionUI
   d. Drag placeButton → under ProjectionUI  
   e. Drag confirmButton → under ProjectionUI
   f. Drag resetButtonObject → under ProjectionUI
   ```

2. **Add Follow Script:**
   ```
   a. Select ProjectionUI object
   b. Add Component → Script → FollowTargetUI (from StabilizeUI.ts)
   c. In inspector:
      - Set targetObject → projectedImageObject
      - Set positionOffset → (0, 0.5, 0) or adjust as needed
      - Set keepUpright → true
      - Set maintainScale → true
      - Set useSmoothing → false (for instant following, minimal lag)
   ```

3. **Update Component References:**
   - No code changes needed! Just reassign in inspector

4. **Test:**
   - UI follows image (minimal lag: ~1 frame)
   - UI maintains constant size
   - UI stays upright
   - Buttons appear/disappear correctly

---

## Code Changes Summary

### Minimal Changes Needed

**No major code changes required!** The existing code will work because:
- Input fields reference SceneObjects by reference, not by hierarchy path
- Moving objects in hierarchy doesn't break references
- You just need to reassign in inspector after moving

### Optional Enhancements

If you want the UI to stay upright (not rotate with image), add the `StabilizeUI` script above.

---

## Testing Checklist

After reorganization:
- [ ] Place button appears in SURFACE_DETECTION
- [ ] Place button disappears after placement
- [ ] Confirm and Reset buttons appear in PLACED
- [ ] Buttons follow image as it moves
- [ ] Buttons are positioned correctly relative to image
- [ ] UI visibility still works correctly
- [ ] No console errors

---

## Alternative: World Space UI (If You Want UI Fixed in World)

If you want the UI to appear in world space (not follow image), you could:
- Keep UI separate
- Use a script to position UI relative to image position but in world space
- More complex but gives you world-space positioning

This is probably not what you want for immersion, but it's an option.


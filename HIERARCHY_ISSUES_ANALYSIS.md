# Potential Issues with Current Hierarchy

## Current Hierarchy:
```
projectedImage (targetObject)
├── projectionUI (child)
└── imageComponent (child - Image component)
```

**Scripts on `projectedImage`:**
- `WorldQueryHit` (targetObject = projectedImage)
- `ProjectionController` (targetObject = projectedImage)

---

## 🔴 **Issue 1: Image Component Location Mismatch**

### Problem:
`WorldQueryHit` tries to enable/disable the Image component on `targetObject` directly:
```typescript
// Line 117 in WorldQueryHit.ts
const imageComponent = this.targetObject.getComponent("Component.Image");
```

If the Image component is on a **child object** (`imageComponent`), this will fail silently.

### Current Behavior:
- `enableAllChildren()` recursively checks children, so it should find the Image component
- But the explicit check on line 117 will fail if Image is only on a child

### Solution:
- ✅ **Option A**: Move Image component to `projectedImage` directly (not on child)
- ✅ **Option B**: Modify `WorldQueryHit` to recursively search for Image component in children
- ✅ **Option C**: Keep current setup - `enableAllChildren()` handles it, but explicit check is redundant

---

## 🔴 **Issue 2: UI Visibility Control Conflict**

### Problem:
When `WorldQueryHit` disables the image:
```typescript
this.targetObject.enabled = false; // Line 162
```

This will **also disable `projectionUI`** (since it's a child), hiding the UI when you might want it visible.

### Current Behavior:
- When image is hidden (before Place button), UI is also hidden
- When image is shown (after Place button), UI is also shown
- This might be desired, but could cause issues if you want UI visible while image is hidden

### Solution:
- ✅ **Option A**: Keep UI as child - UI follows image visibility (current behavior)
- ✅ **Option B**: Move UI to sibling of `projectedImage` - UI can be controlled independently
- ✅ **Option C**: Use `projectionUI.enabled = true` after disabling parent (but this won't work - parent disabled = children disabled)

---

## 🟡 **Issue 3: Transform Inheritance (Position/Rotation)**

### Problem:
When `WorldQueryHit` moves/rotates `targetObject`:
```typescript
this.targetObject.getTransform().setWorldPosition(hitPosition);
this.targetObject.getTransform().setWorldRotation(toRotation);
```

Both `projectionUI` and `imageComponent` will move/rotate with it.

### Current Behavior:
- ✅ **Image Component**: Should move/rotate with parent (desired)
- ✅ **ProjectionUI**: Will move/rotate with parent, but `FollowTargetUI_Optimized` overrides rotation/scale
- Position follows instantly (zero lag) because it's a child

### Solution:
- ✅ **Current setup is good** - `FollowTargetUI_Optimized` handles rotation/scale override
- UI position follows automatically (zero lag)
- UI rotation/scale are overridden to stay upright and constant size

---

## 🟡 **Issue 4: Scale Inheritance**

### Problem:
If `projectedImage` scales (e.g., via ContainerFrameLocker), `projectionUI` will inherit that scale.

### Current Behavior:
- `FollowTargetUI_Optimized` has `maintainScale: true` which overrides parent scale
- UI should stay constant size even if image scales
- Offset adjusts based on `scaleReferenceObject` to prevent overlap

### Solution:
- ✅ **Current setup handles this** - `FollowTargetUI_Optimized` overrides scale
- Make sure `scaleReferenceObject` is set correctly (e.g., ContainerInner if using ContainerFrameLocker)

---

## 🔴 **Issue 5: Script Conflicts on Same Object**

### Problem:
Both `WorldQueryHit` and `ProjectionController` are on `projectedImage` and both try to control:
- `targetObject.enabled` (visibility)
- Button visibility
- State management

### Current Behavior:
- `WorldQueryHit` controls image visibility and positioning
- `ProjectionController` controls place button visibility
- Both subscribe to GameManager events
- Potential for race conditions or duplicate event handlers

### Conflicts:
1. **Visibility Control:**
   - `WorldQueryHit` sets `targetObject.enabled = false` in `resetPlacement()`
   - `ProjectionController` might try to enable it in `startSurfaceDetection()`
   - `GameManager` also controls `projectedImageObject.enabled`

2. **State Management:**
   - Both scripts listen to `GameManager.onSubStateChange`
   - Both might react to the same state change
   - Could cause duplicate actions

### Solution:
- ✅ **Option A**: Keep both scripts, but clearly define responsibilities:
  - `WorldQueryHit`: Image positioning, visibility, surface detection
  - `ProjectionController`: Button visibility, state coordination
  - `GameManager`: Overall state, root visibility
- ✅ **Option B**: Move `ProjectionController` to a separate manager object (not on `projectedImage`)
- ✅ **Option C**: Merge functionality into one script (not recommended - violates separation of concerns)

---

## 🟡 **Issue 6: enableAllChildren() Recursive Behavior**

### Problem:
`enableAllChildren()` recursively enables all children:
```typescript
for (let i = 0; i < obj.children.length; i++) {
    obj.children[i].enabled = true;
    this.enableAllChildren(obj.children[i]);
}
```

This means **every child** (including `projectionUI`) gets enabled, even if you want some children disabled.

### Current Behavior:
- When image is enabled, all children are enabled
- If you want `projectionUI` to be independently controlled, this won't work

### Solution:
- ✅ **Option A**: Keep current behavior - all children follow parent (simpler)
- ✅ **Option B**: Modify `enableAllChildren()` to skip certain children (e.g., `projectionUI`)
- ✅ **Option C**: Use a whitelist/blacklist system for which children to enable

---

## 🟢 **Issue 7: FollowTargetUI_Optimized Parent Dependency**

### Problem:
`FollowTargetUI_Optimized` requires the UI to be a child:
```typescript
const parent = this.sceneObject.getParent();
if (!parent) {
    print("FollowTargetUI_Optimized: WARNING - UI object has no parent!");
    return;
}
```

### Current Behavior:
- ✅ **Current setup is correct** - `projectionUI` is a child of `projectedImage`
- Script will work as intended

### Solution:
- ✅ **No issue** - hierarchy is correct

---

## 📋 **Recommended Solutions:**

### **Best Practice Hierarchy:**

```
projectedImage (targetObject)
├── Image component (on projectedImage directly, NOT on child)
└── projectionUI (child with FollowTargetUI_Optimized script)
```

**Scripts:**
- `WorldQueryHit` on `projectedImage` (targetObject = self)
- `ProjectionController` on `projectedImage` OR separate manager object
- `FollowTargetUI_Optimized` on `projectionUI`

### **Key Changes:**
1. ✅ **Move Image component to `projectedImage` directly** (not on child object)
2. ✅ **Keep `projectionUI` as child** - works well with `FollowTargetUI_Optimized`
3. ✅ **Consider moving `ProjectionController` to separate manager object** to reduce conflicts
4. ✅ **Ensure `scaleReferenceObject` is set correctly** in `FollowTargetUI_Optimized` (e.g., ContainerInner)

### **Current Setup Assessment:**
- ✅ **Works**: Transform inheritance, UI following, scale override
- ⚠️ **Potential Issues**: Image component location, script conflicts, UI visibility tied to image
- 🔴 **Needs Fix**: Image component should be on `projectedImage` directly, or `WorldQueryHit` needs recursive search

---

## 🧪 **Testing Checklist:**

- [ ] Image component is found and enabled/disabled correctly
- [ ] UI follows image position (zero lag)
- [ ] UI doesn't scale with image
- [ ] UI stays upright when image rotates
- [ ] UI visibility matches image visibility (or is independent if needed)
- [ ] No script conflicts (check console for errors)
- [ ] Place button appears/disappears correctly
- [ ] Image appears/disappears correctly






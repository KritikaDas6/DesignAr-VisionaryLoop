# Snap Cloud Tracing Experience - Implementation Plan

## Overview
Integrate Snap Cloud to create an enhanced tracing experience that:
1. Immediately stores generated images to Snap Cloud Storage
2. Regenerates images into tracing outlines using Gemini
3. Displays tracing outlines on top of the original image
4. Processes black/white images to remove white spots
5. Makes tracing lines erasable as the user traces over them

---

## Phase 1: Snap Cloud Setup & Infrastructure

### 1.1 Install and Configure Snap Cloud Requirements
**Files to Create:**
- `Assets/Script2/SnapCloudRequirements.ts` (copy from Snap Cloud sample)
- Create Supabase Project asset in Lens Studio

**Tasks:**
- [ ] Copy `SnapCloudRequirements.ts` from Snap Cloud sample to `Assets/Script2/`
- [ ] Set up Supabase project via Window > Supabase > Import Credentials
- [ ] Create Supabase Storage bucket: `tracing-images`
- [ ] Create Supabase Edge Function: `generate-tracing-outline`
- [ ] Create Supabase Edge Function: `process-tracing-image`

**Configuration:**
- Storage bucket permissions: Public read, authenticated write
- Edge Functions will need Gemini API key (store in Supabase secrets)

---

## Phase 2: Image Storage Integration

### 2.1 Create SnapCloudImageStorage Service
**File:** `Assets/Script2/SnapCloudImageStorage.ts`

**Purpose:** Handle immediate storage of generated images to Snap Cloud Storage

**Key Features:**
- Upload generated image (Texture) to Supabase Storage
- Generate unique image ID (timestamp + random)
- Store image metadata (prompt, timestamp, original URL)
- Return storage URL for later use

**Methods:**
```typescript
- uploadImage(texture: Texture, prompt: string): Promise<string>
- getImageUrl(imageId: string): string
- deleteImage(imageId: string): Promise<void>
```

**Integration Points:**
- Hook into `ImageGenController.onImageGenerationSuccess()`
- Store image immediately after generation
- Update `PersistentStorageManager` to also store Snap Cloud URL

---

## Phase 3: Tracing Outline Generation

### 3.1 Create TracingOutlineGenerator Service
**File:** `Assets/Script2/TracingOutlineGenerator.ts`

**Purpose:** Convert generated images into tracing outlines using Gemini

**Approach Options:**

**Option A: Direct Gemini API Call (Recommended)**
- Use Gemini Vision API with image-to-image prompt
- Prompt: "Convert this image into a simple black and white line art tracing outline. Remove all white background areas, keep only black lines. Make it suitable for tracing practice."
- Process response to get outline texture

**Option B: Edge Function with Gemini**
- Create Supabase Edge Function that calls Gemini API
- Edge Function handles image download, processing, and upload
- More secure (API keys on server)

**Key Features:**
- Accept original image URL or Texture
- Call Gemini API with image + prompt
- Process response to extract outline image
- Return outline Texture

**Methods:**
```typescript
- generateOutline(imageUrl: string): Promise<Texture>
- generateOutlineFromTexture(texture: Texture): Promise<Texture>
```

**Integration Points:**
- Called automatically after image is stored to Snap Cloud
- Triggered in `ImageGenController` after successful storage
- Store outline URL alongside original image

---

## Phase 4: Image Processing (White Spot Removal)

### 4.1 Create ImageProcessor Service
**File:** `Assets/Script2/TracingImageProcessor.ts`

**Purpose:** Process black/white tracing outlines to remove white spots and optimize for tracing

**Processing Steps:**
1. Convert to grayscale
2. Apply threshold to make pure black/white
3. Remove small white spots (noise removal)
4. Invert if needed (white background to transparent/black)
5. Optimize line thickness

**Implementation Options:**

**Option A: Client-Side Processing (Lens Studio)**
- Use Texture manipulation APIs
- Apply shader effects for processing
- Real-time processing

**Option B: Edge Function Processing**
- Create Edge Function: `process-tracing-image`
- Use image processing library (Sharp, ImageMagick)
- More powerful processing capabilities
- Returns processed image URL

**Methods:**
```typescript
- removeWhiteSpots(texture: Texture): Promise<Texture>
- optimizeForTracing(texture: Texture): Promise<Texture>
- invertColors(texture: Texture): Texture
```

**Integration Points:**
- Called after outline generation
- Process outline before displaying
- Store processed version in Snap Cloud Storage

---

## Phase 5: Tracing Outline Display System

### 5.1 Create TracingOutlineController
**File:** `Assets/Script2/TracingOutlineController.ts`

**Purpose:** Manage display of tracing outline on top of original image

**Key Features:**
- Layer outline image on top of original
- Control opacity/visibility
- Position alignment
- Toggle on/off

**Scene Hierarchy:**
```
ProjectedImage (original image)
  └── TracingOutlineLayer (new)
      └── OutlineImage (Image component)
      └── ErasableMask (for erasing)
```

**Methods:**
```typescript
- showOutline(outlineTexture: Texture): void
- hideOutline(): void
- setOutlineOpacity(opacity: number): void
- alignWithOriginal(): void
```

**Integration Points:**
- Activated when entering TRACING state
- Loads outline from Snap Cloud Storage if available
- Manages visibility based on user preferences

---

## Phase 6: Erasable Line System

### 6.1 Create ErasableLineController
**File:** `Assets/Script2/ErasableLineController.ts`

**Purpose:** Make tracing lines erase as user traces over them

**Implementation Approach:**

**Option A: Mask-Based Erasing (Recommended)**
- Create a mask texture that tracks erased areas
- Use shader to blend outline with mask
- Update mask based on hand position
- Erase in circular area around hand/finger

**Option B: Texture Manipulation**
- Directly modify outline texture pixels
- Set pixels to transparent/white when traced
- More complex but more control

**Key Components:**
1. **Hand Tracking Integration:**
   - Detect hand position (index finger tip)
   - Use hand tracking from Spectacles SDK
   - Project 3D position to 2D image space

2. **Erase Area Calculation:**
   - Define erase radius (e.g., 20-50 pixels)
   - Create circular erase zone
   - Update mask texture

3. **Visual Feedback:**
   - Show erase effect in real-time
   - Optional: particle effect when erasing
   - Progress indicator (percentage erased)

**Methods:**
```typescript
- initializeErasableMask(outlineTexture: Texture): void
- updateErasePosition(handPosition: vec3): void
- eraseAtPosition(screenPos: vec2, radius: number): void
- getEraseProgress(): number // 0-1
- resetErasableMask(): void
```

**Shader Requirements:**
- Custom shader for mask blending
- Inputs: outline texture, mask texture, erase radius
- Output: blended result with erased areas transparent/removed

**Integration Points:**
- Activated in TRACING state
- Continuously updates during tracing
- Resets when entering new tracing session

---

## Phase 7: Integration with Existing Systems

### 7.1 Update ImageGenController
**File:** `Assets/Script2/ImageGenController.ts`

**Changes:**
- After image generation success:
  1. Upload to Snap Cloud Storage (immediate)
  2. Generate tracing outline (async)
  3. Process outline (remove white spots)
  4. Store processed outline URL
  5. Update PersistentStorageManager with all URLs

**New Methods:**
```typescript
- private uploadToSnapCloud(texture: Texture): Promise<string>
- private generateTracingOutline(imageUrl: string): Promise<Texture>
- private processTracingOutline(outlineTexture: Texture): Promise<Texture>
```

### 7.2 Update GameManager
**File:** `Assets/Script2/GameManager.ts`

**Changes:**
- When entering TRACING state:
  - Load tracing outline from storage
  - Initialize TracingOutlineController
  - Initialize ErasableLineController
  - Show outline overlay

**New State Management:**
- Track tracing outline availability
- Handle loading states
- Manage outline visibility

### 7.3 Update PersistentStorageManager
**File:** `Assets/Script2/PersistentStorageManager.ts`

**Changes:**
- Extend `SavedImageEntry` to include:
  - `originalImageUrl: string` (Snap Cloud URL)
  - `tracingOutlineUrl: string` (Snap Cloud URL)
  - `processedOutlineUrl: string` (Snap Cloud URL)

**New Methods:**
```typescript
- saveImageWithSnapCloudUrls(entry: SavedImageEntry): void
- loadImageWithUrls(imageId: string): SavedImageEntry | null
```

---

## Phase 8: Edge Functions (Supabase)

### 8.1 Edge Function: `generate-tracing-outline`
**Location:** Supabase Edge Functions

**Purpose:** Convert image to tracing outline using Gemini

**Input:**
```json
{
  "imageUrl": "https://...",
  "prompt": "Convert to black and white line art tracing outline"
}
```

**Process:**
1. Download image from URL
2. Convert to base64
3. Call Gemini Vision API with image + prompt
4. Extract generated outline image
5. Upload to Supabase Storage
6. Return processed URL

**Output:**
```json
{
  "success": true,
  "outlineUrl": "https://...",
  "storagePath": "tracing-images/outline_xxx.png"
}
```

### 8.2 Edge Function: `process-tracing-image`
**Location:** Supabase Edge Functions

**Purpose:** Remove white spots and optimize for tracing

**Input:**
```json
{
  "imageUrl": "https://...",
  "operations": ["removeWhiteSpots", "optimizeLines"]
}
```

**Process:**
1. Download image from URL
2. Apply image processing:
   - Convert to grayscale
   - Apply threshold
   - Remove noise (small white spots)
   - Optimize line thickness
3. Upload processed image
4. Return processed URL

**Output:**
```json
{
  "success": true,
  "processedUrl": "https://...",
  "storagePath": "tracing-images/processed_xxx.png"
}
```

---

## Phase 9: UI/UX Enhancements

### 9.1 Loading States
- Show loading indicator while:
  - Uploading to Snap Cloud
  - Generating outline
  - Processing image

### 9.2 Error Handling
- Handle network failures gracefully
- Retry logic for failed uploads
- Fallback to local storage if Snap Cloud unavailable

### 9.3 User Controls
- Toggle outline visibility
- Adjust outline opacity
- Reset erase mask
- Show/hide original image

### 9.4 Progress Indicators
- Upload progress
- Outline generation progress
- Erase progress (percentage completed)

---

## Phase 10: Testing & Optimization

### 10.1 Testing Checklist
- [ ] Image uploads successfully to Snap Cloud
- [ ] Outline generation works with various image types
- [ ] White spot removal works correctly
- [ ] Erasable lines erase smoothly
- [ ] Hand tracking accuracy
- [ ] Performance (frame rate during tracing)
- [ ] Error handling and recovery
- [ ] Storage quota management

### 10.2 Optimization
- Cache processed images locally
- Optimize texture sizes
- Reduce API calls (batch operations)
- Optimize shader performance
- Lazy load outline images

---

## Implementation Order (Recommended)

1. **Phase 1:** Snap Cloud Setup
2. **Phase 2:** Image Storage Integration
3. **Phase 3:** Tracing Outline Generation (basic)
4. **Phase 5:** Tracing Outline Display (basic)
4. **Phase 4:** Image Processing (white spot removal)
5. **Phase 6:** Erasable Line System
6. **Phase 7:** Integration
7. **Phase 8:** Edge Functions (if using server-side)
8. **Phase 9:** UI/UX Enhancements
9. **Phase 10:** Testing & Optimization

---

## Technical Considerations

### Dependencies
- Snap Cloud package (SupabaseClient.lspkg)
- InternetModule (for HTTP requests)
- RemoteMediaModule (for image loading)
- Gemini API (for outline generation)
- Hand Tracking SDK (for erase detection)

### Performance
- Outline generation: ~2-5 seconds (async, non-blocking)
- Image processing: ~1-2 seconds
- Erase updates: Real-time (60fps target)
- Storage upload: ~1-3 seconds (depends on image size)

### Storage Requirements
- Original images: ~500KB - 2MB each
- Outline images: ~100KB - 500KB each
- Processed images: ~50KB - 200KB each
- Plan for storage quota management

### API Costs
- Gemini API: Pay per request
- Supabase Storage: Free tier + paid tiers
- Edge Functions: Free tier + paid tiers

---

## Alternative Approaches

### Simplified Version (No Snap Cloud)
- Store images locally only
- Generate outline client-side using shaders
- Simpler but less powerful

### Hybrid Approach
- Store originals in Snap Cloud
- Generate outlines client-side
- Best of both worlds

---

## Next Steps

1. Review and approve this plan
2. Set up Supabase project and credentials
3. Start with Phase 1 (Snap Cloud Setup)
4. Implement incrementally, testing each phase
5. Iterate based on user feedback


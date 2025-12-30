# Question: Uploading Images to Supabase Storage from Lens Studio

## Context
I'm working on a Lens Studio project that needs to upload generated images to Supabase Storage (Snap Cloud). The images are generated in-app and need to be stored in the cloud for later processing (tracing outline generation).

## Current Approach

I'm using:
- **Lens Studio** with TypeScript
- **Supabase Storage** (via Snap Cloud)
- **InternetModule** for HTTP requests
- **Base64 encoding** to convert Texture to base64 string

### Code Flow:
1. Generate image using Gemini API → get `Texture`
2. Encode texture to base64 using `Base64.encodeTextureAsync()`
3. Upload base64 string to Supabase Storage via HTTP POST

### Current Implementation:
```typescript
// Encode texture to base64
Base64.encodeTextureAsync(texture, (base64Data: string) => {
    // Upload to Supabase Storage
    const request = RemoteServiceHttpRequest.create();
    request.url = `${supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`;
    request.method = RemoteServiceHttpRequest.HttpRequestMethod.Post;
    request.headers = supabaseHeaders;
    request.body = base64Data; // Base64 string
    
    internetModule.performHttpRequest(request, (response) => {
        // Handle response
    });
}, ...);
```

## The Problem

**Upload succeeds (200 status) but images are not viewable:**
- ✅ HTTP request returns `200 OK`
- ✅ File appears in Supabase Storage bucket
- ✅ File has correct size (e.g., 75KB)
- ❌ **Image preview doesn't work in Supabase dashboard**
- ❌ **Image URL doesn't display in browser**
- ❌ **Downloaded file appears corrupted/unreadable**

## What I've Tried

### 1. Direct Upload with Base64
- Sending base64 string directly in request body
- Result: Upload succeeds but image not viewable

### 2. Manual Base64 Decoding
- Attempted to decode base64 to binary string in Lens Studio
- Problem: Lens Studio's `RemoteServiceHttpRequest.body` only accepts `string` type
- Result: Still sending base64 as text, not binary

### 3. Supabase Edge Function
- Created Edge Function to handle base64-to-binary conversion server-side
- Edge Function code:
```typescript
const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
const binaryData = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
await supabaseClient.storage.from(bucketName).upload(filePath, binaryData, {
    contentType: 'image/jpeg',
    upsert: true
});
```
- **Status**: Edge Function exists but getting 404 (function name mismatch - working on fixing this)

## Root Cause Hypothesis

The issue seems to be that **Supabase Storage API expects binary data**, but:
- Lens Studio's HTTP request body is `string` type only
- Base64 string is being stored as text, not decoded to binary
- Supabase stores the base64 string as-is, creating a corrupted image file

## Questions

1. **Is it possible to upload binary data via Lens Studio's HTTP requests?**
   - `RemoteServiceHttpRequest.body` appears to only accept strings
   - Is there a way to send actual binary/Uint8Array?

2. **Alternative approaches:**
   - Should I use a different API endpoint?
   - Is there a Lens Studio API I'm missing for file uploads?
   - Should I use multipart/form-data format?

3. **Edge Function approach:**
   - Is using an Edge Function the recommended solution?
   - Are there any known issues with Edge Functions and base64 image uploads?

4. **Best practices:**
   - What's the recommended way to upload images from Lens Studio to cloud storage?
   - Are there any working examples or documentation?

## Technical Details

- **Lens Studio Version**: [Your version]
- **Supabase/Snap Cloud**: Using Snap Cloud (Supabase-powered)
- **Storage Bucket**: Public bucket with RLS policies configured
- **Image Format**: JPEG (via `EncodingType.Jpg`)
- **Compression**: `CompressionQuality.LowQuality`

## What I Need

1. Confirmation if binary upload is possible from Lens Studio
2. Working example or code snippet for image upload to Supabase Storage
3. Alternative solutions if direct upload isn't possible
4. Best practices for this use case

## Additional Context

The images need to be uploaded immediately after generation for:
- Tracing outline generation (using Gemini Vision API)
- Image processing (white spot removal)
- Later retrieval for display

Any help or guidance would be greatly appreciated! 🙏

---

**Update**: I've created a Supabase Edge Function to handle the conversion, but I'm still troubleshooting the connection. The Edge Function approach seems like the right solution, but I'd like to confirm if there's a better way or if I'm missing something in the implementation.




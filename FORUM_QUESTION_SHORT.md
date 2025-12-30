# Short Question: Image Upload to Supabase Storage from Lens Studio

## Problem
Uploading images to Supabase Storage from Lens Studio succeeds (200 status), but uploaded images are not viewable/corrupted.

## Current Setup
- **Lens Studio** → Generate image → Get `Texture`
- Encode to base64 using `Base64.encodeTextureAsync()`
- Upload base64 string via `InternetModule.performHttpRequest()` to Supabase Storage API

## Issue
- ✅ HTTP request returns `200 OK`
- ✅ File appears in Supabase Storage (correct size)
- ❌ Image preview doesn't work
- ❌ Image URL doesn't display
- ❌ Downloaded file is corrupted

## Root Cause
Supabase Storage expects **binary data**, but Lens Studio's `RemoteServiceHttpRequest.body` only accepts `string` type. Base64 string is being stored as text instead of being decoded to binary.

## What I've Tried
1. **Direct upload** - Sending base64 string → Upload succeeds but image corrupted
2. **Manual base64 decode** - Can't convert to binary in Lens Studio (body is string-only)
3. **Edge Function** - Created server-side function to convert base64→binary → Getting 404 (function name issue, working on it)

## Questions
1. **Is binary upload possible from Lens Studio?** Can `RemoteServiceHttpRequest.body` accept binary/Uint8Array, or is it string-only?
2. **Recommended approach?** Should I use Edge Function, multipart/form-data, or another method?
3. **Working examples?** Any code samples for uploading images to cloud storage from Lens Studio?

## Code Snippet
```typescript
// Current approach (doesn't work - stores base64 as text)
Base64.encodeTextureAsync(texture, (base64Data: string) => {
    const request = RemoteServiceHttpRequest.create();
    request.url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;
    request.body = base64Data; // String, not binary
    internetModule.performHttpRequest(request, ...);
});
```

**Need:** Way to upload actual binary image data, not base64 string.

---

**Context:** Images need to be uploaded for tracing outline generation workflow.



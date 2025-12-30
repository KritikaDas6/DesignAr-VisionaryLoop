# Supabase Setup Guide for Snap Cloud Integration

This guide will walk you through setting up Supabase from scratch for your tracing experience project.

---

## Step 1: Create Supabase Account & Project

### 1.1 Sign Up / Sign In
1. Go to [https://supabase.com](https://supabase.com)
2. Click **"Start your project"** or **"Sign In"** if you already have an account
3. Sign up with GitHub, Google, or email

### 1.2 Create New Project
1. Once logged in, click **"New Project"**
2. Fill in the project details:
   - **Name**: `DesignAR-VisionaryLoop` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users (e.g., `US East`, `EU West`)
   - **Pricing Plan**: Start with **Free tier** (sufficient for development)
3. Click **"Create new project"**
4. Wait 1-2 minutes for project to initialize

---

## Step 2: Get Project Credentials

### 2.1 Access Project Settings
1. In your Supabase dashboard, click the **gear icon** (⚙️) in the left sidebar
2. Click **"API"** under Project Settings

### 2.2 Find Your Credentials
You'll need these values (keep them secure):

- **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
  - Found under "Project URL"
  - Copy this entire URL

- **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - Found under "Project API keys" → "anon" → "public"
  - This is your public API key (safe to use in client apps)

- **service_role key**: (Optional, for server-side operations)
  - Found under "Project API keys" → "service_role" → "secret"
  - ⚠️ **Keep this secret!** Never expose in client code

---

## Step 3: Create Storage Bucket

### 3.1 Navigate to Storage
1. In Supabase dashboard, click **"Storage"** in the left sidebar
2. You'll see an empty storage section

### 3.2 Create New Bucket
1. Click **"New bucket"** button
2. Fill in bucket details:
   - **Name**: `tracing-images`
   - **Public bucket**: ✅ **Check this box** (allows public read access)
   - **File size limit**: `5242880` (5MB) or leave default
   - **Allowed MIME types**: Leave empty (allows all image types)
3. Click **"Create bucket"**

### 3.3 Verify Bucket Created
- You should see `tracing-images` in your bucket list
- Status should show as "Public"

---

## Step 4: Set Up Storage Policies (Optional but Recommended)

### 4.1 Access Bucket Policies
1. Click on the `tracing-images` bucket
2. Go to **"Policies"** tab

### 4.2 Create Public Read Policy
1. Click **"New Policy"**
2. Select **"For full customization"**
3. Policy name: `Public Read Access`
4. Allowed operation: `SELECT` (read)
5. Policy definition:
   ```sql
   (bucket_id = 'tracing-images')
   ```
6. Click **"Review"** then **"Save policy"**

### 4.3 Create Authenticated Upload Policy
1. Click **"New Policy"** again
2. Select **"For full customization"**
3. Policy name: `Authenticated Upload`
4. Allowed operation: `INSERT` (upload)
5. Policy definition:
   ```sql
   (bucket_id = 'tracing-images')
   ```
6. Click **"Review"** then **"Save policy"**

**Note**: For development, you can make the bucket fully public. For production, use proper authentication.

---

## Step 5: Import Credentials into Lens Studio

### 5.1 Open Supabase Plugin
1. In Lens Studio, go to **Window > Supabase**
2. The Supabase plugin window will open

### 5.2 Login to Supabase
1. Click **"Login"** button in the plugin
2. Sign in with your Supabase account credentials
3. You'll be redirected back to Lens Studio

### 5.3 Import Project Credentials
1. In the Supabase plugin, you should see your project listed
2. Select your project (`DesignAR-VisionaryLoop` or your project name)
3. Click **"Import Credentials"**
4. This will create a **SupabaseProject** asset in your project

### 5.4 Verify Asset Created
1. Check your **Asset Panel** (bottom of Lens Studio)
2. Look for a new asset (usually named after your project)
3. It should have the Supabase icon

---

## Step 6: Configure SnapCloudRequirements Component

### 6.1 Find SnapCloudRequirements in Scene
1. In your scene hierarchy, find the SceneObject with `SnapCloudRequirements` component
2. If it doesn't exist, create a new SceneObject and add the component

### 6.2 Assign SupabaseProject
1. Select the SceneObject with `SnapCloudRequirements`
2. In the **Inspector** panel, find the `Supabase Project` field
3. Drag the **SupabaseProject** asset (from Asset Panel) into this field
4. The component should validate and show: `"SnapCloudRequirements fully configured and ready!"`

### 6.3 Verify Configuration
- Check the **Console** for confirmation messages
- You should see: `[SnapCloudRequirements] SnapCloudRequirements fully configured and ready!`
- You should see: `[SnapCloudRequirements] Supabase Project: https://xxxxx.supabase.co`

---

## Step 7: Configure SnapCloudImageStorage (Optional)

### 7.1 Add Component to Scene
1. Create a new SceneObject (or use existing one)
2. Add `SnapCloudImageStorage` component to it

### 7.2 Assign References
1. Select the SceneObject with `SnapCloudImageStorage`
2. In Inspector:
   - **Snap Cloud Requirements**: Drag your `SnapCloudRequirements` component reference
   - **Bucket Name**: `tracing-images` (should match your bucket name)
   - **Enable Debug Logs**: ✅ Checked (for testing)

### 7.3 Link to ImageGenController (Optional)
1. Select the SceneObject with `ImageGenController`
2. In Inspector, find **Snap Cloud Storage** field
3. Drag the `SnapCloudImageStorage` component reference here
   - **OR** leave it empty - it will use the singleton pattern automatically

---

## Step 8: Test the Setup

### 8.1 Test Upload
1. Run your lens in Lens Studio
2. Generate an image (use your image generation flow)
3. Check the **Console** for upload messages:
   - `[SnapCloudImageStorage] Starting image upload to Snap Cloud...`
   - `[SnapCloudImageStorage] ✓ Image uploaded successfully: https://...`

### 8.2 Verify in Supabase Dashboard
1. Go back to Supabase dashboard
2. Navigate to **Storage > tracing-images**
3. You should see uploaded images with timestamps
4. Click on an image to view it

### 8.3 Troubleshooting

**If upload fails:**
- Check console for error messages
- Verify bucket name matches (`tracing-images`)
- Verify bucket is set to "Public"
- Check that SupabaseProject is assigned correctly
- Verify your internet connection

**Common errors:**
- `"SnapCloudRequirements not configured"` → Assign SupabaseProject asset
- `"Upload failed: 401"` → Check API keys are correct
- `"Upload failed: 404"` → Bucket doesn't exist or name is wrong
- `"Upload failed: 403"` → Bucket permissions issue

---

## Step 9: Next Steps

Once storage is working:

1. ✅ **Phase 2 Complete**: Image Storage Integration
2. **Phase 3**: Implement Tracing Outline Generation
   - Create `TracingOutlineGenerator.ts`
   - Use Gemini API to convert images to outlines
   - Store outline URLs

3. **Phase 4**: Image Processing
   - Remove white spots
   - Optimize for tracing

4. **Phase 5**: Display System
   - Show outlines on top of images

5. **Phase 6**: Erasable Lines
   - Implement hand tracking erase

---

## Quick Reference

### Supabase Dashboard: https://app.supabase.com
### Your Project URL: `https://[your-project-ref].supabase.co`
### Storage Bucket: `tracing-images`
### Lens Studio Plugin: Window > Supabase

---

## Security Notes

- ✅ **Public Key (anon)**: Safe to use in client code
- ⚠️ **Service Role Key**: Never expose in client code
- ✅ **Public Bucket**: OK for development, consider authentication for production
- ✅ **Storage Policies**: Use for fine-grained access control

---

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Storage Docs**: https://supabase.com/docs/guides/storage
- **Lens Studio Supabase Plugin**: Check Lens Studio documentation

---

**You're all set!** Once you complete these steps, your images will automatically upload to Supabase Storage when generated. 🎉


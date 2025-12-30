# Supabase Edge Function for Image Upload

Since Lens Studio has limitations with binary data uploads, we'll create a Supabase Edge Function to handle the base64-to-binary conversion and upload.

## Step 1: Create Edge Function in Supabase

1. Go to your Supabase Dashboard
2. Click **"Edge Functions"** in the left sidebar
3. Click **"Create a new function"**
4. Name it: `upload-image`
5. Click **"Create function"**

## Step 2: Replace the Function Code

Replace the default code with this:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request data
    const { base64Data, bucketName, filePath } = await req.json()

    if (!base64Data || !bucketName || !filePath) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: base64Data, bucketName, filePath' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Remove data URL prefix if present
    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '')

    // Decode base64 to binary
    const binaryData = Uint8Array.from(atob(base64), c => c.charCodeAt(0))

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Upload to storage
    const { data, error } = await supabaseClient.storage
      .from(bucketName)
      .upload(filePath, binaryData, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: urlData.publicUrl,
        path: filePath
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

## Step 3: Deploy the Function

1. Click **"Deploy"** button
2. Wait for deployment to complete
3. The function will be available at: `https://[your-project].supabase.co/functions/v1/upload-image`

## Step 4: Update SnapCloudImageStorage.ts

We'll update the code to use the Edge Function instead of direct upload.


# Setting Up Ngrok for Locl App

## Overview
This guide explains how to use ngrok to create a public URL for your local Expo development server. This is necessary for Supabase storage to work correctly with image uploads when developing locally.

## Prerequisites
- Make sure you have ngrok installed globally or use npx to run it without installation
- A Supabase account with access to your project settings

## Steps to Run with Ngrok

### 1. Start your Expo app with ngrok

Run the following command in your terminal:

```bash
npm run start-ngrok
```

This will start the Expo development server and create a public ngrok URL that forwards to your local server.

### 2. Configure Supabase CORS settings

1. Log in to your Supabase dashboard
2. Navigate to your project
3. Go to Settings > API
4. Under "CORS Origins", add the ngrok URL that was generated (e.g., `https://a1b2c3d4.ngrok.io`)
5. Make sure to include both:
   - The ngrok URL with `https://` prefix
   - The ngrok URL with `exp://` prefix (for Expo Go app)

### 3. Test your application

Now your application should be able to upload images to Supabase storage without the "failed to fetch" error.

## Troubleshooting

If you still encounter issues:

1. Check the console logs for detailed error messages
2. Verify that the ngrok URL is correctly added to Supabase CORS settings
3. Ensure your Supabase storage bucket permissions are set correctly
4. Try restarting both the Expo server and ngrok

## Notes

- The ngrok URL changes each time you restart it (unless you have a paid account)
- You'll need to update the Supabase CORS settings each time the ngrok URL changes
- For production, you should use a proper domain with SSL

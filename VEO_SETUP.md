# Veo API Setup Guide

## Prerequisites

1. **Google Cloud Account**: You need a Google Cloud account
2. **Veo API Access**: Request access to Veo API (currently in limited preview)
3. **API Key**: Get your API key from Google Cloud Console

## Setup Steps

### 1. Get Veo API Access

Veo is currently in limited preview. You need to:
- Sign up for access at: https://aistudio.google.com/app/prompts/new_chat
- Or request access through Google Cloud Console

### 2. Get API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the Veo API
4. Go to "APIs & Services" > "Credentials"
5. Create an API key
6. Copy the API key

### 3. Configure Environment

**Option A: Environment Variable**
```bash
export VEO_API_KEY="your_api_key_here"
export GOOGLE_CLOUD_PROJECT_ID="your_project_id"
```

**Option B: .env File**
```bash
cp .env.example .env
# Edit .env and add your API key
```

**Option C: In the Web App**
The app will check for `VEO_API_KEY` environment variable automatically.

### 4. Test Veo Integration

```bash
source .venv/bin/activate
python3 -c "
from veo_integration import VeoIntegration
veo = VeoIntegration()
print('Veo available:', veo.available)
"
```

## How It Works

1. **Storyboard → Images**: Each scene generates an input image
2. **Images → Veo Jobs**: Images are sent to Veo API with prompts
3. **Veo Generates Videos**: Veo creates animated videos with audio
4. **Videos Combined**: All scene videos are combined into final video

## API Endpoints Used

- `POST /v1beta/models/veo-3:generateVideo` - Create video job
- `GET /v1beta/operations/{operation_name}` - Check job status

## Fallback Behavior

If Veo API is not available or fails:
- System automatically falls back to local video generation
- Uses PIL + imageio for basic animations
- Still generates watchable videos

## Cost Considerations

- Veo API may have usage limits and costs
- Check Google Cloud pricing for Veo
- Local generation is free but less sophisticated

## Troubleshooting

**"Veo API key not found"**
- Set VEO_API_KEY environment variable
- Or add to .env file

**"Veo API error: 403"**
- Check API key is valid
- Ensure Veo API is enabled in your project
- Verify you have access to Veo (limited preview)

**"Veo API error: 429"**
- Rate limit exceeded
- Wait and retry
- Check your quota limits

**"Job timeout"**
- Video generation can take 2-5 minutes per scene
- Increase max_wait time if needed
- Check job status manually

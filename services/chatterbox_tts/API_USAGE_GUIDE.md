# Chatterbox TTS - API Usage Guide

## 🎯 Your Live Endpoint

```
Endpoint ID: 70sq2akye030kh
Base URL: https://api.runpod.ai/v2/70sq2akye030kh
API Key: (stored in your environment as RUNPOD_API_KEY)
```

---

## 🚀 Quick Start Examples

### Python

```python
import requests
import base64
import time
import os

# Configuration
RUNPOD_API_KEY = os.environ.get("RUNPOD_API_KEY")  # Your API key
ENDPOINT_ID = "70sq2akye030kh"
BASE_URL = f"https://api.runpod.ai/v2/{ENDPOINT_ID}"

def generate_speech(text, format="mp3", speed=1.0):
    """
    Generate speech from text using Chatterbox TTS
    
    Args:
        text (str): Text to convert to speech
        format (str): Audio format ("mp3" or "wav")
        speed (float): Speech speed (0.5 to 2.0)
    
    Returns:
        bytes: Audio file bytes
    """
    # Submit job
    response = requests.post(
        f"{BASE_URL}/run",
        headers={
            "Authorization": f"Bearer {RUNPOD_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "input": {
                "text": text,
                "format": format,
                "speed": speed
            }
        }
    )
    
    job_id = response.json()["id"]
    print(f"Job submitted: {job_id}")
    
    # Poll for result
    while True:
        status_response = requests.get(
            f"{BASE_URL}/status/{job_id}",
            headers={"Authorization": f"Bearer {RUNPOD_API_KEY}"}
        )
        
        status = status_response.json()
        
        if status["status"] == "COMPLETED":
            # Decode base64 audio
            audio_bytes = base64.b64decode(status["output"]["audio_base64"])
            print(f"✅ Generated {len(audio_bytes)} bytes")
            return audio_bytes
        
        elif status["status"] == "FAILED":
            raise Exception(f"Job failed: {status.get('error')}")
        
        print(f"Status: {status['status']}")
        time.sleep(2)

# Example usage
if __name__ == "__main__":
    audio = generate_speech(
        "Hello! This is a test of the Chatterbox TTS service.",
        format="mp3",
        speed=1.0
    )
    
    # Save to file
    with open("output.mp3", "wb") as f:
        f.write(audio)
    
    print("Saved to output.mp3")
```

---

### JavaScript / Node.js

```javascript
const axios = require('axios');

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const ENDPOINT_ID = "70sq2akye030kh";
const BASE_URL = `https://api.runpod.ai/v2/${ENDPOINT_ID}`;

async function generateSpeech(text, format = "mp3", speed = 1.0) {
    // Submit job
    const submitResponse = await axios.post(
        `${BASE_URL}/run`,
        {
            input: {
                text: text,
                format: format,
                speed: speed
            }
        },
        {
            headers: {
                "Authorization": `Bearer ${RUNPOD_API_KEY}`,
                "Content-Type": "application/json"
            }
        }
    );
    
    const jobId = submitResponse.data.id;
    console.log(`Job submitted: ${jobId}`);
    
    // Poll for result
    while (true) {
        const statusResponse = await axios.get(
            `${BASE_URL}/status/${jobId}`,
            {
                headers: {
                    "Authorization": `Bearer ${RUNPOD_API_KEY}`
                }
            }
        );
        
        const status = statusResponse.data;
        
        if (status.status === "COMPLETED") {
            // Decode base64 audio
            const audioBuffer = Buffer.from(status.output.audio_base64, 'base64');
            console.log(`✅ Generated ${audioBuffer.length} bytes`);
            return audioBuffer;
        } else if (status.status === "FAILED") {
            throw new Error(`Job failed: ${status.error}`);
        }
        
        console.log(`Status: ${status.status}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

// Example usage
(async () => {
    const fs = require('fs');
    
    const audio = await generateSpeech(
        "Hello! This is a test of the Chatterbox TTS service.",
        "mp3",
        1.0
    );
    
    fs.writeFileSync('output.mp3', audio);
    console.log('Saved to output.mp3');
})();
```

---

### TypeScript (React Native / Expo)

```typescript
import { Buffer } from 'buffer';

interface TTSInput {
  text: string;
  format?: 'mp3' | 'wav';
  speed?: number;
  voice?: string;
  language?: string;
}

interface TTSOutput {
  audio_base64: string;
  mimetype: string;
  duration_ms: number;
  cache_hit: boolean;
  chunks_processed: number;
  generation_time_ms: number;
}

interface JobStatus {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  output?: TTSOutput;
  error?: string;
}

const RUNPOD_API_KEY = process.env.EXPO_PUBLIC_RUNPOD_API_KEY;
const ENDPOINT_ID = "70sq2akye030kh";
const BASE_URL = `https://api.runpod.ai/v2/${ENDPOINT_ID}`;

export async function generateSpeech(input: TTSInput): Promise<Buffer> {
  // Submit job
  const submitResponse = await fetch(`${BASE_URL}/run`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RUNPOD_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input }),
  });
  
  const { id: jobId } = await submitResponse.json();
  console.log(`Job submitted: ${jobId}`);
  
  // Poll for result
  while (true) {
    const statusResponse = await fetch(`${BASE_URL}/status/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
      },
    });
    
    const status: JobStatus = await statusResponse.json();
    
    if (status.status === 'COMPLETED' && status.output) {
      // Decode base64 audio
      const audioBuffer = Buffer.from(status.output.audio_base64, 'base64');
      console.log(`✅ Generated ${audioBuffer.length} bytes`);
      return audioBuffer;
    } else if (status.status === 'FAILED') {
      throw new Error(`Job failed: ${status.error}`);
    }
    
    console.log(`Status: ${status.status}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Example usage in React Native
export async function playTTS(text: string) {
  const { Audio } = await import('expo-av');
  
  // Generate audio
  const audioBuffer = await generateSpeech({
    text,
    format: 'mp3',
    speed: 1.0,
  });
  
  // Save to temporary file
  const FileSystem = await import('expo-file-system');
  const fileUri = `${FileSystem.documentDirectory}temp_tts.mp3`;
  
  await FileSystem.writeAsStringAsync(
    fileUri,
    audioBuffer.toString('base64'),
    { encoding: FileSystem.EncodingType.Base64 }
  );
  
  // Play audio
  const sound = new Audio.Sound();
  await sound.loadAsync({ uri: fileUri });
  await sound.playAsync();
  
  return sound;
}
```

---

### cURL (Command Line)

```bash
# Set your API key
export RUNPOD_API_KEY="your_api_key_here"
export ENDPOINT_ID="70sq2akye030kh"

# Submit job
JOB_RESPONSE=$(curl -s -X POST "https://api.runpod.ai/v2/${ENDPOINT_ID}/run" \
  -H "Authorization: Bearer ${RUNPOD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "Hello! This is a test.",
      "format": "mp3",
      "speed": 1.0
    }
  }')

echo "$JOB_RESPONSE"
JOB_ID=$(echo "$JOB_RESPONSE" | jq -r '.id')

echo "Job ID: $JOB_ID"
echo "Polling for result..."

# Poll for result
while true; do
  STATUS_RESPONSE=$(curl -s "https://api.runpod.ai/v2/${ENDPOINT_ID}/status/${JOB_ID}" \
    -H "Authorization: Bearer ${RUNPOD_API_KEY}")
  
  STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status')
  echo "Status: $STATUS"
  
  if [ "$STATUS" == "COMPLETED" ]; then
    echo "✅ Job completed!"
    
    # Extract and save audio
    echo "$STATUS_RESPONSE" | jq -r '.output.audio_base64' | base64 -d > output.mp3
    echo "Saved to output.mp3"
    break
  elif [ "$STATUS" == "FAILED" ]; then
    echo "❌ Job failed!"
    echo "$STATUS_RESPONSE" | jq '.'
    break
  fi
  
  sleep 2
done
```

---

## 📋 API Reference

### Request Format

**Endpoint:** `POST https://api.runpod.ai/v2/{endpoint_id}/run`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_API_KEY",
  "Content-Type": "application/json"
}
```

**Body:**
```json
{
  "input": {
    "text": "string (required)",
    "format": "mp3|wav (optional, default: mp3)",
    "speed": "number (optional, 0.5-2.0, default: 1.0)",
    "voice": "string (optional, default: 'default')",
    "language": "string (optional, default: 'en')",
    "seed": "number (optional, for reproducibility)"
  }
}
```

**Response:**
```json
{
  "id": "job-id-string",
  "status": "IN_QUEUE"
}
```

---

### Status Check

**Endpoint:** `GET https://api.runpod.ai/v2/{endpoint_id}/status/{job_id}`

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_API_KEY"
}
```

**Response (In Progress):**
```json
{
  "id": "job-id-string",
  "status": "IN_QUEUE" | "IN_PROGRESS"
}
```

**Response (Completed):**
```json
{
  "id": "job-id-string",
  "status": "COMPLETED",
  "output": {
    "audio_base64": "base64-encoded-audio-bytes",
    "mimetype": "audio/mpeg" | "audio/wav",
    "duration_ms": 1234,
    "cache_hit": false,
    "cache_key": "sha256-hash",
    "chunks_processed": 1,
    "generation_time_ms": 1200
  }
}
```

**Response (Failed):**
```json
{
  "id": "job-id-string",
  "status": "FAILED",
  "error": "Error message"
}
```

---

## ⚡ Performance Characteristics

### Response Times

| Scenario | Time | Notes |
|----------|------|-------|
| **Cold Start** | 60-120s | First request, downloading model (~2GB) |
| **Warm Request** | 2-5s | Model already loaded |
| **Cache Hit** | <500ms | Same text generated before |

### Cost Estimates

**Serverless (Pay per use):**
- Cold start: ~$0.025 (90 seconds × $0.00028/sec)
- Warm request: ~$0.001 (3 seconds × $0.00028/sec)
- Cache hit: ~$0.0001 (<1 second)

**For 1000 requests/day:**
- ~10 cold starts: $0.25
- ~990 warm requests: $0.99
- **Total: ~$1.24/day (~$37/month)**

---

## 🎯 Use Cases

### 1. Real-Time TTS in Your App

```typescript
// In your React Native app
import { generateSpeech } from './chatterbox';

async function speakText(text: string) {
  const audio = await generateSpeech({
    text,
    format: 'mp3',
    speed: 1.0
  });
  
  // Play audio using expo-av or react-native-sound
  await playAudio(audio);
}
```

### 2. Batch Processing

```python
# Generate multiple audio files
texts = [
    "Welcome to our podcast!",
    "Today we're discussing...",
    "Thank you for listening!"
]

for i, text in enumerate(texts):
    audio = generate_speech(text)
    with open(f"segment_{i}.mp3", "wb") as f:
        f.write(audio)
```

### 3. Podcast Audio Generation

```python
# Replace your existing Google Cloud TTS calls
def generate_podcast_audio(script_segments):
    audio_files = []
    
    for segment in script_segments:
        # Use Chatterbox instead of Google Cloud TTS
        audio = generate_speech(
            text=segment['text'],
            format='mp3',
            speed=1.0
        )
        
        # Upload to Supabase Storage
        storage_url = upload_to_supabase(audio, f"podcasts/{segment['id']}.mp3")
        audio_files.append(storage_url)
    
    return audio_files
```

---

## 🔧 Configuration Options

### Environment Variables (Set in RunPod)

```bash
DEVICE=cuda                              # Use GPU acceleration
CACHE_DIR=/runpod-volume/tts_cache       # Cache generated audio
MODEL_CACHE_DIR=/runpod-volume/models    # Cache model weights
MAX_CHARS_PER_CHUNK=500                  # Text chunking size
HF_TOKEN=hf_your_token                   # HuggingFace authentication
```

### Input Parameters

```typescript
interface TTSInput {
  text: string;           // Required: Text to convert (no length limit)
  format?: 'mp3' | 'wav'; // Optional: Output format (default: mp3)
  speed?: number;         // Optional: 0.5-2.0 (default: 1.0)
  voice?: string;         // Optional: Voice name (default: 'default')
  language?: string;      // Optional: Language code (default: 'en')
  seed?: number;          // Optional: Random seed for reproducibility
}
```

---

## 🐛 Error Handling

### Common Errors

**1. Authentication Error (401)**
```json
{
  "error": "Unauthorized"
}
```
**Fix:** Check your RUNPOD_API_KEY

**2. Job Failed: "Model not initialized"**
```json
{
  "status": "FAILED",
  "error": "Model not initialized"
}
```
**Fix:** Ensure HF_TOKEN environment variable is set in RunPod

**3. Timeout**
- **Issue:** Job stuck in IN_QUEUE or IN_PROGRESS
- **Fix:** Increase `Execution Timeout` in RunPod settings (default: 600s)

### Retry Logic

```python
import time
from functools import wraps

def retry_on_failure(max_retries=3, delay=5):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    print(f"Attempt {attempt + 1} failed: {e}")
                    print(f"Retrying in {delay}s...")
                    time.sleep(delay)
        return wrapper
    return decorator

@retry_on_failure(max_retries=3, delay=5)
def generate_speech_with_retry(text, format="mp3"):
    return generate_speech(text, format)
```

---

## 📊 Monitoring & Optimization

### Check Endpoint Status

```python
import requests

def get_endpoint_metrics(endpoint_id, api_key):
    """Get endpoint metrics from RunPod"""
    response = requests.get(
        f"https://api.runpod.ai/v2/{endpoint_id}",
        headers={"Authorization": f"Bearer {api_key}"}
    )
    return response.json()

metrics = get_endpoint_metrics("70sq2akye030kh", RUNPOD_API_KEY)
print(f"Active workers: {metrics.get('activeWorkers', 0)}")
print(f"Jobs in queue: {metrics.get('jobsInQueue', 0)}")
```

### Optimize for Your Use Case

**High Volume (Many Requests):**
```yaml
# RunPod Settings
Min Workers: 1          # Keep 1 worker always warm
Max Workers: 10         # Scale to 10 for bursts
Idle Timeout: 120s      # Keep warm for 2 minutes
```

**Low Volume (Occasional Use):**
```yaml
# RunPod Settings (Default)
Min Workers: 0          # Scale to zero when idle
Max Workers: 3          # Max 3 concurrent workers
Idle Timeout: 30s       # Shutdown after 30s idle
```

---

## 🔐 Security Best Practices

1. **Never commit API keys** - Use environment variables
2. **Rotate keys regularly** - Generate new keys every 90 days
3. **Use separate keys** - Different keys for dev/staging/prod
4. **Monitor usage** - Check RunPod dashboard for unusual activity
5. **Set timeouts** - Prevent runaway costs with execution timeouts

---

## 📞 Support & Resources

- **RunPod Docs:** https://docs.runpod.io/serverless
- **Chatterbox GitHub:** https://github.com/resemble-ai/chatterbox
- **Your Endpoint:** https://www.runpod.io/console/serverless/user/endpoint/70sq2akye030kh
- **Test Scripts:** `/services/chatterbox_tts/examples/`

---

## 🎉 You're All Set!

Your Chatterbox TTS API is live and ready to use. Start generating speech with just a few lines of code!

```python
audio = generate_speech("Hello world!")
```

**That's it!** 🚀

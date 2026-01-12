"""
RunPod Serverless Handler for Chatterbox Multilingual TTS
Supports 23 languages with voice cloning
"""

import runpod
import time
import torch
import torchaudio
import os
import tempfile
import base64
import hashlib
from pathlib import Path
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

model = None
CACHE_DIR = Path("/tmp/tts_cache")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Supported languages (23 languages from Chatterbox Multilingual)
SUPPORTED_LANGUAGES = {
    'ar', 'da', 'de', 'el', 'en', 'es', 'fi', 'fr', 'he', 'hi', 
    'it', 'ja', 'ko', 'ms', 'nl', 'no', 'pl', 'pt', 'ru', 'sv', 
    'sw', 'tr', 'zh'
}


def handler(event):
    """
    Handle TTS generation requests
    
    Expected input format (matches HuggingFace API):
    {
        "text": "Text to synthesize",  # or "text_input"
        "language": "en",  # or "language_id" - Language code (23 languages supported)
        "voice": "/app/runpod/host_voice.flac",  # or "audio_prompt_path_input" - Optional
        "format": "mp3",  # mp3 or wav
        "exaggeration": 0.5,  # or "exaggeration_input" - 0.0-1.0, controls expressiveness
        "temperature": 0.8,  # or "temperature_input" - sampling temperature
        "cfg_weight": 0.5,  # or "cfgw_input" - classifier-free guidance weight
        "seed": 0  # or "seed_num_input" - random seed for reproducibility
    }
    """
    global model
    
    # Lazy initialization - ensure model is loaded
    if model is None:
        initialize_model()
    input_data = event.get('input', {})
    
    # Support both simplified and official HuggingFace API parameter names
    text = (input_data.get('text') or 
            input_data.get('text_input') or 
            input_data.get('prompt'))
    
    language = (input_data.get('language') or 
                input_data.get('language_id') or 
                'en')
    
    # Validate language
    if language not in SUPPORTED_LANGUAGES:
        return {
            "error": f"Unsupported language: {language}",
            "supported_languages": sorted(list(SUPPORTED_LANGUAGES))
        }
    
    voice = (input_data.get('voice') or 
             input_data.get('audio_prompt_path_input') or 
             input_data.get('audio_prompt_path'))
    
    format_type = input_data.get('format', 'mp3')
    
    # Use HuggingFace API defaults
    exaggeration = float(input_data.get('exaggeration') or 
                        input_data.get('exaggeration_input') or 
                        0.5)
    
    temperature = float(input_data.get('temperature') or 
                       input_data.get('temperature_input') or 
                       0.8)
    
    cfg_weight = float(input_data.get('cfg_weight') or 
                      input_data.get('cfgw_input') or 
                      0.5)
    
    seed = input_data.get('seed') or input_data.get('seed_num_input')
    if seed is not None:
        seed = int(seed)
    
    if not text:
        return {"error": "No text provided"}
    
    print(f"🎙️ Generating TTS:")
    print(f"   Text: {text[:50]}...")
    print(f"   Language: {language}")
    print(f"   Voice: {voice or 'default'}")
    print(f"   Format: {format_type}")
    print(f"   Exaggeration: {exaggeration}")
    print(f"   Temperature: {temperature}")
    print(f"   CFG Weight: {cfg_weight}")
    if seed is not None:
        print(f"   Seed: {seed}")
    
    try:
        start_time = time.time()
        
        # Generate cache key
        cache_key = hashlib.sha256(
            f"{text}|{language}|{voice}|{format_type}|{exaggeration}|{temperature}|{cfg_weight}|{seed}".encode()
        ).hexdigest()
        cache_file = CACHE_DIR / f"{cache_key}.{format_type}"
        
        # Check cache
        if cache_file.exists():
            print(f"✅ Cache hit: {cache_key[:12]}...")
            with open(cache_file, 'rb') as f:
                audio_data = f.read()
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            generation_time = 0
        else:
            # Set random seed if provided
            if seed is not None:
                torch.manual_seed(seed)
                if torch.cuda.is_available():
                    torch.cuda.manual_seed(seed)
                print(f"🎲 Set random seed: {seed}")
            
            # Generate audio
            print(f"🔊 Generating audio...")
            
            # Build generation parameters
            gen_params = {
                'language_id': language,
                'exaggeration': exaggeration,
                'temperature': temperature,
                'cfg_weight': cfg_weight
            }
            
            # Handle voice reference (file path or base64)
            voice_temp_file = None
            if voice:
                # Check if it looks like a file path (starts with / or contains .)
                if voice.startswith('/') and os.path.exists(voice):
                    # Voice is a file path
                    gen_params['audio_prompt_path'] = voice
                    print(f"✅ Using voice file: {voice}")
                else:
                    # Assume voice is base64 encoded audio
                    try:
                        voice_data = base64.b64decode(voice)
                        voice_temp_file = tempfile.NamedTemporaryFile(suffix='.flac', delete=False)
                        voice_temp_file.write(voice_data)
                        voice_temp_file.close()
                        gen_params['audio_prompt_path'] = voice_temp_file.name
                        print(f"✅ Decoded base64 voice reference ({len(voice_data)} bytes)")
                    except Exception as e:
                        print(f"⚠️  Failed to decode voice base64: {e}")
            
            audio_tensor = model.generate(text, **gen_params)
            
            # Clean up temp voice file if created
            if voice_temp_file:
                try:
                    os.unlink(voice_temp_file.name)
                except:
                    pass
            
            print(f"✅ Audio generated (shape: {audio_tensor.shape})")
            
            # Normalize tensor shape to [channels, time]
            if audio_tensor.dim() == 1:
                # Shape is [time] -> add channel dimension
                audio_tensor = audio_tensor.unsqueeze(0)
            elif audio_tensor.dim() == 2 and audio_tensor.shape[0] != 1:
                # If shape is [time, channels] and channels != 1, transpose
                if audio_tensor.shape[1] == 1:
                    audio_tensor = audio_tensor.transpose(0, 1)
            
            print(f"✅ Normalized shape: {audio_tensor.shape}")
            
            # Save to temporary file with correct format
            with tempfile.NamedTemporaryFile(suffix=f'.{format_type}', delete=False) as tmp_file:
                if format_type == 'wav':
                    torchaudio.save(tmp_file.name, audio_tensor, model.sr, format='wav')
                else:  # mp3
                    # Save as WAV first, then convert to MP3
                    wav_file = tmp_file.name.replace(f'.{format_type}', '.wav')
                    torchaudio.save(wav_file, audio_tensor, model.sr, format='wav')
                    
                    # Convert to MP3 using ffmpeg
                    import subprocess
                    result = subprocess.run([
                        'ffmpeg', '-i', wav_file, '-codec:a', 'libmp3lame',
                        '-b:a', '128k', '-y', tmp_file.name
                    ], capture_output=True, text=True)
                    
                    if result.returncode != 0:
                        print(f"❌ FFmpeg error: {result.stderr}")
                        raise Exception(f"FFmpeg conversion failed: {result.stderr}")
                    
                    os.remove(wav_file)
                
                # Read the audio file
                with open(tmp_file.name, 'rb') as f:
                    audio_data = f.read()
                
                # Clean up temp file
                os.unlink(tmp_file.name)
            
            # Save to cache
            cache_file.write_bytes(audio_data)
            
            # Convert to base64
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            generation_time = int((time.time() - start_time) * 1000)
        
        total_time = int((time.time() - start_time) * 1000)
        
        print(f"✅ Complete in {total_time}ms (generation: {generation_time}ms)")
        
        # Calculate actual audio duration (samples / sample_rate)
        audio_duration_s = audio_tensor.shape[-1] / model.sr if audio_tensor.dim() >= 1 else 0
        
        return {
            "status": "success",
            "audio_base64": audio_base64,
            "metadata": {
                "language": language,
                "format": format_type,
                "request_ms": total_time,
                "generation_ms": generation_time,
                "audio_duration_s": round(audio_duration_s, 2),
                "cache_hit": generation_time == 0,
                "model": "chatterbox-multilingual",
                "sample_rate": model.sr
            }
        }
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}


def initialize_model():
    """Initialize the Chatterbox Multilingual model"""
    global model
    
    if model is not None:
        print("✅ Model already initialized")
        return model
    
    print("🔄 Initializing Chatterbox Multilingual TTS...")
    print("   Languages: 23")
    print("   Device: CUDA")
    
    # Get HF token from environment if available
    hf_token = os.environ.get('HF_TOKEN') or os.environ.get('HUGGING_FACE_HUB_TOKEN')
    if hf_token:
        print("   Using HuggingFace token from environment")
    else:
        print("   ⚠️  No HF_TOKEN found - model download may fail if gated")
    
    try:
        # Pass token if available
        if hf_token:
            model = ChatterboxMultilingualTTS.from_pretrained(device="cuda", token=hf_token)
        else:
            model = ChatterboxMultilingualTTS.from_pretrained(device="cuda")
        print("✅ Model initialized successfully")
        return model
    except Exception as e:
        print(f"❌ Failed to initialize model: {e}")
        print("   Hint: If model is gated, set HF_TOKEN environment variable")
        raise


if __name__ == '__main__':
    print("=" * 60)
    print("Chatterbox Multilingual TTS - RunPod Serverless")
    print("=" * 60)
    
    initialize_model()
    
    print("\n🚀 Starting RunPod serverless handler...")
    runpod.serverless.start({'handler': handler})

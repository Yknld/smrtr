"""
RunPod Serverless Handler for Chatterbox Multilingual TTS
Supports 23 languages with voice cloning
"""

import runpod
import time
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


def handler(event):
    """
    Handle TTS generation requests
    
    Expected input format:
    {
        "text": "Text to synthesize",
        "language": "en",  # Language code (en, es, fr, de, ru, etc.)
        "voice": "/app/runpod/host_voice.flac",  # Optional: path to voice file
        "format": "mp3",  # mp3 or wav
        "exaggeration": 0.7,  # 0.0-1.0, controls expressiveness
        "speed": 1.0  # Speed multiplier
    }
    """
    input_data = event.get('input', {})
    
    text = input_data.get('text') or input_data.get('prompt')  # Support both formats
    language = input_data.get('language', 'en')
    voice = input_data.get('voice')
    format_type = input_data.get('format', 'mp3')
    exaggeration = float(input_data.get('exaggeration', 0.7))
    speed = float(input_data.get('speed', 1.0))
    
    if not text:
        return {"error": "No text provided"}
    
    print(f"🎙️ Generating TTS:")
    print(f"   Text: {text[:50]}...")
    print(f"   Language: {language}")
    print(f"   Voice: {voice or 'default'}")
    print(f"   Format: {format_type}")
    print(f"   Exaggeration: {exaggeration}")
    
    try:
        start_time = time.time()
        
        # Generate cache key
        cache_key = hashlib.sha256(
            f"{text}|{language}|{voice}|{format_type}|{exaggeration}|{speed}".encode()
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
            # Generate audio
            print(f"🔊 Generating audio...")
            
            if voice and os.path.exists(voice):
                audio_tensor = model.generate(
                    text,
                    language_id=language,
                    audio_prompt_path=voice,
                    exaggeration=exaggeration,
                    temperature=0.8,
                    cfg_weight=0.5
                )
            else:
                audio_tensor = model.generate(
                    text,
                    language_id=language,
                    exaggeration=exaggeration,
                    temperature=0.8,
                    cfg_weight=0.5
                )
            
            print(f"✅ Audio generated (shape: {audio_tensor.shape})")
            
            # Apply speed adjustment if needed
            if speed != 1.0:
                new_sample_rate = int(model.sr * speed)
                audio_tensor = torchaudio.functional.resample(
                    audio_tensor,
                    orig_freq=model.sr,
                    new_freq=new_sample_rate
                )
            
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
                    subprocess.run([
                        'ffmpeg', '-i', wav_file, '-codec:a', 'libmp3lame',
                        '-b:a', '128k', '-y', tmp_file.name
                    ], check=True, capture_output=True)
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
        
        return {
            "status": "success",
            "audio_base64": audio_base64,
            "metadata": {
                "language": language,
                "format": format_type,
                "duration_ms": total_time,
                "generation_ms": generation_time,
                "cache_hit": generation_time == 0,
                "model": "chatterbox-multilingual"
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
    
    try:
        model = ChatterboxMultilingualTTS.from_pretrained(device="cuda")
        print("✅ Model initialized successfully")
        return model
    except Exception as e:
        print(f"❌ Failed to initialize model: {e}")
        raise


if __name__ == '__main__':
    print("=" * 60)
    print("Chatterbox Multilingual TTS - RunPod Serverless")
    print("=" * 60)
    
    initialize_model()
    
    print("\n🚀 Starting RunPod serverless handler...")
    runpod.serverless.start({'handler': handler})

"""
Chatterbox TTS Multilingual FastAPI Server
Headless TTS service for RunPod deployment - supports 23 languages
"""

import os
import io
import time
import hashlib
import logging
from pathlib import Path
from typing import Optional, Literal

import torch
import torchaudio
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from cachetools import TTLCache

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# Environment configuration
DEVICE = os.getenv("DEVICE", "auto")  # auto, cuda, cpu
CACHE_DIR = Path(os.getenv("CACHE_DIR", "/tmp/tts_cache"))
MODEL_CACHE_DIR = os.getenv("MODEL_CACHE_DIR", "/models")
MAX_CHARS_PER_CHUNK = int(os.getenv("MAX_CHARS_PER_CHUNK", "500"))
DEFAULT_FORMAT = os.getenv("DEFAULT_FORMAT", "mp3")
DEFAULT_VOICE_PATH = os.getenv("DEFAULT_VOICE_PATH", None)

# Create cache directory
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# In-memory cache for frequently accessed audio (100 items, 1 hour TTL)
memory_cache = TTLCache(maxsize=100, ttl=3600)

app = FastAPI(
    title="Chatterbox TTS Multilingual API",
    description="Headless TTS service using Chatterbox Multilingual - 23 languages",
    version="1.0.0"
)

# Global model instance
model = None
model_loaded = False
device_name = "cpu"


def get_device() -> str:
    """Determine the device to use for inference"""
    if DEVICE == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    return DEVICE


def load_model():
    """Load Chatterbox Multilingual model at startup"""
    global model, model_loaded, device_name
    
    try:
        logger.info("Loading Chatterbox Multilingual model (23 languages)...")
        device_name = get_device()
        logger.info(f"Using device: {device_name}")
        
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        
        # Load multilingual model
        model = ChatterboxMultilingualTTS.from_pretrained(device=device_name)
        model_loaded = True
        
        logger.info("✓ Multilingual model loaded successfully")
        
        if device_name == "cuda":
            logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
            logger.info(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}", exc_info=True)
        model_loaded = False
        raise


def split_text_into_chunks(text: str, max_chars: int = MAX_CHARS_PER_CHUNK) -> list[str]:
    """
    Split long text into sentence-based chunks
    Respects sentence boundaries and max character limit
    """
    if len(text) <= max_chars:
        return [text]
    
    # Split by sentence boundaries
    sentences = []
    for delimiter in ['. ', '! ', '? ', '.\n', '!\n', '?\n']:
        if delimiter in text:
            text = text.replace(delimiter, delimiter + '|SPLIT|')
    
    parts = text.split('|SPLIT|')
    
    chunks = []
    current_chunk = ""
    
    for part in parts:
        part = part.strip()
        if not part:
            continue
            
        # If adding this part exceeds max, save current chunk and start new one
        if len(current_chunk) + len(part) + 1 > max_chars:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = part
        else:
            current_chunk += " " + part if current_chunk else part
    
    # Add remaining chunk
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks


def generate_cache_key(
    text: str, 
    voice: Optional[str], 
    language: str, 
    format: str,     speed: float,
    seed: Optional[int],
    exaggeration: float
) -> str:
    """Generate cache key from parameters"""
    key_parts = [
        text, 
        voice or "default", 
        language, 
        format, 
        str(speed), 
        str(seed or 0),
        str(exaggeration)
    ]
    key_string = "|".join(key_parts)
    return hashlib.sha256(key_string.encode()).hexdigest()


def audio_tensor_to_bytes(wav_tensor: torch.Tensor, sample_rate: int, format: str = "mp3") -> bytes:
    """Convert audio tensor to audio bytes (MP3 or WAV)"""
    # Ensure tensor is on CPU
    wav_tensor = wav_tensor.cpu()
    
    # Add batch dimension if needed
    if wav_tensor.ndim == 1:
        wav_tensor = wav_tensor.unsqueeze(0)
    
    # Save to bytes buffer
    buffer = io.BytesIO()
    
    if format == "wav":
        torchaudio.save(buffer, wav_tensor, sample_rate, format="wav")
    else:  # mp3
        # Save as wav first, then convert to mp3 using pydub
        wav_buffer = io.BytesIO()
        torchaudio.save(wav_buffer, wav_tensor, sample_rate, format="wav")
        wav_buffer.seek(0)
        
        from pydub import AudioSegment
        audio = AudioSegment.from_wav(wav_buffer)
        audio.export(buffer, format="mp3", bitrate="128k")
    
    buffer.seek(0)
    return buffer.read()


def concatenate_audio_tensors(tensors: list[torch.Tensor]) -> torch.Tensor:
    """Concatenate multiple audio tensors"""
    if len(tensors) == 1:
        return tensors[0]
    
    # Ensure all on same device
    device = tensors[0].device
    tensors = [t.to(device) for t in tensors]
    
    # Concatenate along time dimension
    return torch.cat(tensors, dim=-1)


@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    load_model()


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "ok": True,
        "model_loaded": model_loaded,
        "device": device_name,
        "model": "chatterbox-multilingual",
        "languages": 23,
        "cache_size": len(memory_cache),
        "cuda_available": torch.cuda.is_available()
    }


class TTSRequest(BaseModel):
    text: str = Field(..., description="Text to synthesize", min_length=1, max_length=5000)
    voice: Optional[str] = Field(None, description="Path to reference voice audio file (optional)")
    language: str = Field("en", description="Language code (e.g., 'en', 'es', 'fr', 'de', 'ru', etc.)")
    format: Literal["mp3", "wav"] = Field("mp3", description="Output audio format")
    speed: float = Field(1.0, ge=0.5, le=2.0, description="Speech speed multiplier")
    exaggeration: float = Field(0.7, ge=0.0, le=1.0, description="Expressiveness level (higher = more expressive)")
    seed: Optional[int] = Field(None, description="Random seed for reproducibility")


@app.post("/tts")
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech in 23 languages
    
    Returns audio bytes with appropriate Content-Type header
    """
    if not model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    start_time = time.time()
    
    # Generate cache key
    cache_key = generate_cache_key(
        request.text,
        request.voice,
        request.language,
        request.format,
        request.speed,
        request.seed,
        request.exaggeration
    )
    
    # Check file cache first
    cache_file = CACHE_DIR / f"{cache_key}.{request.format}"
    cache_hit = False
    
    if cache_file.exists():
        logger.info(f"Cache hit (file): {cache_key[:12]}...")
        audio_bytes = cache_file.read_bytes()
        cache_hit = True
    elif cache_key in memory_cache:
        logger.info(f"Cache hit (memory): {cache_key[:12]}...")
        audio_bytes = memory_cache[cache_key]
        cache_hit = True
    else:
        # Generate audio
        logger.info(f"Generating audio for: {request.text[:50]}... (lang={request.language})")
        
        try:
            # Set seed if provided
            if request.seed is not None:
                torch.manual_seed(request.seed)
                if torch.cuda.is_available():
                    torch.cuda.manual_seed(request.seed)
            
            # Split text into chunks if needed
            chunks = split_text_into_chunks(request.text, MAX_CHARS_PER_CHUNK)
            logger.info(f"Processing {len(chunks)} chunk(s)")
            
            # Generate audio for each chunk
            audio_tensors = []
            for i, chunk in enumerate(chunks):
                logger.info(f"Chunk {i+1}/{len(chunks)}: {chunk[:50]}...")
                
                # Use custom voice if provided, otherwise use default or model's default
                audio_prompt_path = request.voice or DEFAULT_VOICE_PATH
                
                # Multilingual model: use language_id and exaggeration
                if audio_prompt_path:
                    wav = model.generate(
                        chunk, 
                        language_id=request.language,
                        audio_prompt_path=audio_prompt_path,
                        exaggeration=request.exaggeration,
                        temperature=0.8,
                        cfg_weight=0.5
                    )
                else:
                    wav = model.generate(
                        chunk,
                        language_id=request.language,
                        exaggeration=request.exaggeration,
                        temperature=0.8,
                        cfg_weight=0.5
                    )
                
                audio_tensors.append(wav)
            
            # Concatenate all chunks
            full_audio = concatenate_audio_tensors(audio_tensors)
            
            # Apply speed adjustment if needed
            if request.speed != 1.0:
                # Resample to adjust speed
                new_sample_rate = int(model.sr * request.speed)
                full_audio = torchaudio.functional.resample(
                    full_audio, 
                    orig_freq=model.sr, 
                    new_freq=new_sample_rate
                )
            
            # Convert to bytes
            audio_bytes = audio_tensor_to_bytes(full_audio, model.sr, request.format)
            
            # Cache the result
            cache_file.write_bytes(audio_bytes)
            memory_cache[cache_key] = audio_bytes
            
            logger.info(f"Generated {len(audio_bytes)} bytes")
            
        except Exception as e:
            logger.error(f"Generation failed: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")
    
    duration_ms = int((time.time() - start_time) * 1000)
    
    # Determine content type
    content_type = "audio/mpeg" if request.format == "mp3" else "audio/wav"
    
    # Return audio with headers
    return Response(
        content=audio_bytes,
        media_type=content_type,
        headers={
            "X-Duration-Ms": str(duration_ms),
            "X-Model": "chatterbox-multilingual",
            "X-Language": request.language,
            "X-Voice": request.voice or "default",
            "X-Cache-Hit": str(cache_hit).lower(),
            "X-Device": device_name
        }
    )


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Chatterbox TTS Multilingual API",
        "version": "1.0.0",
        "model": "chatterbox-multilingual",
        "languages": 23,
        "status": "running" if model_loaded else "loading",
        "endpoints": {
            "health": "/health",
            "tts": "/tts (POST)"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )

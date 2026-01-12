"""
RunPod Serverless Handler for Chatterbox TTS
Handles serverless requests and returns base64-encoded audio

IMPORTANT: This is the ONLY entrypoint for RunPod serverless.
Do not use uvicorn or FastAPI - RunPod manages the HTTP layer.

Model loads once at module import time (singleton pattern).
Weights are baked into image at build time for fast cold starts.
"""

import os
import io
import base64
import logging
import hashlib
import time
from pathlib import Path
from typing import Optional, Dict, Any

import torch
import torchaudio
import runpod

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# Environment configuration
CACHE_DIR = Path(os.getenv("CACHE_DIR", "/runpod-volume/tts_cache"))
MODEL_CACHE_DIR = Path(os.getenv("MODEL_CACHE_DIR", "/runpod-volume/models"))
MAX_CHARS_PER_CHUNK = int(os.getenv("MAX_CHARS_PER_CHUNK", "500"))

# Create cache directories
CACHE_DIR.mkdir(parents=True, exist_ok=True)
MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Module-level singleton: Model loads ONCE when container starts
# This ensures fast warm starts (model already in memory)
logger.info("=== Initializing Chatterbox TTS (module-level singleton) ===")
model = None
model_loaded = False
device_name = "cpu"


def _load_model_singleton():
    """
    Load Chatterbox model once at module import time (singleton pattern).
    This runs when the container starts, not per request.
    """
    global model, model_loaded, device_name
    
    try:
        start_time = time.time()
        logger.info("Loading Chatterbox Multilingual model (23 languages, singleton)...")
        
        # Set cache directory for model weights BEFORE any imports
        os.environ['TORCH_HOME'] = str(MODEL_CACHE_DIR)
        
        # Determine device - match example_tts.py exactly
        if torch.cuda.is_available():
            device_name = "cuda"
        else:
            device_name = "cpu"
        logger.info(f"Device: {device_name}")
        
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        
        # Load multilingual model exactly as in example_tts.py
        model = ChatterboxMultilingualTTS.from_pretrained(device=device_name)
        model_loaded = True
        
        load_time = time.time() - start_time
        logger.info(f"✓ Model loaded in {load_time:.2f}s")
        
        if device_name == "cuda":
            logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
            logger.info(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}", exc_info=True)
        model_loaded = False
        return False


def split_text_into_chunks(text: str, max_chars: int = MAX_CHARS_PER_CHUNK) -> list[str]:
    """Split long text into sentence-based chunks"""
    if len(text) <= max_chars:
        return [text]
    
    # Split by sentence boundaries
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
            
        if len(current_chunk) + len(part) + 1 > max_chars:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = part
        else:
            current_chunk += " " + part if current_chunk else part
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks


def generate_cache_key(text: str, voice: Optional[str], language: str, format: str, speed: float, seed: Optional[int], exaggeration: float = 0.5) -> str:
    """
    Generate stable cache key from normalized input parameters.
    Uses SHA256 hash of concatenated parameters for consistent caching.
    """
    # Normalize inputs
    text_normalized = text.strip().lower()
    voice_normalized = (voice or "default").strip()
    language_normalized = language.strip().lower()
    format_normalized = format.strip().lower()
    speed_normalized = round(speed, 2)  # Round to 2 decimals for stability
    exaggeration_normalized = round(exaggeration, 2)  # Round to 2 decimals for stability
    seed_normalized = seed if seed is not None else 0
    
    # Create stable key string
    key_parts = [
        text_normalized,
        voice_normalized,
        language_normalized,
        format_normalized,
        str(speed_normalized),
        str(exaggeration_normalized),
        str(seed_normalized)
    ]
    key_string = "|".join(key_parts)
    
    # Generate SHA256 hash
    cache_key = hashlib.sha256(key_string.encode('utf-8')).hexdigest()
    
    return cache_key


def audio_tensor_to_bytes(wav_tensor: torch.Tensor, sample_rate: int, format: str = "mp3") -> bytes:
    """Convert audio tensor to audio bytes"""
    wav_tensor = wav_tensor.cpu()
    
    if wav_tensor.ndim == 1:
        wav_tensor = wav_tensor.unsqueeze(0)
    
    buffer = io.BytesIO()
    
    if format == "wav":
        torchaudio.save(buffer, wav_tensor, sample_rate, format="wav")
    else:  # mp3
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
    
    device = tensors[0].device
    tensors = [t.to(device) for t in tensors]
    return torch.cat(tensors, dim=-1)


def trim_silence(wav_tensor: torch.Tensor, threshold: float = 0.01, frame_length: int = 2048) -> torch.Tensor:
    """
    Trim leading and trailing silence from audio tensor.
    
    Args:
        wav_tensor: Audio tensor (1D or 2D)
        threshold: Amplitude threshold for silence detection (0.01 = 1% of max amplitude)
        frame_length: Window size for silence detection
    
    Returns:
        Trimmed audio tensor
    """
    if wav_tensor.ndim == 2:
        wav_tensor = wav_tensor.squeeze(0)
    
    # Calculate absolute amplitude
    abs_wav = torch.abs(wav_tensor)
    
    # Find non-silent regions
    non_silent = abs_wav > threshold
    
    if not non_silent.any():
        # If entire audio is silent, return a tiny slice to avoid empty audio
        return wav_tensor[:100]
    
    # Find first and last non-silent samples
    non_silent_indices = torch.where(non_silent)[0]
    start_idx = max(0, non_silent_indices[0].item() - frame_length // 2)
    end_idx = min(len(wav_tensor), non_silent_indices[-1].item() + frame_length // 2)
    
    trimmed = wav_tensor[start_idx:end_idx]
    
    # Ensure we return at least some audio
    if len(trimmed) < 100:
        return wav_tensor[:100]
    
    return trimmed.unsqueeze(0) if wav_tensor.ndim == 2 else trimmed


def handler(job: Dict[str, Any]) -> Dict[str, Any]:
    """
    RunPod serverless handler function.
    This is called for each job. Model is already loaded (singleton).
    
    Expected input:
    {
        "text": "string (required, max 5000 chars)",
        "voice": "optional_path_to_reference_audio",
        "language": "en (default)",
        "format": "mp3 (default) or wav",
        "speed": 1.0 (default, range 0.5-2.0),
        "exaggeration": 0.5 (default, range 0.0-1.0, higher = more expressive),
        "seed": null or int (for reproducibility)
    }
    
    Returns:
    {
        "audio_base64": "base64_encoded_audio",
        "mimetype": "audio/mpeg" or "audio/wav",
        "duration_ms": 1234,
        "cache_hit": true/false,
        "cache_key": "sha256_hash",
        "device": "cuda" or "cpu",
        "chunks_processed": 3,
        "generation_time_ms": 1234
    }
    """
    logger.info("="*80)
    logger.info("HANDLER CALLED - Job received!")
    logger.info(f"Job keys: {list(job.keys())}")
    logger.info("="*80)
    
    global model, model_loaded, device_name
    
    start_time = time.time()
    
    # Ensure model is loaded (should already be loaded at module level)
    if not model_loaded:
        logger.error("Model not loaded - this should not happen!")
        return {"error": "Model not initialized"}
    
    try:
        # Parse input
        job_input = job.get("input", {})
        text = job_input.get("text")
        voice = job_input.get("voice", None)
        language = job_input.get("language", "en")
        format = job_input.get("format", "mp3")
        speed = float(job_input.get("speed", 1.0))
        exaggeration = float(job_input.get("exaggeration", 0.5))
        seed = job_input.get("seed", None)
        
        # Validate required fields
        if not text:
            return {"error": "Missing required field: 'text'"}
        
        if not isinstance(text, str):
            return {"error": "Field 'text' must be a string"}
        
        # Validate constraints
        if len(text) > 5000:
            return {"error": f"Text too long: {len(text)} chars (max 5000)"}
        
        if format not in ["mp3", "wav"]:
            return {"error": f"Invalid format: '{format}' (must be 'mp3' or 'wav')"}
        
        if not 0.5 <= speed <= 2.0:
            return {"error": f"Invalid speed: {speed} (must be 0.5-2.0)"}
        
        if not 0.0 <= exaggeration <= 1.0:
            return {"error": f"Invalid exaggeration: {exaggeration} (must be 0.0-1.0)"}
        
        logger.info(f"Processing request: '{text[:50]}...' (len={len(text)})")
        
        # Generate stable cache key
        cache_key = generate_cache_key(text, voice, language, format, speed, seed, exaggeration)
        cache_file = CACHE_DIR / f"{cache_key}.{format}"
        cache_hit = False
        
        logger.info(f"Cache key: {cache_key[:16]}...")
        
        # Check cache
        if cache_file.exists():
            logger.info(f"✓ Cache hit!")
            audio_bytes = cache_file.read_bytes()
            cache_hit = True
            chunks_processed = 0
        else:
            logger.info(f"✗ Cache miss - generating audio...")
            
            # Set seed for reproducibility
            if seed is not None:
                torch.manual_seed(seed)
                if torch.cuda.is_available():
                    torch.cuda.manual_seed(seed)
            
            # Split text into chunks
            chunks = split_text_into_chunks(text, MAX_CHARS_PER_CHUNK)
            chunks_processed = len(chunks)
            logger.info(f"Split into {chunks_processed} chunk(s)")
            
            # Generate audio for each chunk
            audio_tensors = []
            for i, chunk in enumerate(chunks):
                logger.info(f"  Chunk {i+1}/{chunks_processed}: '{chunk[:40]}...'")
                
                # Multilingual: simple like Turbo but with language_id + HF API params
                logger.info(f"  → Calling model.generate (language={language}, voice={'yes' if voice else 'no'})")
                if voice:
                    wav = model.generate(
                        chunk,
                        language_id=language,
                        audio_prompt_path=voice,
                        exaggeration=exaggeration,
                        temperature=0.8,
                        cfg_weight=0.5
                    )
                else:
                    wav = model.generate(
                        chunk,
                        language_id=language,
                        exaggeration=exaggeration,
                        temperature=0.8,
                        cfg_weight=0.5
                    )
                logger.info(f"  ✓ model.generate returned (shape={wav.shape if hasattr(wav, 'shape') else 'unknown'})")
                
                audio_tensors.append(wav)
            
            # Concatenate all chunks
            full_audio = concatenate_audio_tensors(audio_tensors)
            
            # Apply speed adjustment
            if speed != 1.0:
                logger.info(f"Applying speed adjustment: {speed}x")
                new_sample_rate = int(model.sr * speed)
                full_audio = torchaudio.functional.resample(
                    full_audio,
                    orig_freq=model.sr,
                    new_freq=new_sample_rate
                )
            
            # Trim silence from beginning and end
            logger.info(f"Trimming silence (original length: {full_audio.shape[-1]} samples)...")
            full_audio = trim_silence(full_audio, threshold=0.01)
            logger.info(f"After trimming: {full_audio.shape[-1]} samples")
            
            # Convert to bytes
            audio_bytes = audio_tensor_to_bytes(full_audio, model.sr, format)
            
            # Save to cache
            try:
                cache_file.write_bytes(audio_bytes)
                logger.info(f"✓ Cached to {cache_file.name}")
            except Exception as cache_error:
                logger.warning(f"Failed to cache: {cache_error}")
            
            logger.info(f"✓ Generated {len(audio_bytes)} bytes")
        
        # Encode to base64
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        # Calculate generation time
        generation_time_ms = int((time.time() - start_time) * 1000)
        
        # Determine mimetype
        mimetype = "audio/mpeg" if format == "mp3" else "audio/wav"
        
        # Return result
        result = {
            "audio_base64": audio_base64,
            "mimetype": mimetype,
            "size_bytes": len(audio_bytes),
            "cache_hit": cache_hit,
            "cache_key": cache_key[:16],  # First 16 chars for debugging
            "device": device_name,
            "chunks_processed": chunks_processed,
            "generation_time_ms": generation_time_ms
        }
        
        logger.info(f"✓ Request complete in {generation_time_ms}ms (cache_hit={cache_hit})")
        return result
        
    except Exception as e:
        logger.error(f"Handler error: {e}", exc_info=True)
        return {
            "error": str(e),
            "error_type": type(e).__name__
        }


# ============================================================================
# Module-level initialization (runs once when container starts)
# ============================================================================

# Load model at module import time (singleton pattern)
_load_model_singleton()

# Health check handler for RunPod
def health_check():
    """
    Health check endpoint for RunPod workers.
    Returns model status and readiness.
    """
    global model_loaded, model, device_name
    
    status = {
        "status": "healthy" if model_loaded else "unhealthy",
        "model_loaded": model_loaded,
        "device": device_name,
        "ready": model_loaded and model is not None
    }
    
    logger.info(f"Health check: {status}")
    return status


# Start RunPod serverless handler
# This blocks and listens for jobs from RunPod
# NOTE: Must be at module level for RunPod to detect it
logger.info("Starting RunPod serverless handler...")
logger.info(f"Model loaded: {model_loaded}")
logger.info(f"Device: {device_name}")
logger.info(f"Cache dir: {CACHE_DIR}")
logger.info(f"Model cache dir: {MODEL_CACHE_DIR}")

runpod.serverless.start({"handler": handler})

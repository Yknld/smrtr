#!/usr/bin/env python3
import torch
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

print("Loading multilingual model...")
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Device: {device}")

model = ChatterboxMultilingualTTS.from_pretrained(device=device)
print("Model loaded successfully!")

# Test with voice file
text = "Привет, как дела?"
voice_file = "/Users/danielntumba/smrtr/services/chatterbox_tts/runpod/host_voice.flac"

print(f"Testing generation with:")
print(f"  Text: {text}")
print(f"  Language: ru")
print(f"  Voice: {voice_file}")
print(f"  Exaggeration: 0.7")

try:
    wav = model.generate(
        text,
        language_id="ru",
        audio_prompt_path=voice_file,
        exaggeration=0.7,
        temperature=0.8,
        cfg_weight=0.5
    )
    print(f"✅ SUCCESS! Generated audio shape: {wav.shape}")
except Exception as e:
    print(f"❌ ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

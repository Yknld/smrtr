#!/usr/bin/env python3
"""
Python client example for Chatterbox TTS API
"""

import sys
import json
import requests
from pathlib import Path


class ChatterboxClient:
    """Simple client for Chatterbox TTS API"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip("/")
    
    def health(self) -> dict:
        """Check service health"""
        response = requests.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()
    
    def generate(
        self,
        text: str,
        voice: str = None,
        language: str = "en",
        format: str = "mp3",
        speed: float = 1.0,
        seed: int = None,
        output_file: str = None
    ) -> bytes:
        """
        Generate speech from text
        
        Args:
            text: Text to synthesize
            voice: Path to reference voice audio (optional)
            language: Language code (default: "en")
            format: Output format ("mp3" or "wav")
            speed: Speech speed (0.5 - 2.0)
            seed: Random seed for reproducibility (optional)
            output_file: Path to save audio file (optional)
        
        Returns:
            Audio bytes
        """
        payload = {
            "text": text,
            "language": language,
            "format": format,
            "speed": speed
        }
        
        if voice:
            payload["voice"] = voice
        
        if seed is not None:
            payload["seed"] = seed
        
        response = requests.post(
            f"{self.base_url}/tts",
            json=payload
        )
        response.raise_for_status()
        
        # Print headers
        print(f"✓ Generated audio")
        print(f"  Duration: {response.headers.get('X-Duration-Ms')}ms")
        print(f"  Model: {response.headers.get('X-Model')}")
        print(f"  Device: {response.headers.get('X-Device')}")
        print(f"  Cache Hit: {response.headers.get('X-Cache-Hit')}")
        
        audio_bytes = response.content
        
        # Save to file if specified
        if output_file:
            Path(output_file).write_bytes(audio_bytes)
            print(f"  Saved to: {output_file}")
        
        return audio_bytes


def main():
    """Run example tests"""
    
    # Parse base URL from command line
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    
    print("=" * 60)
    print("Chatterbox TTS Python Client Example")
    print("=" * 60)
    print(f"Base URL: {base_url}\n")
    
    # Initialize client
    client = ChatterboxClient(base_url)
    
    # Test 1: Health check
    print("Test 1: Health Check")
    print("-" * 60)
    health = client.health()
    print(json.dumps(health, indent=2))
    print()
    
    if not health.get("model_loaded"):
        print("❌ Model not loaded. Exiting.")
        sys.exit(1)
    
    # Test 2: Basic generation
    print("\nTest 2: Basic Generation")
    print("-" * 60)
    client.generate(
        text="Hello, this is a test of the Python client.",
        output_file="python_test_basic.mp3"
    )
    print()
    
    # Test 3: With paralinguistic tags
    print("\nTest 3: Paralinguistic Tags")
    print("-" * 60)
    client.generate(
        text="Hi there [chuckle], I was wondering if you have a moment?",
        output_file="python_test_tags.mp3"
    )
    print()
    
    # Test 4: Long text
    print("\nTest 4: Long Text (Chunking)")
    print("-" * 60)
    client.generate(
        text=(
            "Artificial intelligence is transforming the world in unprecedented ways. "
            "From natural language processing to computer vision, AI systems are becoming "
            "increasingly sophisticated. Machine learning models can now understand context, "
            "generate creative content, and even engage in meaningful conversations. "
            "The field continues to evolve rapidly with new breakthroughs happening every day."
        ),
        output_file="python_test_long.mp3"
    )
    print()
    
    # Test 5: WAV format
    print("\nTest 5: WAV Format")
    print("-" * 60)
    client.generate(
        text="This is a WAV format test.",
        format="wav",
        output_file="python_test.wav"
    )
    print()
    
    # Test 6: Speed control
    print("\nTest 6: Speed Control (0.8x)")
    print("-" * 60)
    client.generate(
        text="This text will be spoken more slowly.",
        speed=0.8,
        output_file="python_test_slow.mp3"
    )
    print()
    
    # Test 7: Reproducible with seed
    print("\nTest 7: Reproducible (seed=42)")
    print("-" * 60)
    client.generate(
        text="This will always generate the same output.",
        seed=42,
        output_file="python_test_seed.mp3"
    )
    print()
    
    # Test 8: Cache test
    print("\nTest 8: Cache Test (Repeat Request)")
    print("-" * 60)
    print("First request (no cache):")
    client.generate(
        text="This is a cache test.",
        output_file="python_test_cache1.mp3"
    )
    print("\nSecond request (should hit cache):")
    client.generate(
        text="This is a cache test.",
        output_file="python_test_cache2.mp3"
    )
    print()
    
    # Summary
    print("\n" + "=" * 60)
    print("✓ All tests complete!")
    print("=" * 60)
    print("\nGenerated files:")
    for file in Path(".").glob("python_test_*"):
        print(f"  {file.name} ({file.stat().st_size} bytes)")
    print()


if __name__ == "__main__":
    main()

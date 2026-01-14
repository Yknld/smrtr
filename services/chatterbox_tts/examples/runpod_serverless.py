#!/usr/bin/env python3
"""
RunPod Serverless API Client for Chatterbox TTS
Demonstrates both synchronous (runsync) and asynchronous (run) endpoints
"""

import os
import sys
import time
import base64
import json
from pathlib import Path
from typing import Dict, Any, Optional

import requests


class RunPodServerlessClient:
    """Client for RunPod serverless API"""
    
    def __init__(self, endpoint_id: str, api_key: str):
        """
        Initialize RunPod client
        
        Args:
            endpoint_id: Your RunPod endpoint ID
            api_key: Your RunPod API key
        """
        self.endpoint_id = endpoint_id
        self.api_key = api_key
        self.base_url = f"https://api.runpod.ai/v2/{endpoint_id}"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def runsync(
        self,
        text: str,
        voice: Optional[str] = None,
        language: str = "en",
        format: str = "mp3",
        speed: float = 1.0,
        seed: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Synchronous request (waits for completion, max 90s timeout)
        
        Best for: Quick requests with immediate response
        
        Args:
            text: Text to synthesize
            voice: Path to reference audio (optional)
            language: Language code (default: "en")
            format: Output format ("mp3" or "wav")
            speed: Speech speed (0.5 - 2.0)
            seed: Random seed for reproducibility
        
        Returns:
            Response dict with audio_base64, cache_hit, etc.
        """
        payload = {
            "input": {
                "text": text,
                "language": language,
                "format": format,
                "speed": speed
            }
        }
        
        if voice:
            payload["input"]["voice"] = voice
        
        if seed is not None:
            payload["input"]["seed"] = seed
        
        response = requests.post(
            f"{self.base_url}/runsync",
            headers=self.headers,
            json=payload,
            timeout=120  # Allow extra time beyond RunPod's 90s
        )
        response.raise_for_status()
        
        return response.json()
    
    def run(
        self,
        text: str,
        voice: Optional[str] = None,
        language: str = "en",
        format: str = "mp3",
        speed: float = 1.0,
        seed: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Asynchronous request (returns job ID immediately)
        
        Best for: Long-running requests, batch processing
        
        Args:
            text: Text to synthesize
            voice: Path to reference audio (optional)
            language: Language code (default: "en")
            format: Output format ("mp3" or "wav")
            speed: Speech speed (0.5 - 2.0)
            seed: Random seed for reproducibility
        
        Returns:
            Response dict with job id
        """
        payload = {
            "input": {
                "text": text,
                "language": language,
                "format": format,
                "speed": speed
            }
        }
        
        if voice:
            payload["input"]["voice"] = voice
        
        if seed is not None:
            payload["input"]["seed"] = seed
        
        response = requests.post(
            f"{self.base_url}/run",
            headers=self.headers,
            json=payload
        )
        response.raise_for_status()
        
        return response.json()
    
    def status(self, job_id: str) -> Dict[str, Any]:
        """
        Check job status
        
        Args:
            job_id: Job ID from run() call
        
        Returns:
            Status response with current job state
        """
        response = requests.get(
            f"{self.base_url}/status/{job_id}",
            headers=self.headers
        )
        response.raise_for_status()
        
        return response.json()
    
    def poll_until_complete(
        self,
        job_id: str,
        poll_interval: int = 2,
        max_polls: int = 60
    ) -> Dict[str, Any]:
        """
        Poll job status until completion
        
        Args:
            job_id: Job ID to poll
            poll_interval: Seconds between polls
            max_polls: Maximum number of polls
        
        Returns:
            Final job status
        
        Raises:
            TimeoutError: If max_polls exceeded
            RuntimeError: If job failed
        """
        for i in range(max_polls):
            status_response = self.status(job_id)
            status = status_response.get("status")
            
            print(f"  Poll {i+1}/{max_polls}: {status}")
            
            if status == "COMPLETED":
                return status_response
            elif status == "FAILED":
                error = status_response.get("error", "Unknown error")
                raise RuntimeError(f"Job failed: {error}")
            elif status in ["IN_QUEUE", "IN_PROGRESS"]:
                time.sleep(poll_interval)
            else:
                print(f"  Unknown status: {status}")
                time.sleep(poll_interval)
        
        raise TimeoutError(f"Job did not complete after {max_polls} polls")
    
    def save_audio(self, response: Dict[str, Any], output_file: str):
        """
        Extract and save audio from response
        
        Args:
            response: Response from runsync() or poll_until_complete()
            output_file: Path to save audio file
        """
        if response.get("status") != "COMPLETED":
            raise ValueError(f"Job not completed: {response.get('status')}")
        
        output = response.get("output", {})
        audio_base64 = output.get("audio_base64")
        
        if not audio_base64:
            raise ValueError("No audio_base64 in response")
        
        audio_bytes = base64.b64decode(audio_base64)
        Path(output_file).write_bytes(audio_bytes)
        
        print(f"✓ Saved to: {output_file}")
        print(f"  Size: {len(audio_bytes)} bytes")
        print(f"  Cache hit: {output.get('cache_hit')}")
        print(f"  Device: {output.get('device')}")
        print(f"  Generation time: {output.get('generation_time_ms')}ms")


def main():
    """Run example tests"""
    
    # Get credentials from environment
    endpoint_id = os.getenv("RUNPOD_ENDPOINT_ID", "your-endpoint-id")
    api_key = os.getenv("RUNPOD_API_KEY", "your-api-key")
    
    if endpoint_id == "your-endpoint-id" or api_key == "your-api-key":
        print("❌ Error: Please set environment variables:")
        print("")
        print("  export RUNPOD_ENDPOINT_ID=your-endpoint-id")
        print("  export RUNPOD_API_KEY=your-api-key")
        print("")
        sys.exit(1)
    
    print("=" * 60)
    print("RunPod Serverless - Chatterbox TTS API Examples")
    print("=" * 60)
    print(f"Endpoint ID: {endpoint_id}")
    print()
    
    # Initialize client
    client = RunPodServerlessClient(endpoint_id, api_key)
    
    # Test 1: Synchronous request
    print("\n" + "=" * 60)
    print("Test 1: Synchronous Request (runsync)")
    print("=" * 60)
    print("Best for: Quick requests with immediate response")
    print()
    
    try:
        start_time = time.time()
        response = client.runsync(
            text="This is a synchronous test of RunPod serverless.",
            format="mp3"
        )
        elapsed = time.time() - start_time
        
        print(f"✓ Request completed in {elapsed:.2f}s")
        print(json.dumps(response, indent=2))
        print()
        
        # Save audio
        client.save_audio(response, "runpod_sync.mp3")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 2: Asynchronous request with polling
    print("\n" + "=" * 60)
    print("Test 2: Asynchronous Request (run + polling)")
    print("=" * 60)
    print("Best for: Long-running requests, batch processing")
    print()
    
    try:
        # Submit async request
        print("Step 1: Submit async request...")
        run_response = client.run(
            text="This is an asynchronous test with longer text to demonstrate polling. The request is queued and processed asynchronously, which is useful for batch processing or when you need to handle many requests concurrently.",
            format="mp3",
            seed=42
        )
        
        job_id = run_response.get("id")
        print(f"✓ Job submitted: {job_id}")
        print()
        
        # Poll for completion
        print("Step 2: Polling for status...")
        final_response = client.poll_until_complete(job_id)
        
        print()
        print("✓ Job completed!")
        print(json.dumps(final_response, indent=2))
        print()
        
        # Save audio
        client.save_audio(final_response, "runpod_async.mp3")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 3: Cache test
    print("\n" + "=" * 60)
    print("Test 3: Cache Test (should hit cache)")
    print("=" * 60)
    print("Repeating first request - should be instant")
    print()
    
    try:
        start_time = time.time()
        response = client.runsync(
            text="This is a synchronous test of RunPod serverless.",
            format="mp3"
        )
        elapsed = time.time() - start_time
        
        cache_hit = response.get("output", {}).get("cache_hit")
        gen_time = response.get("output", {}).get("generation_time_ms")
        
        print(f"✓ Request completed in {elapsed:.2f}s")
        print(f"  Cache hit: {cache_hit}")
        print(f"  Generation time: {gen_time}ms")
        
        if cache_hit:
            print("\n✓ Cache working correctly!")
        else:
            print("\n⚠️  Cache miss (unexpected)")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 4: Paralinguistic tags
    print("\n" + "=" * 60)
    print("Test 4: Paralinguistic Tags")
    print("=" * 60)
    print()
    
    try:
        response = client.runsync(
            text="Hi there [chuckle], this is pretty amazing [pause], don't you think?",
            format="mp3"
        )
        
        print("✓ Request completed")
        client.save_audio(response, "runpod_tags.mp3")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print("✓ All tests complete!")
    print("=" * 60)
    print()
    print("Generated files:")
    for file in Path(".").glob("runpod_*.mp3"):
        size = file.stat().st_size
        print(f"  {file.name} ({size} bytes)")
    print()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Test RunPod Serverless Endpoint for Chatterbox TTS
"""
import os
import time
import base64
import requests
from typing import Dict, Any

# Configuration
RUNPOD_API_KEY = os.environ.get("RUNPOD_API_KEY", "your_api_key_here")
ENDPOINT_ID = os.environ.get("ENDPOINT_ID", "your_endpoint_id_here")
BASE_URL = f"https://api.runpod.ai/v2/{ENDPOINT_ID}"

HEADERS = {
    "Authorization": f"Bearer {RUNPOD_API_KEY}",
    "Content-Type": "application/json"
}


def runsync(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Synchronous request - waits for result"""
    url = f"{BASE_URL}/runsync"
    response = requests.post(url, headers=HEADERS, json={"input": payload})
    response.raise_for_status()
    return response.json()


def run_async(payload: Dict[str, Any]) -> str:
    """Asynchronous request - returns job ID"""
    url = f"{BASE_URL}/run"
    response = requests.post(url, headers=HEADERS, json={"input": payload})
    response.raise_for_status()
    return response.json()["id"]


def get_status(job_id: str) -> Dict[str, Any]:
    """Check job status"""
    url = f"{BASE_URL}/status/{job_id}"
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    return response.json()


def poll_for_result(job_id: str, max_wait: int = 60) -> Dict[str, Any]:
    """Poll until job completes"""
    start_time = time.time()
    while time.time() - start_time < max_wait:
        result = get_status(job_id)
        status = result.get("status")
        
        print(f"Status: {status}", end="\r")
        
        if status == "COMPLETED":
            print(f"\n✅ Job completed in {time.time() - start_time:.1f}s")
            return result
        elif status == "FAILED":
            print(f"\n❌ Job failed!")
            raise Exception(f"Job failed: {result.get('error', 'Unknown error')}")
        
        time.sleep(2)
    
    raise TimeoutError(f"Job did not complete within {max_wait}s")


def save_audio(audio_base64: str, filename: str):
    """Save base64 audio to file"""
    audio_bytes = base64.b64decode(audio_base64)
    with open(filename, "wb") as f:
        f.write(audio_bytes)
    print(f"✅ Saved audio to {filename} ({len(audio_bytes)} bytes)")


def main():
    print("=== RunPod Serverless TTS Tests ===\n")
    
    # Test 1: Synchronous request
    print("Test 1: Synchronous request")
    payload = {
        "text": "Hello! This is a test of the Chatterbox TTS service.",
        "voice": "default",
        "format": "mp3",
        "speed": 1.0
    }
    
    start = time.time()
    result = runsync(payload)
    elapsed = time.time() - start
    
    if result.get("status") == "COMPLETED":
        output = result.get("output", {})
        print(f"✅ Request completed in {elapsed:.1f}s")
        print(f"   Duration: {output.get('duration_ms')}ms")
        print(f"   Cache hit: {output.get('cache_hit')}")
        print(f"   Chunks: {output.get('chunks_processed')}")
        
        # Save audio
        if output.get("audio_base64"):
            save_audio(output["audio_base64"], "test1.mp3")
    else:
        print(f"❌ Request failed: {result}")
    
    print()
    
    # Test 2: Cache hit (same request)
    print("Test 2: Cache hit test (should be instant)")
    start = time.time()
    result = runsync(payload)
    elapsed = time.time() - start
    
    if result.get("status") == "COMPLETED":
        output = result.get("output", {})
        print(f"✅ Request completed in {elapsed:.1f}s")
        print(f"   Cache hit: {output.get('cache_hit')} (should be True)")
    
    print()
    
    # Test 3: Async request
    print("Test 3: Asynchronous request")
    payload2 = {
        "text": "This is an asynchronous test with different text.",
        "format": "wav"
    }
    
    job_id = run_async(payload2)
    print(f"Job ID: {job_id}")
    
    result = poll_for_result(job_id)
    if result.get("status") == "COMPLETED":
        output = result.get("output", {})
        print(f"   Duration: {output.get('duration_ms')}ms")
        
        # Save audio
        if output.get("audio_base64"):
            save_audio(output["audio_base64"], "test3.wav")
    
    print()
    
    # Test 4: Long text (chunking)
    print("Test 4: Long text (tests chunking)")
    long_text = """
    This is a longer piece of text that will test the chunking functionality.
    The system should automatically split this into smaller chunks, process each one,
    and then concatenate the audio results. This ensures we can handle arbitrary
    length inputs without running into model limitations.
    """.strip()
    
    payload3 = {
        "text": long_text,
        "format": "mp3"
    }
    
    result = runsync(payload3)
    if result.get("status") == "COMPLETED":
        output = result.get("output", {})
        print(f"✅ Long text processed")
        print(f"   Chunks: {output.get('chunks_processed')}")
        print(f"   Duration: {output.get('duration_ms')}ms")
        
        if output.get("audio_base64"):
            save_audio(output["audio_base64"], "test4_long.mp3")
    
    print()
    print("=== All tests complete! ===")


if __name__ == "__main__":
    main()

"""
Simple test client for Interactive Pages API.
"""
import requests
import time
import json

BASE_URL = "http://127.0.0.1:5002"


def test_generate():
    """Test generating an interactive page."""
    payload = {
        "title": "Introduction to Data Structures",
        "transcript": "Data structures are ways of organizing data in computer memory. Arrays store elements in contiguous memory locations, while linked lists use pointers to connect nodes. Stacks follow LIFO (Last In, First Out) principle, and queues follow FIFO (First In, First Out).",
        "key_concepts": ["Arrays", "Linked Lists", "Stacks", "Queues", "LIFO", "FIFO"]
    }
    
    print("🚀 Submitting generation request...")
    response = requests.post(f"{BASE_URL}/interactive/generate", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 202:
        job_id = response.json()["job_id"]
        print(f"\n📋 Job ID: {job_id}")
        print("⏳ Polling for status...")
        
        # Poll until complete
        max_polls = 30
        for i in range(max_polls):
            time.sleep(2)
            status_response = requests.get(f"{BASE_URL}/interactive/status/{job_id}")
            status_data = status_response.json()
            
            print(f"\n[{i+1}/{max_polls}] Status: {status_data['status']}")
            
            if status_data["status"] == "completed":
                print(f"✅ Preview URL: {status_data.get('preview_url')}")
                print(f"📄 Source URL: {status_data.get('source_url')}")
                break
            elif status_data["status"] == "error":
                print(f"❌ Error: {status_data.get('error')}")
                break
        else:
            print("⏱️  Timeout waiting for completion")


if __name__ == "__main__":
    try:
        test_generate()
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure it's running on port 5002")
    except Exception as e:
        print(f"❌ Error: {e}")

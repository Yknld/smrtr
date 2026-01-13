import requests
from pathlib import Path

# Try Mozilla Common Voice Russian sample
url = "https://mozilla-common-voice-datasets.s3.dualstack.us-west-2.amazonaws.com/cv-corpus-6.1-2020-12-11/ru/clips/common_voice_ru_19915419.mp3"

print("Downloading Russian voice sample from Mozilla Common Voice...")
response = requests.get(url, timeout=10)

if response.status_code == 200:
    with open("russian_voice_temp.mp3", "wb") as f:
        f.write(response.content)
    print(f"✅ Downloaded: {len(response.content)} bytes")
else:
    print(f"❌ Failed: {response.status_code}")

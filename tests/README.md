# Tests Directory

This directory contains all test files, scripts, and audio samples used during development and testing.

## Structure

### 📂 `audio_samples/`
Contains all audio files used for testing:
- Generated TTS outputs (`.mp3`)
- Voice reference samples (`.flac`, `.m4a`, `.webm`)
- Test audio files

### 📂 `responses/`
Contains JSON response files from API tests:
- RunPod TTS endpoint responses
- Test request payloads
- API response examples

### 📂 `scripts/`
Contains test shell scripts:
- `test_*.sh` - Various TTS test scripts
- English and Russian TTS tests
- Multilingual model tests

## Usage

To run a test script:
```bash
cd tests/scripts
./test_multilingual_russian.sh
```

To inspect API responses:
```bash
cd tests/responses
cat russian_clean_final.json | jq .
```

## Cleanup

These files are for development and testing only. They are not part of the production application.

#!/usr/bin/env python3
"""
SmartrAudioGenerator: Generates audio specifications for educational video clips.
Follows STYLE_ANCHOR guidelines strictly.
Returns strict JSON (no markdown, no commentary).
"""

import json
import sys
from typing import Optional


def generate_audio_spec(narration_text: str) -> dict:
    """
    Generate audio specification for educational clip.
    
    Requirements:
    - Spoken teacher narration (clear, calm, neutral accent) reading EXACTLY the narration text
    - Plus subtle ambient sound bed (very low volume)
    - No music if it reduces clarity
    - No distracting sound effects
    - No silence gaps if narration ends early; keep ambient only
    """
    
    # Clean narration text
    narration_text = narration_text.strip() if narration_text else ""
    
    if not narration_text:
        narration_text = "[No narration provided]"
    
    # Build audio prompt
    audio_prompt_parts = [
        f"Speak clearly and naturally, reading EXACTLY: '{narration_text}'",
        "use clear teacher voice",
        "calm measured pace",
        "neutral accent",
        "professional educational narration style",
        "add subtle very low volume ambient background sound bed",
        "ambient should be continuous and not distracting",
        "if narration ends before clip duration, continue ambient sound only",
        "no silence gaps",
        "no sound effects",
        "no music that reduces clarity",
        "maintain consistent audio level throughout",
        "educational classroom audio style"
    ]
    
    audio_prompt = ". ".join(audio_prompt_parts) + "."
    
    # Build negative audio prompt
    negative_audio_parts = [
        "no music",
        "no sound effects",
        "no distracting background sounds",
        "no loud ambient",
        "no background conversations",
        "no environmental noise",
        "no silence gaps",
        "no abrupt audio cuts",
        "no volume fluctuations",
        "no echo or reverb effects"
    ]
    
    negative_audio_prompt = ", ".join(negative_audio_parts) + "."
    
    # Build complete audio specification
    audio_spec = {
        "audio_source": "veo_only",
        "narration_style": "clear teacher voice, calm pace, neutral accent",
        "narration_text": narration_text,
        "audio_prompt": audio_prompt,
        "negative_audio_prompt": negative_audio_prompt,
        "ambient_style": "subtle, very low volume, continuous, not distracting",
        "music_policy": "no music if it reduces clarity",
        "sfx_policy": "no distracting sound effects",
        "silence_policy": "no silence gaps; continue ambient if narration ends early",
        "audio_requirements": [
            "Spoken teacher narration reading EXACTLY the provided text",
            "Clear, calm, neutral accent",
            "Subtle ambient sound bed at very low volume",
            "No music if it reduces clarity",
            "No distracting sound effects",
            "No silence gaps - ambient continues if narration ends early"
        ]
    }
    
    return audio_spec


def main():
    """Main entry point - can read from stdin, file, or command line."""
    narration_text = ""
    
    try:
        # Try JSON input first
        if len(sys.argv) > 1:
            try:
                with open(sys.argv[1], 'r') as f:
                    input_data = json.load(f)
                    narration_text = input_data.get('narration_text', '')
            except (FileNotFoundError, json.JSONDecodeError):
                # Try as command line argument (plain text)
                narration_text = sys.argv[1]
        else:
            # Try stdin
            try:
                input_data = json.load(sys.stdin)
                narration_text = input_data.get('narration_text', '')
            except (json.JSONDecodeError, EOFError):
                # Try reading as plain text from stdin
                try:
                    narration_text = sys.stdin.read().strip()
                except:
                    pass
    except Exception:
        pass
    
    # Fallback: command line argument
    if not narration_text and len(sys.argv) > 1:
        narration_text = sys.argv[1]
    
    if not narration_text:
        print("Usage: python smartr_audio_generator.py <narration_text>")
        print("   OR: echo '{\"narration_text\":\"...\"}' | python smartr_audio_generator.py")
        print("   OR: echo 'narration text here' | python smartr_audio_generator.py")
        sys.exit(1)
    
    # Generate audio specification
    audio_spec = generate_audio_spec(narration_text)
    
    # Output strict JSON only (no markdown, no commentary)
    print(json.dumps(audio_spec, indent=2))


if __name__ == "__main__":
    main()

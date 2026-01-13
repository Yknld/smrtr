#!/usr/bin/env python3
"""
SmartrVeoDirector: Converts storyboard JSON into Veo job specifications for video generation.
Outputs strict JSON matching the required schema exactly.
"""

import json
import sys
from typing import Dict, List, Optional

# Import shared style constants
try:
    from style_constants import get_standard_negative_prompt
except ImportError:
    # Fallback if style_constants not available
    def get_standard_negative_prompt(include_additional=False):
        rules = [
            "no on-screen text",
            "no subtitles burned in",
            "no logos",
            "no brand names",
            "no watermarks",
            "no emojis",
            "no dramatic cinematic effects",
            "no shaky cam",
            "no fast cuts",
            "no busy backgrounds",
            "do not add objects that change the concept"
        ]
        return ", ".join(rules) + "."


def generate_visual_prompt(
    scene: Dict,
    image_prompt: Optional[str],
    mermaid_code: Optional[str],
    visual_type: str
) -> str:
    """Generate visual prompt for Veo based on scene information."""
    
    # Get motion hints from scene
    motion_hint = scene.get("veo_motion_hint", {})
    camera = motion_hint.get("camera", "static")
    emphasis = motion_hint.get("emphasis", "content clarity")
    motion_style = motion_hint.get("motion_style", "calm, educational pacing")
    
    # Base visual description
    visual_description = ""
    
    if visual_type == "diagram" and mermaid_code:
        # For diagrams, describe the diagram concept
        visual_description = "Educational diagram showing the concept clearly"
    elif visual_type == "chart" and mermaid_code:
        visual_description = "Clean educational chart displaying information clearly"
    elif visual_type == "illustration" and image_prompt:
        # Use the image prompt description
        visual_description = image_prompt
    else:
        # Fallback to learning goal
        visual_description = scene.get("learning_goal", "Educational content")
    
    # Camera behavior description
    camera_descriptions = {
        "static": "static stable camera, no movement",
        "slow_zoom": "very slow gentle zoom in, smooth and steady",
        "pan": "slow smooth pan, steady and controlled",
        "push_in": "gentle slow push in, smooth camera movement",
        "pull_out": "gentle slow pull out, smooth camera movement"
    }
    camera_desc = camera_descriptions.get(camera, "static stable camera")
    
    # Build visual prompt
    prompt_parts = [
        visual_description,
        f"{camera_desc}, calm educational motion",
        f"emphasize {emphasis}",
        "premium educational motion graphics style",
        "neutral grey subtle gradient background",
        "modern flat vector aesthetic",
        "minimal clutter, high readability",
        f"{motion_style}",
        "classroom explainer video style",
        "professional educational pacing"
    ]
    
    return ", ".join(prompt_parts) + "."


def generate_negative_prompt(scene: Dict) -> str:
    """Generate negative prompt for Veo based on STYLE_ANCHOR."""
    
    # Use standard negative prompt rules
    base_prompt = get_standard_negative_prompt(include_additional=True)
    
    # Add scene-specific negative items if needed
    additional_items = [
        "no text in video",
        "no words or letters",
        "no distracting elements",
        "no new objects that change meaning",
        "no busy patterns",
        "no cluttered composition",
        "no TikTok-style fast motion",
        "no cinematic dramatic timing",
        "avoid adding decorative elements",
        "no complex details that distract"
    ]
    
    # Combine base with additional
    full_prompt = base_prompt.rstrip('.') + ", " + ", ".join(additional_items) + "."
    
    return full_prompt


def generate_audio_prompt(scene: Dict) -> str:
    """Generate audio prompt for Veo with narration text and ambient instructions."""
    
    narration_text = scene.get("narration_text", "")
    
    # Build audio prompt - make it very explicit for Veo
    # Veo needs clear instructions about what audio to generate
    prompt_parts = [
        f"Generate audio with a clear teacher voice speaking: '{narration_text}'",
        "The voice should be calm, measured, and professional",
        "Use a neutral accent suitable for educational content",
        "Add a very subtle, low-volume ambient background sound",
        "The ambient sound should be continuous and not distracting",
        "No sound effects",
        "No music",
        "If the narration ends before the video duration, continue with ambient sound only",
        "Educational classroom audio style with clear narration"
    ]
    
    return ". ".join(prompt_parts) + "."


def convert_storyboard_to_veo_jobs(storyboard: Dict) -> Dict:
    """Convert storyboard JSON to Veo job specifications."""
    
    scenes = storyboard.get("scenes", [])
    
    veo_jobs = []
    
    for scene in scenes:
        scene_id = scene.get("scene_id", 0)
        duration = scene.get("duration_seconds", 8)
        visual_type = scene.get("visual_type", "illustration")
        
        # Get visual content
        diagram_spec = scene.get("diagram_spec", {})
        image_spec = scene.get("image_spec", {})
        
        mermaid_code = diagram_spec.get("mermaid_code")
        image_prompt = image_spec.get("image_prompt")
        
        # Generate prompts
        visual_prompt = generate_visual_prompt(
            scene=scene,
            image_prompt=image_prompt,
            mermaid_code=mermaid_code,
            visual_type=visual_type
        )
        
        negative_prompt = generate_negative_prompt(scene)
        audio_prompt = generate_audio_prompt(scene)
        
        # Create job spec
        job = {
            "scene_id": scene_id,
            "clip_duration_seconds": duration,
            "input_type": "image_to_video",
            "visual_prompt": visual_prompt,
            "negative_prompt": negative_prompt,
            "audio_prompt": audio_prompt
        }
        
        veo_jobs.append(job)
    
    # Build final output
    output = {
        "audio_policy": {
            "audio_source": "veo_only",
            "narration_style": "clear teacher voice, calm pace, neutral accent",
            "ambient_style": "subtle, very low volume, not distracting",
            "music_policy": "no music if it reduces clarity"
        },
        "veo_jobs": veo_jobs
    }
    
    return output


def main():
    """Main entry point - reads storyboard JSON and outputs Veo job specs."""
    try:
        # Read input from file or stdin
        if len(sys.argv) > 1:
            with open(sys.argv[1], 'r') as f:
                storyboard = json.load(f)
        else:
            storyboard = json.load(sys.stdin)
        
        # Convert to Veo jobs
        veo_specs = convert_storyboard_to_veo_jobs(storyboard)
        
        # Output strict JSON only (no commentary, no markdown)
        print(json.dumps(veo_specs, indent=2))
        
    except FileNotFoundError:
        print(f"Error: File '{sys.argv[1]}' not found.", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON input: {e}", file=sys.stderr)
        sys.exit(1)
    except KeyError as e:
        print(f"Error: Missing required field in storyboard: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
SmartrImageAnimator: Generates animation prompts for reference images to create educational clips.
Follows STYLE_ANCHOR guidelines strictly.
Returns only the prompt text (no commentary, no markdown).
"""

import json
import sys
from typing import Optional

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


def generate_animation_prompt(
    motion_style: str,
    camera: str,
    emphasis: str
) -> str:
    """
    Generate animation prompt for reference image following STYLE_ANCHOR.
    
    Rules:
    - Calm classroom pacing
    - Subtle highlight movement to guide attention
    - Do NOT introduce new objects that change meaning
    - No text generation
    - Keep the background consistent and clean
    """
    
    # Normalize inputs
    motion_style = motion_style.strip() if motion_style else "calm educational pacing"
    camera = camera.strip() if camera else "static"
    emphasis = emphasis.strip() if emphasis else "content clarity"
    
    # Camera behavior descriptions
    camera_descriptions = {
        "static": "static stable camera, no camera movement",
        "slow_zoom": "very slow gentle zoom in, smooth and steady",
        "pan": "slow smooth pan, steady and controlled",
        "push_in": "gentle slow push in, smooth camera movement",
        "pull_out": "gentle slow pull out, smooth camera movement",
        "slight_tilt": "very subtle tilt, barely noticeable",
        "static_with_focus": "static camera with subtle focus adjustment"
    }
    camera_desc = camera_descriptions.get(camera.lower(), "static stable camera")
    
    # Build animation prompt
    prompt_parts = []
    
    # Motion style
    prompt_parts.append(f"Animate with {motion_style}")
    
    # Camera behavior
    prompt_parts.append(f"{camera_desc}")
    
    # Emphasis and attention guidance
    prompt_parts.append(f"subtle highlight movement to guide attention to {emphasis}")
    
    # Core requirements
    prompt_parts.extend([
        "calm classroom pacing",
        "premium educational motion graphics style",
        "neutral grey subtle gradient background stays consistent",
        "background remains clean and unchanged",
        "keep all existing elements in the reference image",
        "do not introduce new objects that change meaning",
        "maintain the exact composition from the reference",
        "smooth gentle motion only",
        "no dramatic movements or effects",
        "no text generation in the video",
        "no words, letters, or text appear",
        "professional educational explainer style"
    ])
    
    # Motion constraints
    motion_constraints = [
        "movement should be minimal and purposeful",
        "guide viewer attention through subtle motion",
        "preserve the educational clarity of the reference",
        "maintain visual consistency throughout",
        "smooth transitions without distractions"
    ]
    
    prompt_parts.extend(motion_constraints)
    
    # Combine into final prompt
    final_prompt = ", ".join(prompt_parts) + "."
    
    # Clean up
    final_prompt = final_prompt.replace("..", ".")
    final_prompt = final_prompt.strip()
    
    return final_prompt


def generate_negative_prompt() -> str:
    """Generate negative prompt for animation to prevent unwanted elements."""
    
    # Use standard negative prompt rules
    base_prompt = get_standard_negative_prompt(include_additional=True)
    
    # Add animation-specific negative items
    additional_items = [
        "no text in video",
        "no words or letters",
        "no new objects",
        "no elements not in reference image",
        "no dramatic camera movements",
        "no fast motion",
        "no busy animations",
        "no distracting movements",
        "no changes to background",
        "no introduction of new colors",
        "avoid busy patterns",
        "no complex details added",
        "no decorative elements"
    ]
    
    # Combine base with additional
    full_prompt = base_prompt.rstrip('.') + ", " + ", ".join(additional_items) + "."
    
    return full_prompt


def main():
    """Main entry point - can read from stdin, file, or command line."""
    motion_style = ""
    camera = ""
    emphasis = ""
    
    try:
        # Try JSON input first
        if len(sys.argv) > 1:
            try:
                with open(sys.argv[1], 'r') as f:
                    input_data = json.load(f)
                    motion_style = input_data.get('motion_style', '')
                    camera = input_data.get('camera', '')
                    emphasis = input_data.get('emphasis', '')
            except (FileNotFoundError, json.JSONDecodeError):
                # Try as command line arguments
                if len(sys.argv) >= 4:
                    motion_style = sys.argv[1]
                    camera = sys.argv[2]
                    emphasis = sys.argv[3]
        else:
            # Try stdin
            try:
                input_data = json.load(sys.stdin)
                motion_style = input_data.get('motion_style', '')
                camera = input_data.get('camera', '')
                emphasis = input_data.get('emphasis', '')
            except (json.JSONDecodeError, EOFError):
                pass
    except Exception:
        pass
    
    # Fallback: command line arguments
    if not motion_style and not camera:
        if len(sys.argv) >= 4:
            motion_style = sys.argv[1]
            camera = sys.argv[2]
            emphasis = sys.argv[3]
        elif len(sys.argv) >= 2:
            motion_style = sys.argv[1]
    
    # Generate prompts
    if not motion_style:
        print("Usage: python smartr_image_animator.py <motion_style> <camera> <emphasis>")
        print("   OR: echo '{\"motion_style\":\"...\",\"camera\":\"...\",\"emphasis\":\"...\"}' | python smartr_image_animator.py")
        sys.exit(1)
    
    animation_prompt = generate_animation_prompt(
        motion_style=motion_style,
        camera=camera,
        emphasis=emphasis
    )
    
    negative_prompt = generate_negative_prompt()
    
    # Output format: both prompts on separate lines (or could be JSON)
    # For simplicity, output as JSON with both prompts
    output = {
        "animation_prompt": animation_prompt,
        "negative_prompt": negative_prompt
    }
    
    # Output strict JSON only (no markdown, no commentary)
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()

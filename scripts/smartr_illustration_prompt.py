#!/usr/bin/env python3
"""
SmartrIllustrationPrompt: Generates clean image generation prompts for educational illustrations.
Follows STYLE_ANCHOR guidelines strictly.
Returns only the prompt text (no commentary, no markdown).
"""

import json
import sys
import re
from typing import Optional


def clean_description(description: str) -> str:
    """Clean and normalize description text."""
    # Remove excessive whitespace
    description = ' '.join(description.split())
    # Remove common punctuation artifacts
    description = description.strip()
    return description


def generate_illustration_prompt(
    learning_goal: str,
    image_description: str
) -> str:
    """
    Generate a clean image generation prompt for educational illustration.
    
    Follows STYLE_ANCHOR:
    - Premium educational motion graphics
    - Neutral grey subtle gradient background
    - Modern flat/vector look, minimal clutter
    - No text, logos, brands, watermarks, emojis
    - Centered composition with negative space
    - High readability at small sizes
    """
    
    # Clean inputs
    learning_goal = clean_description(learning_goal)
    image_description = clean_description(image_description)
    
    # Build the main prompt
    prompt_parts = []
    
    # Main subject/description (primary focus)
    main_subject = image_description if image_description else learning_goal
    if main_subject:
        prompt_parts.append(main_subject)
    
    # Core style and composition
    style_parts = [
        "premium educational illustration",
        "modern flat vector style",
        "neutral grey subtle gradient background",
        "subject centered with generous negative space",
        "empty space reserved at bottom for captions",
        "minimal clutter, high readability",
        "simple clean shapes",
        "medium-wide stable camera framing",
        "classroom explainer video style"
    ]
    
    prompt_parts.append(", ".join(style_parts))
    
    # Negative requirements
    negative_parts = [
        "no text",
        "no words or letters",
        "no logos or brands",
        "no watermarks",
        "no emojis",
        "no complex details",
        "no busy patterns"
    ]
    
    # Combine into final prompt
    final_prompt = f"{prompt_parts[0]}, {prompt_parts[1] if len(prompt_parts) > 1 else ''}. Do not include: {', '.join(negative_parts)}."
    
    # Clean up excessive punctuation and whitespace
    final_prompt = re.sub(r'\.{2,}', '.', final_prompt)
    final_prompt = re.sub(r'\s+', ' ', final_prompt)
    final_prompt = final_prompt.strip()
    
    # Ensure it ends with a period
    if not final_prompt.endswith('.'):
        final_prompt += '.'
    
    return final_prompt


def main():
    """Main entry point - can read from stdin, file, or command line."""
    learning_goal = ""
    image_description = ""
    
    try:
        # Try JSON input first
        if len(sys.argv) > 1:
            try:
                with open(sys.argv[1], 'r') as f:
                    input_data = json.load(f)
                    learning_goal = input_data.get('learning_goal', '')
                    image_description = input_data.get('image_description', '')
            except (FileNotFoundError, json.JSONDecodeError):
                # Try as command line arguments
                if len(sys.argv) >= 2:
                    learning_goal = sys.argv[1] if len(sys.argv) > 1 else ''
                    image_description = sys.argv[2] if len(sys.argv) > 2 else ''
        else:
            # Try stdin
            try:
                input_data = json.load(sys.stdin)
                learning_goal = input_data.get('learning_goal', '')
                image_description = input_data.get('image_description', '')
            except (json.JSONDecodeError, EOFError):
                pass
    except Exception:
        pass
    
    # Fallback: command line arguments
    if not learning_goal and not image_description:
        if len(sys.argv) >= 3:
            learning_goal = sys.argv[1]
            image_description = sys.argv[2]
        elif len(sys.argv) >= 2:
            image_description = sys.argv[1]
    
    # Generate prompt
    if not learning_goal and not image_description:
        print("Usage: python smartr_illustration_prompt.py <learning_goal> <image_description>")
        print("   OR: echo '{\"learning_goal\":\"...\",\"image_description\":\"...\"}' | python smartr_illustration_prompt.py")
        sys.exit(1)
    
    prompt = generate_illustration_prompt(
        learning_goal=learning_goal,
        image_description=image_description
    )
    
    # Output ONLY the prompt (no markdown, no commentary)
    print(prompt)


if __name__ == "__main__":
    main()

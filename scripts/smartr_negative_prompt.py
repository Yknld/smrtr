#!/usr/bin/env python3
"""
SmartrNegativePrompt: Generates standardized negative prompts for educational video generation.
Follows STYLE_ANCHOR guidelines strictly.
Returns only the negative prompt text (no markdown, no commentary).
"""

import json
import sys
from typing import List, Optional

# Import shared style constants
try:
    from style_constants import get_standard_negative_prompt as get_shared_negative_prompt, STANDARD_NEGATIVE_PROMPT_RULES
except ImportError:
    # Fallback if style_constants not available
    STANDARD_NEGATIVE_PROMPT_RULES = [
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
    
    def get_shared_negative_prompt(include_additional=False):
        return ", ".join(STANDARD_NEGATIVE_PROMPT_RULES) + "."


def get_standard_negative_prompt_rules() -> List[str]:
    """
    Get standard negative prompt rules for educational videos.
    
    Rules:
    - No on-screen text
    - No subtitles burned in
    - No logos
    - No brand names
    - No watermarks
    - No emojis
    - No dramatic cinematic effects
    - No shaky cam
    - No fast cuts
    - No busy backgrounds
    - Do not add objects that change the concept
    """
    
    return STANDARD_NEGATIVE_PROMPT_RULES.copy()


def generate_negative_prompt(
    include_standard: bool = True,
    additional_rules: Optional[List[str]] = None,
    include_additional: bool = False
) -> str:
    """
    Generate negative prompt for video generation.
    
    Args:
        include_standard: Include standard STYLE_ANCHOR rules
        additional_rules: Additional rules to include
        include_additional: Include additional common rules from style_constants
    """
    
    if include_standard:
        # Use shared function if available
        try:
            base_prompt = get_shared_negative_prompt(include_additional=include_additional)
            if not additional_rules:
                return base_prompt
            # Combine with additional rules
            return base_prompt.rstrip('.') + ", " + ", ".join(additional_rules) + "."
        except:
            pass
    
    # Fallback: build manually
    rules = []
    
    if include_standard:
        rules.extend(get_standard_negative_prompt_rules())
    
    if additional_rules:
        rules.extend(additional_rules)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_rules = []
    for rule in rules:
        rule_lower = rule.lower().strip()
        if rule_lower and rule_lower not in seen:
            seen.add(rule_lower)
            unique_rules.append(rule.strip())
    
    # Join with commas
    negative_prompt = ", ".join(unique_rules) + "."
    
    return negative_prompt


def main():
    """Main entry point - can read from stdin, file, or command line."""
    include_standard = True
    additional_rules = None
    
    try:
        # Try JSON input first
        if len(sys.argv) > 1:
            try:
                with open(sys.argv[1], 'r') as f:
                    input_data = json.load(f)
                    include_standard = input_data.get('include_standard', True)
                    additional_rules = input_data.get('additional_rules', [])
            except (FileNotFoundError, json.JSONDecodeError):
                # Try as command line flag
                if sys.argv[1] in ['--standard-only', '-s']:
                    include_standard = True
                    additional_rules = None
                elif sys.argv[1] in ['--help', '-h']:
                    print("Usage: python smartr_negative_prompt.py [--standard-only]")
                    print("   OR: echo '{\"include_standard\":true,\"additional_rules\":[...]}' | python smartr_negative_prompt.py")
                    print("\nGenerates standardized negative prompts for educational videos.")
                    sys.exit(0)
        else:
            # Try stdin
            try:
                input_data = json.load(sys.stdin)
                include_standard = input_data.get('include_standard', True)
                additional_rules = input_data.get('additional_rules', [])
            except (json.JSONDecodeError, EOFError):
                # Default: just output standard rules
                pass
    except Exception:
        pass
    
    # Generate negative prompt
    negative_prompt = generate_negative_prompt(
        include_standard=include_standard,
        additional_rules=additional_rules
    )
    
    # Output ONLY the negative prompt (no markdown, no commentary)
    print(negative_prompt)


if __name__ == "__main__":
    main()

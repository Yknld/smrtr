#!/usr/bin/env python3
"""
Style Constants: Shared constants for STYLE_ANCHOR compliance across all tools.
"""

# Standard negative prompt rules for educational videos
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

# Additional common negative rules (optional, can be combined)
ADDITIONAL_NEGATIVE_RULES = [
    "no words or letters",
    "no distracting elements",
    "no busy patterns",
    "no cluttered composition",
    "no TikTok-style fast motion",
    "no cinematic dramatic timing",
    "avoid adding decorative elements",
    "no complex details that distract",
    "no new objects",
    "no elements not in reference image",
    "no changes to background",
    "no introduction of new colors"
]


def get_standard_negative_prompt(include_additional: bool = False) -> str:
    """
    Get standard negative prompt string.
    
    Args:
        include_additional: Include additional common rules
    
    Returns:
        Comma-separated negative prompt string
    """
    rules = STANDARD_NEGATIVE_PROMPT_RULES.copy()
    
    if include_additional:
        rules.extend(ADDITIONAL_NEGATIVE_RULES)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_rules = []
    for rule in rules:
        rule_lower = rule.lower().strip()
        if rule_lower and rule_lower not in seen:
            seen.add(rule_lower)
            unique_rules.append(rule.strip())
    
    return ", ".join(unique_rules) + "."


# STYLE_ANCHOR visual style constants
STYLE_ANCHOR = {
    "background": "neutral grey base background with subtle gradient",
    "mood": "premium educational motion graphics, calm classroom pacing",
    "composition_rules": [
        "Modern flat/vector look, minimal clutter, high readability",
        "No emojis, no logos, no brand names, no watermarks",
        "No text baked into images (we overlay text later)",
        "Calm classroom pacing (not cinematic, not TikTok)"
    ]
}

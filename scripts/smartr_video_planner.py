#!/usr/bin/env python3
"""
SmartrVideoPlanner: Converts lecture content into executable storyboard JSON.
Outputs strict JSON matching the required schema exactly.
"""

import json
import sys
import re
from typing import Dict, List, Optional, Tuple

# STYLE_ANCHOR constants
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


def estimate_word_count_for_duration(duration_seconds: int) -> int:
    """Estimate words that fit in duration (2.5 words/sec)."""
    return int(duration_seconds * 2.5)


def split_into_sentences(text: str) -> List[str]:
    """Split text into sentences."""
    # Simple sentence splitting (can be improved with NLP)
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]


def determine_visual_type(content: str, scene_num: int, total_scenes: int) -> Tuple[str, Optional[str], Optional[str]]:
    """Determine best visual type for scene content."""
    content_lower = content.lower()
    
    # Keywords that suggest diagrams/charts
    diagram_keywords = ['process', 'flow', 'steps', 'sequence', 'timeline', 'cycle', 'algorithm', 'workflow', 'stages', 'phases']
    chart_keywords = ['compare', 'difference', 'versus', 'statistics', 'data', 'percentage', 'increase', 'decrease', 'trend']
    
    # Check for diagram/chart indicators
    if any(kw in content_lower for kw in diagram_keywords):
        # Try to determine diagram type
        if 'flow' in content_lower or 'process' in content_lower or 'steps' in content_lower:
            return ("diagram", "flowchart", None)
        elif 'timeline' in content_lower or 'sequence' in content_lower:
            return ("diagram", "timeline", None)
        elif 'cycle' in content_lower:
            return ("diagram", "flowchart", None)  # Cycle as flowchart
        else:
            return ("diagram", "concept_map", None)
    elif any(kw in content_lower for kw in chart_keywords):
        return ("chart", None, None)
    elif scene_num <= 2 or scene_num >= total_scenes - 1:
        # Intro/outro scenes use illustrations
        return ("illustration", None, None)
    else:
        # Default to illustration for middle scenes
        return ("illustration", None, None)


def create_mermaid_flowchart(concept: str) -> str:
    """Generate simple mermaid flowchart code."""
    # Simplified - you'd parse concept to extract steps
    return """graph TD
    A[Start] --> B[Step 1]
    B --> C[Step 2]
    C --> D[End]"""


def create_on_screen_text(content: str, max_lines: int = 2, max_words_per_line: int = 10) -> List[str]:
    """Create on-screen text from content (max 2 lines, 10 words each)."""
    words = content.split()[:max_words_per_line * max_lines]
    
    if len(words) <= max_words_per_line:
        return [' '.join(words), ""]
    
    # Split into two lines
    line1 = ' '.join(words[:max_words_per_line])
    line2 = ' '.join(words[max_words_per_line:])
    
    return [line1, line2[:50]]  # Limit line 2 length


def select_camera_motion(scene_num: int, total_scenes: int, visual_type: str) -> str:
    """Select appropriate camera motion."""
    if scene_num == 1:
        return "pull_out"  # Opening
    elif scene_num == total_scenes:
        return "push_in"  # Closing
    elif visual_type in ["diagram", "chart"]:
        return "slow_zoom"
    else:
        return "static"


def split_content_into_scenes(
    summary: str,
    transcript: Optional[str],
    target_scenes: int,
    total_duration: int
) -> List[Dict]:
    """Split content into logical scenes with proper structure."""
    
    # Use transcript if available, otherwise use summary
    primary_text = transcript if transcript else summary
    
    # Split into sentences
    sentences = split_into_sentences(primary_text)
    
    # Calculate sentences per scene
    sentences_per_scene = max(1, len(sentences) // target_scenes)
    
    scenes = []
    base_duration = total_duration // target_scenes
    
    for i in range(target_scenes):
        # Get content for this scene
        start_idx = i * sentences_per_scene
        end_idx = min((i + 1) * sentences_per_scene, len(sentences))
        
        if start_idx >= len(sentences):
            # Padding for extra scenes
            scene_sentences = ["Summary of key concepts."]
        else:
            scene_sentences = sentences[start_idx:end_idx]
        
        scene_content = ' '.join(scene_sentences)
        
        # Determine duration (vary slightly for pacing)
        if i == 0:
            duration = base_duration + 2  # Intro
        elif i == target_scenes - 1:
            duration = base_duration + 1  # Outro
        else:
            duration = base_duration
        
        duration = max(5, min(12, duration))
        
        # Estimate narration text
        max_words = estimate_word_count_for_duration(duration)
        narration_words = scene_content.split()[:max_words]
        narration_text = ' '.join(narration_words)
        
        # Determine visual type
        visual_type, diagram_type, _ = determine_visual_type(scene_content, i + 1, target_scenes)
        
        # Create diagram spec
        mermaid_code = None
        if visual_type == "diagram" and diagram_type:
            mermaid_code = create_mermaid_flowchart(scene_content)
        
        # Create image spec
        image_prompt = None
        image_description = None
        if visual_type == "illustration":
            image_prompt = f"Modern flat vector illustration: {scene_content[:100]}"
            image_description = scene_content[:150]
        
        # Create on-screen text
        on_screen = create_on_screen_text(scene_content)
        
        # Determine camera motion
        camera = select_camera_motion(i + 1, target_scenes, visual_type)
        
        scenes.append({
            "scene_id": i + 1,
            "duration_seconds": duration,
            "learning_goal": f"Understand key concept from scene {i+1}",
            "narration_text": narration_text,
            "on_screen_text": on_screen,
            "visual_type": visual_type,
            "diagram_spec": {
                "diagram_type": diagram_type,
                "mermaid_code": mermaid_code
            },
            "image_spec": {
                "image_prompt": image_prompt,
                "image_description": image_description
            },
            "veo_motion_hint": {
                "camera": camera,
                "emphasis": "content clarity and educational pacing",
                "motion_style": "calm, measured progression"
            }
        })
    
    # Ensure at least 3 diagrams/charts if possible
    diagram_count = sum(1 for s in scenes if s["visual_type"] in ["diagram", "chart"])
    if diagram_count < 3:
        # Convert some illustrations to diagrams
        for i, scene in enumerate(scenes):
            if scene["visual_type"] == "illustration" and i not in [0, len(scenes)-1] and diagram_count < 3:
                scene["visual_type"] = "diagram"
                scene["diagram_spec"]["diagram_type"] = "concept_map"
                scene["diagram_spec"]["mermaid_code"] = create_mermaid_flowchart(scene["narration_text"])
                scene["image_spec"]["image_prompt"] = None
                scene["image_spec"]["image_description"] = None
                diagram_count += 1
    
    return scenes


def generate_storyboard(
    video_title: str,
    topic: str,
    audience_level: str,
    summary_notes: str,
    transcript_excerpt: Optional[str] = None
) -> Dict:
    """Generate storyboard JSON from lecture content."""
    
    # Calculate target parameters (8-12 scenes, 60-120 seconds)
    total_duration = 90  # Default 90 seconds
    target_scenes = 10   # Default 10 scenes
    
    # Split content into scenes
    scenes = split_content_into_scenes(
        summary_notes,
        transcript_excerpt,
        target_scenes,
        total_duration
    )
    
    # Normalize total duration to sum of scene durations
    actual_total = sum(s["duration_seconds"] for s in scenes)
    
    # Ensure total is within 60-120 range
    if actual_total < 60:
        # Add time to scenes
        diff = 60 - actual_total
        per_scene = diff // len(scenes)
        for scene in scenes:
            scene["duration_seconds"] += per_scene
            scene["duration_seconds"] = max(5, min(12, scene["duration_seconds"]))
    elif actual_total > 120:
        # Reduce time from scenes
        diff = actual_total - 120
        per_scene = diff // len(scenes)
        for scene in scenes:
            scene["duration_seconds"] -= per_scene
            scene["duration_seconds"] = max(5, min(12, scene["duration_seconds"]))
    
    actual_total = sum(s["duration_seconds"] for s in scenes)
    
    return {
        "video_title": video_title,
        "topic": topic,
        "audience_level": audience_level,
        "total_duration_seconds": actual_total,
        "global_visual_style": {
            "background": STYLE_ANCHOR["background"],
            "mood": STYLE_ANCHOR["mood"],
            "composition_rules": STYLE_ANCHOR["composition_rules"]
        },
        "scenes": scenes
    }


def main():
    """Main entry point - can be used as CLI or imported."""
    if len(sys.argv) < 2:
        # Read from stdin if no file provided
        try:
            input_data = json.load(sys.stdin)
        except:
            print("Usage: python smartr_video_planner.py <input_json_file>")
            print("   OR: echo '<json>' | python smartr_video_planner.py")
            sys.exit(1)
    else:
        input_file = sys.argv[1]
        try:
            with open(input_file, 'r') as f:
                input_data = json.load(f)
        except FileNotFoundError:
            print(f"Error: File '{input_file}' not found.", file=sys.stderr)
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in input file: {e}", file=sys.stderr)
            sys.exit(1)
    
    storyboard = generate_storyboard(
        video_title=input_data.get("video_title", "Educational Video"),
        topic=input_data.get("topic", ""),
        audience_level=input_data.get("audience_level", "high_school"),
        summary_notes=input_data.get("summary_notes", ""),
        transcript_excerpt=input_data.get("transcript_excerpt")
    )
    
    # Output strict JSON only, no commentary
    print(json.dumps(storyboard, indent=2))


if __name__ == "__main__":
    main()

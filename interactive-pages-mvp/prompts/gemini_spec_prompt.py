"""
Prompt template for Gemini 3 to generate interactive page specs.
"""


def get_spec_prompt(title: str, transcript: str = "", summary: str = "", 
                   key_concepts: list = None) -> str:
    """
    Generate prompt for Gemini to create JSON spec.
    """
    concepts_text = "\n".join([f"- {c}" for c in (key_concepts or [])])
    
    prompt = f"""You are creating a JSON specification for an interactive educational HTML page.

LESSON INFORMATION:
Title: {title}

{"Transcript/Summary: " + (transcript or summary) if transcript or summary else ""}

{"Key Concepts:" + concepts_text if concepts_text else ""}

REQUIREMENTS:
1. Create 2-4 interactive "scenes" that teach the content progressively
2. Include at least one mini-game interaction (e.g., drag-and-drop, matching, sorting)
3. Include at least one quiz checkpoint with multiple choice questions
4. Design should be mobile-friendly and engaging
5. Each scene should have clear learning objectives

OUTPUT FORMAT (JSON only, no markdown):
{{
  "title": "Lesson Title",
  "scenes": [
    {{
      "id": 1,
      "title": "Scene Title",
      "content": "Educational content for this scene (can include HTML formatting hints)",
      "interaction_type": "info" | "game" | "quiz"
    }}
  ],
  "mini_game": {{
    "type": "drag-drop" | "matching" | "sorting" | "fill-blank",
    "description": "What the game teaches",
    "instructions": "How to play"
  }},
  "quiz": {{
    "questions": [
      {{
        "question": "Question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct": 0
      }}
    ]
  }},
  "styling": {{
    "theme": "modern" | "classic" | "playful",
    "colors": {{
      "primary": "#hex",
      "secondary": "#hex",
      "background": "#hex"
    }}
  }}
}}

CONSTRAINTS:
- Must have 2-4 scenes
- At least one scene must be "game" type
- At least one scene must be "quiz" type
- Quiz must have at least 3 questions
- All content must be educational and aligned with the lesson

Generate the JSON specification now:"""
    
    return prompt

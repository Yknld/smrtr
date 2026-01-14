"""
Prompt template for OpenHands to generate self-contained HTML.
"""


def get_html_prompt(spec: dict) -> str:
    """
    Generate prompt for OpenHands to create self-contained HTML.
    """
    scenes_text = "\n".join([
        f"Scene {s['id']}: {s['title']} ({s.get('interaction_type', 'info')}) - {s.get('content', '')}"
        for s in spec.get("scenes", [])
    ])
    
    quiz_text = ""
    if "quiz" in spec and spec["quiz"].get("questions"):
        quiz_text = "\nQuiz Questions:\n"
        for i, q in enumerate(spec["quiz"]["questions"], 1):
            quiz_text += f"{i}. {q['question']}\n"
            for j, opt in enumerate(q.get('options', []), 1):
                marker = "✓" if j == q.get('correct', 0) + 1 else " "
                quiz_text += f"   {marker} {opt}\n"
    
    game_text = ""
    if "mini_game" in spec:
        game = spec["mini_game"]
        game_text = f"\nMini-Game:\nType: {game.get('type', 'unknown')}\nDescription: {game.get('description', '')}\nInstructions: {game.get('instructions', '')}\n"
    
    styling = spec.get("styling", {})
    colors = styling.get("colors", {})
    
    prompt = f"""Generate a complete, self-contained HTML file for an interactive educational page.

SPECIFICATION:
Title: {spec.get('title', 'Interactive Lesson')}

Scenes:
{scenes_text}
{game_text}
{quiz_text}

Styling:
Theme: {styling.get('theme', 'modern')}
Colors: Primary: {colors.get('primary', '#4A90E2')}, Secondary: {colors.get('secondary', '#50C878')}, Background: {colors.get('background', '#F5F5F5')}

HARD REQUIREMENTS:
1. Single HTML file with ALL CSS and JavaScript INLINE (no external files)
2. NO external scripts, images, or network calls (no <script src=, no fetch(), no XMLHttpRequest)
3. Mobile-responsive design (use viewport meta tag, flexible layouts)
4. Must include:
   - Progress indicator showing which scene user is on
   - Navigation between scenes
   - Interactive mini-game (implement the game type specified)
   - Quiz with multiple choice questions and feedback
   - Reset button to restart from beginning
5. Smooth animations and transitions
6. Clear visual feedback for interactions
7. Accessible (semantic HTML, ARIA labels where helpful)

TECHNICAL CONSTRAINTS:
- All CSS must be in <style> tag in <head>
- All JavaScript must be in <script> tag before </body>
- Use only standard HTML5, CSS3, and vanilla JavaScript
- No external libraries or frameworks
- File size must be under 1.5 MB

OUTPUT:
Generate the complete HTML file starting with <!DOCTYPE html> and ending with </html>.
Make it engaging, educational, and fun to interact with!"""
    
    return prompt

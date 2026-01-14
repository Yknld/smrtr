"""
Mock services for testing without API keys.
"""
import json
import logging
import os
from typing import Dict

logger = logging.getLogger(__name__)


class MockGeminiService:
    """Mock Gemini service that returns a sample spec."""
    
    def generate_spec(self, title: str, transcript: str = "", 
                     summary: str = "", user_feedback: str = None) -> dict:
        """Generate a mock JSON spec."""
        logger.info(f"[MOCK] Generating spec for: {title}")
        
        # Return a realistic sample spec matching the schema
        return {
            "meta": {
                "title": title,
                "topic": summary.split('.')[0] if summary else "Data Structures",
                "learning_objectives": [
                    "Understand the core concepts",
                    "Apply knowledge through interactive exercises",
                    "Demonstrate mastery through quiz"
                ]
            },
            "scenes": [
                {
                    "id": "scene1",
                    "title": "Introduction",
                    "teaching_points": [
                        "Core concept explained simply",
                        "Key terminology introduced",
                        "Real-world application context"
                    ],
                    "interaction": {
                        "type": "reveal",
                        "goal": "Click to reveal key concepts",
                        "content": {
                            "items": ["Concept A", "Concept B", "Concept C"]
                        }
                    }
                },
                {
                    "id": "scene2",
                    "title": "Deep Dive",
                    "teaching_points": [
                        "Detailed explanation",
                        "Step-by-step breakdown",
                        "Common patterns"
                    ],
                    "interaction": {
                        "type": "slider",
                        "goal": "Adjust parameters to see effects",
                        "content": {
                            "min": 0,
                            "max": 100,
                            "default": 50
                        }
                    }
                },
                {
                    "id": "scene3",
                    "title": "Practice",
                    "teaching_points": [
                        "Hands-on practice",
                        "Interactive exploration",
                        "Immediate feedback"
                    ],
                    "interaction": {
                        "type": "dragdrop",
                        "goal": "Drag items to correct categories",
                        "content": {
                            "items": ["Item 1", "Item 2", "Item 3", "Item 4"],
                            "categories": ["Category A", "Category B"]
                        }
                    }
                }
            ],
            "minigame": {
                "type": "matching",
                "goal": "Match concepts with their definitions",
                "instructions": "Click on a concept, then click its matching definition",
                "data": {
                    "pairs": [
                        {"concept": "Term A", "definition": "Definition A"},
                        {"concept": "Term B", "definition": "Definition B"},
                        {"concept": "Term C", "definition": "Definition C"}
                    ]
                }
            },
            "quiz": {
                "title": "Checkpoint Quiz",
                "questions": [
                    {
                        "prompt": "What is the main concept covered?",
                        "options": ["Option A", "Option B", "Option C", "Option D"],
                        "correct_index": 0,
                        "explanation": "This is the correct answer because..."
                    },
                    {
                        "prompt": "Which statement is true?",
                        "options": ["Statement A", "Statement B", "Statement C", "Statement D"],
                        "correct_index": 1,
                        "explanation": "This statement is correct because..."
                    },
                    {
                        "prompt": "What would happen if...?",
                        "options": ["Result A", "Result B", "Result C", "Result D"],
                        "correct_index": 2,
                        "explanation": "The correct result is..."
                    },
                    {
                        "prompt": "Which is the best approach?",
                        "options": ["Approach A", "Approach B", "Approach C", "Approach D"],
                        "correct_index": 3,
                        "explanation": "This approach is best because..."
                    }
                ]
            },
            "ending": {
                "recap_points": [
                    "Key takeaway 1",
                    "Key takeaway 2",
                    "Key takeaway 3"
                ],
                "next_steps": [
                    "Practice more with similar exercises",
                    "Explore advanced topics",
                    "Review the concepts covered"
                ]
            }
        }


class MockRunPodService:
    """Mock RunPod service that returns sample HTML."""
    
    def __init__(self, openhands_url: str = None, api_key: str = None):
        self.openhands_url = openhands_url
        self.api_key = api_key
    
    def generate_html(self, spec: Dict, lesson_summary: str) -> str:
        """Generate mock HTML based on spec."""
        logger.info("[MOCK] Generating HTML from spec...")
        
        # Generate a simple but complete HTML file
        scenes_html = ""
        for scene in spec.get("scenes", []):
            scenes_html += f"""
            <div class="scene" id="{scene['id']}">
                <h2>{scene['title']}</h2>
                <ul>
            """
            for point in scene.get("teaching_points", []):
                scenes_html += f"<li>{point}</li>"
            scenes_html += """
                </ul>
                <div class="interaction">
                    <p>Interactive element: {}</p>
                </div>
            </div>
            """.format(scene.get("interaction", {}).get("type", "none"))
        
        quiz_html = ""
        for i, q in enumerate(spec.get("quiz", {}).get("questions", []), 1):
            quiz_html += f"""
            <div class="question">
                <h3>Question {i}: {q['prompt']}</h3>
                <div class="options">
            """
            for j, opt in enumerate(q.get("options", [])):
                is_correct = "true" if j == q.get("correct_index", 0) else "false"
                quiz_html += f'<button class="option" data-correct="{is_correct}">{opt}</button>'
            quiz_html += f"""
                </div>
                <div class="explanation" style="display:none;">{q.get('explanation', '')}</div>
            </div>
            """
        
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{spec.get('meta', {}).get('title', 'Interactive Lesson')}</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
            padding: 20px;
        }}
        .container {{
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .progress-bar {{
            width: 100%;
            height: 8px;
            background: #e0e0e0;
            border-radius: 4px;
            margin-bottom: 20px;
        }}
        .progress-fill {{
            height: 100%;
            background: #4CAF50;
            border-radius: 4px;
            transition: width 0.3s;
        }}
        .step-indicator {{
            text-align: center;
            margin-bottom: 30px;
            color: #666;
        }}
        .scene {{
            margin-bottom: 40px;
            padding: 20px;
            background: #fafafa;
            border-radius: 6px;
        }}
        .scene h2 {{
            color: #2196F3;
            margin-bottom: 15px;
        }}
        .scene ul {{
            margin-left: 20px;
            margin-bottom: 15px;
        }}
        .interaction {{
            padding: 15px;
            background: #e3f2fd;
            border-radius: 4px;
            margin-top: 15px;
        }}
        .question {{
            margin-bottom: 30px;
            padding: 20px;
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 6px;
        }}
        .options {{
            display: grid;
            gap: 10px;
            margin-top: 15px;
        }}
        .option {{
            padding: 12px;
            border: 2px solid #ddd;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }}
        .option:hover {{
            border-color: #2196F3;
            background: #e3f2fd;
        }}
        .option.correct {{
            background: #c8e6c9;
            border-color: #4CAF50;
        }}
        .option.wrong {{
            background: #ffcdd2;
            border-color: #f44336;
        }}
        .explanation {{
            margin-top: 15px;
            padding: 15px;
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            border-radius: 4px;
        }}
        .minigame {{
            padding: 30px;
            background: #f0f4f8;
            border-radius: 6px;
            margin: 30px 0;
        }}
        .ending {{
            text-align: center;
            padding: 40px;
        }}
        .ending h2 {{
            color: #4CAF50;
            margin-bottom: 20px;
        }}
        .reset-btn {{
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        }}
        .reset-btn:hover {{
            background: #d32f2f;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="progress-bar">
            <div class="progress-fill" id="progress" style="width: 0%"></div>
        </div>
        <div class="step-indicator">
            <span id="stepText">Step 1 / {len(spec.get('scenes', [])) + 2}</span>
        </div>
        
        <h1>{spec.get('meta', {}).get('title', 'Interactive Lesson')}</h1>
        
        <div id="content">
            {scenes_html}
            
            <div class="minigame" id="minigame">
                <h2>Mini-Game: {spec.get('minigame', {}).get('goal', 'Practice')}</h2>
                <p>{spec.get('minigame', {}).get('instructions', 'Complete the game')}</p>
                <div id="gameArea">
                    <p>Game implementation would go here</p>
                </div>
            </div>
            
            <div id="quiz">
                <h2>{spec.get('quiz', {}).get('title', 'Checkpoint Quiz')}</h2>
                {quiz_html}
            </div>
            
            <div class="ending" id="ending" style="display:none;">
                <h2>Congratulations!</h2>
                <h3>Key Takeaways:</h3>
                <ul style="text-align: left; display: inline-block;">
            """
        for point in spec.get("ending", {}).get("recap_points", []):
            html += f"<li>{point}</li>"
        html += """
                </ul>
                <h3>Next Steps:</h3>
                <ul style="text-align: left; display: inline-block;">
        """
        for step in spec.get("ending", {}).get("next_steps", []):
            html += f"<li>{step}</li>"
        html += """
                </ul>
            </div>
        </div>
    </div>
    
    <button class="reset-btn" onclick="resetProgress()">Reset</button>
    
    <script>
        let currentStep = 0;
        const totalSteps = """ + str(len(spec.get('scenes', [])) + 2) + """;
        let score = 0;
        
        const updateProgress = () => {{
            const progress = ((currentStep + 1) / totalSteps) * 100;
            document.getElementById('progress').style.width = progress + '%';
            document.getElementById('stepText').textContent = `Step ${{currentStep + 1}} / ${{totalSteps}}`;
        }};
        
        const resetProgress = () => {{
            if (confirm('Reset all progress?')) {{
                currentStep = 0;
                score = 0;
                updateProgress();
                location.reload();
            }}
        }};
        
        // Quiz handlers
        document.querySelectorAll('.option').forEach(btn => {{
            btn.addEventListener('click', () => {{
                const isCorrect = btn.dataset.correct === 'true';
                const question = btn.closest('.question');
                const options = question.querySelectorAll('.option');
                const explanation = question.querySelector('.explanation');
                
                options.forEach(opt => {{
                    opt.disabled = true;
                    if (opt.dataset.correct === 'true') {{
                        opt.classList.add('correct');
                    }} else if (opt === btn && !isCorrect) {{
                        opt.classList.add('wrong');
                    }}
                }});
                
                if (isCorrect) {{
                    score++;
                }}
                
                explanation.style.display = 'block';
            }});
        }});
        
        updateProgress();
    </script>
</body>
</html>
        """
        
        return html.strip()


class MockGitHubService:
    """Mock GitHub service that saves HTML locally instead of publishing."""
    
    def __init__(self, token: str = None, pages_repo: str = None, 
                 owner: str = None, branch: str = "main"):
        self.token = token
        self.pages_repo = pages_repo
        self.owner = owner
        self.branch = branch
        self.output_dir = "generated"
        os.makedirs(self.output_dir, exist_ok=True)
    
    def publish_html(self, html_content: str, generation_id: str, title: str) -> Dict:
        """Save HTML locally instead of publishing to GitHub."""
        logger.info(f"[MOCK] Saving HTML locally for generation: {generation_id}")
        
        # Save to local file
        output_path = os.path.join(self.output_dir, f"{generation_id}.html")
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        # Generate mock URLs (pointing to local file)
        preview_url = f"file://{os.path.abspath(output_path)}"
        source_url = f"file://{os.path.abspath(output_path)}"
        
        logger.info(f"[MOCK] HTML saved to: {output_path}")
        
        return {
            "preview_url": preview_url,
            "source_url": source_url
        }

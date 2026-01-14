"""
RunPod service for generating HTML via OpenHands.
"""
import json
import os
import logging
import requests
from typing import Dict

logger = logging.getLogger(__name__)


class RunPodService:
    """Service for interacting with RunPod OpenHands endpoint."""
    
    def __init__(self, openhands_url: str, api_key: str = None):
        if not openhands_url:
            raise ValueError("RUNPOD_OPENHANDS_URL is required")
        self.openhands_url = openhands_url
        self.api_key = api_key
        self.headers = {
            "Content-Type": "application/json"
        }
        if api_key:
            self.headers["Authorization"] = f"Bearer {api_key}"
    
    def generate_html(self, spec: Dict, lesson_summary: str) -> str:
        """
        Generate self-contained HTML from spec using OpenHands.
        
        Args:
            spec: JSON spec from Gemini
            lesson_summary: Lesson summary text
            
        Returns:
            HTML content as string
        """
        # Load prompt template
        prompt_template_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "prompts",
            "openhands_html.txt"
        )
        
        try:
            with open(prompt_template_path, 'r') as f:
                prompt_template = f.read()
        except FileNotFoundError:
            logger.error(f"Prompt template not found: {prompt_template_path}")
            raise RuntimeError("Prompt template file not found")
        
        # Replace template variables
        prompt = prompt_template.replace("{{SPEC_JSON}}", json.dumps(spec, indent=2))
        
        logger.info("Generating HTML via OpenHands...")
        
        # OpenHands endpoint expects prompt directly
        payload = {
            "prompt": prompt,
            "max_tokens": 8000,
            "temperature": 0.7
        }
        
        try:
            # Call OpenHands endpoint
            response = requests.post(
                self.openhands_url,
                json=payload,
                headers=self.headers,
                timeout=120
            )
            response.raise_for_status()
            result = response.json()
            
            # Extract HTML from response
            # Adjust based on your OpenHands endpoint response format
            html_content = result.get("html") or result.get("text") or result.get("output", "")
            
            if not html_content:
                logger.error(f"OpenHands returned empty response: {result}")
                raise RuntimeError("OpenHands returned empty HTML")
            
            logger.info(f"Successfully generated HTML ({len(html_content)} chars)")
            return html_content
            
        except requests.exceptions.RequestException as e:
            logger.error(f"RunPod/OpenHands API error: {e}")
            raise RuntimeError(f"RunPod/OpenHands API error: {e}")

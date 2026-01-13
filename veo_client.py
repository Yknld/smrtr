#!/usr/bin/env python3
"""
Veo API Client for video generation.
Handles authentication, job submission, and video retrieval.
"""

import json
import os
import time
import requests
from typing import Dict, Optional, List
import base64


class VeoClient:
    """Client for Google Veo API."""
    
    def __init__(self, api_key: Optional[str] = None, project_id: Optional[str] = None):
        """
        Initialize Veo client.
        
        Args:
            api_key: Google Cloud API key
            project_id: Google Cloud project ID
        """
        self.api_key = api_key or os.environ.get('VEO_API_KEY')
        self.project_id = project_id or os.environ.get('GOOGLE_CLOUD_PROJECT_ID')
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        
        if not self.api_key:
            print("Warning: VEO_API_KEY not set. Veo API will not be available.")
    
    def is_available(self) -> bool:
        """Check if Veo API is available."""
        return self.api_key is not None
    
    def create_video_job(
        self,
        image_path: str,
        visual_prompt: str,
        negative_prompt: str,
        audio_prompt: str,
        duration_seconds: int
    ) -> Dict:
        """
        Create a Veo video generation job.
        
        Args:
            image_path: Path to input image
            visual_prompt: Visual animation prompt
            negative_prompt: Negative prompt
            audio_prompt: Audio generation prompt
            duration_seconds: Desired video duration
        
        Returns:
            Job response dictionary
        """
        if not self.is_available():
            raise ValueError("Veo API key not configured")
        
        # Read image and encode
        with open(image_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')
        
        # Prepare request
        url = f"{self.base_url}/models/veo-3:generateVideo"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key
        }
        
        payload = {
            "input_image": {
                "image_data": image_data
            },
            "visual_prompt": visual_prompt,
            "negative_prompt": negative_prompt,
            "audio_prompt": audio_prompt,
            "duration_seconds": duration_seconds,
            "aspect_ratio": "16:9",
            "style": "educational",
            "motion_intensity": "low",
            "camera_motion": "subtle"
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Veo API error: {e}")
            raise
    
    def get_job_status(self, job_id: str) -> Dict:
        """Get status of a Veo job."""
        if not self.is_available():
            raise ValueError("Veo API key not configured")
        
        url = f"{self.base_url}/operations/{job_id}"
        headers = {
            "x-goog-api-key": self.api_key
        }
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Veo API error: {e}")
            raise
    
    def wait_for_completion(self, job_id: str, max_wait: int = 300, poll_interval: int = 5) -> Dict:
        """
        Wait for job to complete.
        
        Args:
            job_id: Job ID
            max_wait: Maximum seconds to wait
            poll_interval: Seconds between polls
        
        Returns:
            Final job status
        """
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            status = self.get_job_status(job_id)
            
            if status.get('done', False):
                return status
            
            if 'error' in status:
                raise Exception(f"Veo job failed: {status['error']}")
            
            time.sleep(poll_interval)
        
        raise TimeoutError(f"Veo job {job_id} did not complete within {max_wait} seconds")
    
    def download_video(self, video_url: str, output_path: str) -> str:
        """Download video from Veo."""
        try:
            response = requests.get(video_url, stream=True, timeout=60)
            response.raise_for_status()
            
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            return output_path
        except requests.exceptions.RequestException as e:
            print(f"Video download error: {e}")
            raise


def generate_videos_with_veo(
    veo_jobs: List[Dict],
    output_dir: str = "exports",
    api_key: Optional[str] = None
) -> List[str]:
    """
    Generate videos using Veo API for all jobs.
    
    Args:
        veo_jobs: List of Veo job specifications
        output_dir: Directory to save videos
        api_key: Optional API key override
    
    Returns:
        List of output video paths
    """
    client = VeoClient(api_key=api_key)
    
    if not client.is_available():
        raise ValueError("Veo API not available. Set VEO_API_KEY environment variable.")
    
    os.makedirs(output_dir, exist_ok=True)
    output_paths = []
    
    for job in veo_jobs:
        scene_id = job.get('scene_id', 1)
        duration = job.get('clip_duration_seconds', 8)
        
        # First, generate the input image for this scene
        # (We'll need to create this from the storyboard)
        temp_image = os.path.join(output_dir, f"scene_{scene_id}_input.png")
        
        # TODO: Generate image from storyboard scene
        # For now, create a placeholder
        
        try:
            # Create Veo job
            job_response = client.create_video_job(
                image_path=temp_image,
                visual_prompt=job.get('visual_prompt', ''),
                negative_prompt=job.get('negative_prompt', ''),
                audio_prompt=job.get('audio_prompt', ''),
                duration_seconds=duration
            )
            
            job_id = job_response.get('name')  # Veo returns operation name
            
            # Wait for completion
            final_status = client.wait_for_completion(job_id)
            
            # Download video
            video_url = final_status.get('response', {}).get('video_url')
            if video_url:
                output_path = os.path.join(output_dir, f"scene_{scene_id}_video.mp4")
                client.download_video(video_url, output_path)
                output_paths.append(output_path)
            
        except Exception as e:
            print(f"Error generating video for scene {scene_id}: {e}")
            continue
    
    return output_paths

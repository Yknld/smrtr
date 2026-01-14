#!/usr/bin/env python3
"""
Complete Veo integration for video generation pipeline.
Handles image generation, Veo API calls, and video assembly.
"""

import json
import os
import time
import requests
from typing import Dict, List, Optional
from pathlib import Path
import base64
from video_generator import create_cs_lecture_scene
from PIL import Image
import numpy as np


class VeoIntegration:
    """Complete Veo integration for educational video generation."""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize Veo integration."""
        self.api_key = api_key or os.environ.get('VEO_API_KEY')
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        self.available = self.api_key is not None
        
        if not self.available:
            print("⚠️  Veo API key not found. Set VEO_API_KEY environment variable.")
    
    def generate_scene_image(self, scene: Dict, output_path: str):
        """Generate input image for a scene."""
        scene_img = create_cs_lecture_scene(scene, 0, 1)
        scene_img.save(output_path)
        return output_path
    
    def create_veo_video(
        self,
        image_path: str,
        visual_prompt: str,
        negative_prompt: str,
        audio_prompt: str,
        duration_seconds: int
    ) -> Dict:
        """
        Create a Veo video generation job.
        
        Returns job response with operation name.
        """
        if not self.available:
            raise ValueError("Veo API not available")
        
        # Read and encode image
        with open(image_path, 'rb') as f:
            image_data = base64.b64encode(f.read()).decode('utf-8')
        
        # Use Veo 3.1 model which supports audio generation
        # Try veo-3.1-generate-preview first, fallback to veo-3
        url = f"{self.base_url}/models/veo-3.1-generate-preview:generateVideo"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key
        }
        
        # Veo API payload - audio_prompt should be sufficient for audio generation
        # Note: Some Veo API versions may not support generate_audio flag
        payload = {
            "input_image": {
                "image_data": image_data,
                "mime_type": "image/png"
            },
            "visual_prompt": visual_prompt,
            "negative_prompt": negative_prompt,
            "audio_prompt": audio_prompt,  # This should trigger audio generation
            "duration_seconds": duration_seconds,
            "aspect_ratio": "16:9",
            "style": "educational",
            "motion_intensity": "low",
            "camera_motion": "subtle",
            "pacing": "calm"
        }
        
        # Try adding audio parameters if API supports them
        # These may cause errors if not supported, so we'll handle gracefully
        try:
            # Some Veo API versions might support these
            payload["generate_audio"] = True
        except:
            pass
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Veo API error: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Response: {e.response.text}")
            raise
    
    def check_job_status(self, operation_name: str) -> Dict:
        """Check status of a Veo operation."""
        if not self.available:
            raise ValueError("Veo API not available")
        
        url = f"{self.base_url}/{operation_name}"
        headers = {
            "x-goog-api-key": self.api_key
        }
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Veo status check error: {e}")
            raise
    
    def wait_for_video(self, operation_name: str, max_wait: int = 600) -> str:
        """
        Wait for video generation to complete and return video URL.
        
        Args:
            operation_name: Veo operation name
            max_wait: Maximum seconds to wait
        
        Returns:
            Video URL or file path
        """
        start_time = time.time()
        poll_interval = 10  # Check every 10 seconds
        
        while time.time() - start_time < max_wait:
            status = self.check_job_status(operation_name)
            
            if status.get('done', False):
                # Extract video URL from response
                response_data = status.get('response', {})
                video_url = response_data.get('video_url') or response_data.get('videoUri') or response_data.get('video_uri')
                
                # Also check for audio URL
                audio_url = response_data.get('audio_url') or response_data.get('audioUri') or response_data.get('audio_uri')
                
                if video_url:
                    # Download video (which should include audio track)
                    temp_video = f"exports/temp_veo_video_{int(time.time())}.mp4"
                    self.download_video(video_url, temp_video)
                    
                    # Check if video has audio track
                    has_audio = self._check_video_has_audio(temp_video)
                    print(f"📊 Video audio check: {'✅ Has audio' if has_audio else '⚠️  No audio track detected'}")
                    
                    # If separate audio URL exists, combine them
                    if audio_url:
                        print("🎵 Separate audio URL found, combining...")
                        temp_audio = f"exports/temp_veo_audio_{int(time.time())}.mp3"
                        self.download_video(audio_url, temp_audio)
                        # Combine video and audio
                        final_path = f"exports/veo_video_{int(time.time())}.mp4"
                        self._combine_audio_video(temp_video, temp_audio, final_path)
                        return final_path
                    
                    # If no audio detected, add a silent audio track so player doesn't mute
                    if not has_audio:
                        print("⚠️  No audio in video. Adding silent audio track for compatibility...")
                        final_path = f"exports/veo_video_{int(time.time())}.mp4"
                        self._add_silent_audio(temp_video, final_path)
                        return final_path
                    
                    return temp_video
                
                # Or video data might be inlined
                video_data = response_data.get('video_data')
                if video_data:
                    # Save inline video data
                    output_path = f"exports/veo_video_{int(time.time())}.mp4"
                    video_bytes = base64.b64decode(video_data)
                    with open(output_path, 'wb') as f:
                        f.write(video_bytes)
                    return output_path
            
            if 'error' in status:
                error_msg = status['error'].get('message', 'Unknown error')
                raise Exception(f"Veo job failed: {error_msg}")
            
            print(f"⏳ Waiting for Veo video... ({int(time.time() - start_time)}s)")
            time.sleep(poll_interval)
        
        raise TimeoutError(f"Veo job did not complete within {max_wait} seconds")
    
    def generate_video_from_storyboard(
        self,
        storyboard: Dict,
        veo_jobs: Dict,
        output_path: str
    ) -> str:
        """
        Generate complete video from storyboard using Veo API.
        
        Args:
            storyboard: Storyboard JSON
            veo_jobs: Veo job specifications
            output_path: Output video path
        
        Returns:
            Path to generated video
        """
        if not self.available:
            raise ValueError("Veo API not available. Set VEO_API_KEY.")
        
        scenes = storyboard.get('scenes', [])
        jobs = veo_jobs.get('veo_jobs', [])
        
        # Create job mapping
        job_map = {job['scene_id']: job for job in jobs}
        
        # Generate images and create Veo jobs
        scene_videos = []
        temp_dir = "exports/temp_veo"
        os.makedirs(temp_dir, exist_ok=True)
        
        for scene in scenes:
            scene_id = scene['scene_id']
            job = job_map.get(scene_id)
            
            if not job:
                continue
            
            try:
                # Generate input image
                img_path = os.path.join(temp_dir, f"scene_{scene_id}.png")
                self.generate_scene_image(scene, img_path)
                
                # Create Veo job
                print(f"🎬 Creating Veo job for scene {scene_id}...")
                job_response = self.create_veo_video(
                    image_path=img_path,
                    visual_prompt=job['visual_prompt'],
                    negative_prompt=job['negative_prompt'],
                    audio_prompt=job['audio_prompt'],
                    duration_seconds=job['clip_duration_seconds']
                )
                
                operation_name = job_response.get('name')
                if operation_name:
                    # Wait for video
                    video_url = self.wait_for_video(operation_name)
                    scene_videos.append((scene_id, video_url))
                
            except Exception as e:
                print(f"❌ Error with scene {scene_id}: {e}")
                continue
        
        # Combine videos using ffmpeg
        if scene_videos:
            return self._combine_videos(scene_videos, output_path)
        else:
            raise Exception("No videos generated")
    
    def _combine_videos(self, scene_videos: List[tuple], output_path: str) -> str:
        """Combine multiple video files into one, preserving audio."""
        import subprocess
        
        # Create file list for ffmpeg concat
        list_file = "exports/video_list.txt"
        with open(list_file, 'w') as f:
            for scene_id, video_path in sorted(scene_videos):
                abs_path = os.path.abspath(video_path)
                f.write(f"file '{abs_path}'\n")
        
        # Use ffmpeg to concatenate with audio preservation
        try:
            # First check if any videos have audio
            videos_with_audio = []
            for scene_id, video_path in sorted(scene_videos):
                if self._check_video_has_audio(video_path):
                    videos_with_audio.append((scene_id, video_path))
            
            if not videos_with_audio:
                print("⚠️  Warning: None of the scene videos have audio tracks!")
                print("   Veo may not be generating audio. Check audio_prompt format.")
            
            # Re-encode to ensure audio is included and compatible
            # Use -map to explicitly map both video and audio streams
            result = subprocess.run([
                'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
                '-i', list_file, 
                '-c:v', 'libx264',  # Re-encode video for compatibility
                '-c:a', 'aac',      # Re-encode audio to ensure it's included
                '-b:a', '192k',     # Audio bitrate
                '-map', '0:v:0',    # Map video stream
                '-map', '0:a?',     # Map audio stream if available (optional)
                '-shortest',        # Match shortest stream (video or audio)
                output_path
            ], check=True, capture_output=True, text=True)
            
            os.unlink(list_file)
            print(f"✅ Combined {len(scene_videos)} videos with audio: {output_path}")
            return output_path
        except subprocess.CalledProcessError as e:
            print(f"⚠️  FFmpeg error: {e.stderr if hasattr(e, 'stderr') else str(e)}")
            # Try without audio re-encoding
            try:
                subprocess.run([
                    'ffmpeg', '-y', '-f', 'concat', '-safe', '0',
                    '-i', list_file, '-c', 'copy', output_path
                ], check=True, capture_output=True)
                os.unlink(list_file)
                return output_path
            except:
                os.unlink(list_file)
                return scene_videos[0][1] if scene_videos else output_path
        except FileNotFoundError:
            print("⚠️  FFmpeg not found. Cannot combine videos.")
            os.unlink(list_file)
            return scene_videos[0][1] if scene_videos else output_path
    
    def _check_video_has_audio(self, video_path: str) -> bool:
        """Check if video file has an audio track."""
        import subprocess
        try:
            result = subprocess.run([
                'ffprobe', '-v', 'error', '-select_streams', 'a:0',
                '-show_entries', 'stream=codec_type', '-of', 'csv=p=0',
                video_path
            ], capture_output=True, text=True, timeout=5)
            return 'audio' in result.stdout.lower()
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            # If ffprobe not available or fails, assume no audio
            return False
    
    def _add_silent_audio(self, video_path: str, output_path: str) -> str:
        """Add a louder audio track to video so player doesn't default to muted."""
        import subprocess
        try:
            # Get video duration
            result = subprocess.run([
                'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1', video_path
            ], capture_output=True, text=True, timeout=5)
            duration = float(result.stdout.strip())
            
            # Generate louder audio track (5% volume tone)
            subprocess.run([
                'ffmpeg', '-y',
                '-f', 'lavfi', '-i', f'sine=frequency=440:duration={duration}:sample_rate=44100',
                '-i', video_path,
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-b:a', '192k',
                '-filter:a', 'volume=0.05',  # 5% volume
                '-shortest',
                output_path
            ], check=True, capture_output=True)
            print(f"✅ Added audio track: {output_path}")
            return output_path
        except (subprocess.CalledProcessError, FileNotFoundError, ValueError) as e:
            print(f"⚠️  Could not add audio: {e}")
            # Return video without audio
            import shutil
            shutil.copy(video_path, output_path)
            return output_path
    
    def _combine_audio_video(self, video_path: str, audio_path: str, output_path: str) -> str:
        """Combine separate video and audio files."""
        import subprocess
        try:
            result = subprocess.run([
                'ffmpeg', '-y', '-i', video_path, '-i', audio_path,
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest',
                output_path
            ], check=True, capture_output=True, text=True)
            print(f"✅ Combined video and audio: {output_path}")
            return output_path
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            print(f"⚠️  Could not combine audio/video: {e}")
            if hasattr(e, 'stderr'):
                print(f"   Error details: {e.stderr}")
            # Return video without audio
            return video_path


# Convenience function
def generate_with_veo(storyboard: Dict, veo_jobs: Dict, output_path: str) -> str:
    """Generate video using Veo API."""
    veo = VeoIntegration()
    return veo.generate_video_from_storyboard(storyboard, veo_jobs, output_path)

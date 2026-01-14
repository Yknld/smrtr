#!/usr/bin/env python3
"""
Simple web app for generating educational videos from lecture content.
"""

from flask import Flask, render_template, request, jsonify, send_file
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

# Load environment variables for Veo API
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not required

# Try to import video generator
try:
    from video_generator import generate_video_from_storyboard, IMAGEIO_AVAILABLE
    VIDEO_GEN_AVAILABLE = IMAGEIO_AVAILABLE
    if not VIDEO_GEN_AVAILABLE:
        print("Warning: imageio not available. Video generation will be disabled.")
except ImportError as e:
    VIDEO_GEN_AVAILABLE = False
    print(f"Warning: Video generator not available: {e}")

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'exports'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

# Ensure exports directory exists
os.makedirs('exports', exist_ok=True)


@app.route('/')
def index():
    """Main page."""
    # Check Veo availability
    veo_available = False
    try:
        from veo_integration import VeoIntegration
        veo = VeoIntegration()
        veo_available = veo.available
    except ImportError:
        pass
    
    return render_template('index.html', veo_available=veo_available)


@app.route('/api/generate', methods=['POST'])
def generate_video():
    """Generate video from lecture content."""
    try:
        data = request.json
        video_title = data.get('video_title', 'Educational Video')
        topic = data.get('topic', 'General')
        audience_level = data.get('audience_level', 'high_school')
        summary_notes = data.get('summary_notes', '')
        transcript_excerpt = data.get('transcript_excerpt', '')
        
        if not summary_notes:
            return jsonify({'error': 'summary_notes is required'}), 400
        
        # Step 1: Generate storyboard
        input_data = {
            'video_title': video_title,
            'topic': topic,
            'audience_level': audience_level,
            'summary_notes': summary_notes,
            'transcript_excerpt': transcript_excerpt
        }
        
        # Save input to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(input_data, f)
            input_file = f.name
        
        # Generate storyboard - use sys.executable to ensure we use the same Python
        result = subprocess.run(
            [sys.executable, 'scripts/smartr_video_planner.py', input_file],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        if result.returncode != 0:
            return jsonify({'error': f'Storyboard generation failed: {result.stderr}'}), 500
        
        storyboard = json.loads(result.stdout)
        
        # Step 2: Generate Veo jobs
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(storyboard, f)
            storyboard_file = f.name
        
        result = subprocess.run(
            [sys.executable, 'scripts/smartr_veo_director.py', storyboard_file],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        if result.returncode != 0:
            return jsonify({'error': f'Veo job generation failed: {result.stderr}'}), 500
        
        veo_jobs = json.loads(result.stdout)
        
        # Step 3: Generate video (try Veo first, fallback to local)
        video_url = None
        
        # Try Veo API first
        try:
            from veo_integration import VeoIntegration
            veo = VeoIntegration()
            
            if veo.available:
                print("🎬 Using Veo API for video generation...")
                import uuid
                video_filename = f"video_veo_{uuid.uuid4().hex[:8]}.mp4"
                video_path = os.path.join(app.config['UPLOAD_FOLDER'], video_filename)
                
                try:
                    veo.generate_video_from_storyboard(storyboard, veo_jobs, video_path)
                    if os.path.exists(video_path):
                        video_url = f'/exports/{video_filename}'
                        print(f"✅ Veo video generated: {video_url}")
                except Exception as e:
                    print(f"⚠️  Veo generation failed: {e}")
                    print("   Falling back to local generation...")
                    veo.available = False  # Disable Veo for this request
        except ImportError:
            pass
        
        # Fallback to local video generation
        if not video_url and VIDEO_GEN_AVAILABLE:
            try:
                import uuid
                video_filename = f"video_{uuid.uuid4().hex[:8]}.mp4"
                video_path = os.path.join(app.config['UPLOAD_FOLDER'], video_filename)
                generate_video_from_storyboard(storyboard, video_path)
                if os.path.exists(video_path):
                    video_url = f'/exports/{video_filename}'
                    print(f"✅ Video generated locally: {video_url}")
            except Exception as e:
                print(f"❌ Video generation error: {e}")
                import traceback
                traceback.print_exc()
        
        # Clean up temp files
        os.unlink(input_file)
        os.unlink(storyboard_file)
        
        response = {
            'success': True,
            'storyboard': storyboard,
            'veo_jobs': veo_jobs,
            'message': 'Video generation pipeline completed.'
        }
        
        if video_url:
            response['video_url'] = video_url
            response['message'] += ' Video generated successfully!'
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/exports/<filename>')
def serve_video(filename):
    """Serve generated video files."""
    return send_file(os.path.join(app.config['UPLOAD_FOLDER'], filename))


if __name__ == '__main__':
    # Use port 5001 to avoid conflict with macOS AirPlay Receiver on port 5000
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, host='127.0.0.1', port=port)

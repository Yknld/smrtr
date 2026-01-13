#!/usr/bin/env python3
"""
Test script for Veo API integration.
"""

import json
import os
from veo_integration import VeoIntegration

def test_veo_availability():
    """Test if Veo API is available."""
    veo = VeoIntegration()
    print(f"Veo API Available: {veo.available}")
    
    if veo.available:
        print("✅ Veo API key found!")
        print(f"   API Key: {veo.api_key[:10]}..." if veo.api_key else "   (No key)")
    else:
        print("⚠️  Veo API key not found.")
        print("   Set VEO_API_KEY environment variable to enable Veo.")
        print("   Example: export VEO_API_KEY='your_key_here'")
    
    return veo.available

def test_with_storyboard():
    """Test Veo with a sample storyboard."""
    if not os.path.exists('test_storyboard.json'):
        print("❌ test_storyboard.json not found")
        return
    
    if not os.path.exists('test_veo_jobs.json'):
        print("❌ test_veo_jobs.json not found")
        print("   Generate it first: python3 scripts/smartr_veo_director.py test_storyboard.json > test_veo_jobs.json")
        return
    
    veo = VeoIntegration()
    if not veo.available:
        print("❌ Veo API not available. Cannot test.")
        return
    
    print("\n📖 Loading storyboard and Veo jobs...")
    storyboard = json.load(open('test_storyboard.json'))
    veo_jobs = json.load(open('test_veo_jobs.json'))
    
    print(f"   Scenes: {len(storyboard.get('scenes', []))}")
    print(f"   Veo jobs: {len(veo_jobs.get('veo_jobs', []))}")
    
    print("\n🎬 Testing Veo video generation...")
    print("   (This will take several minutes per scene)")
    
    try:
        output_path = veo.generate_video_from_storyboard(
            storyboard,
            veo_jobs,
            'exports/test_veo_output.mp4'
        )
        print(f"✅ Veo video generated: {output_path}")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("🧪 Veo API Integration Test\n")
    
    available = test_veo_availability()
    
    if available:
        print("\n" + "="*50)
        response = input("\nTest with storyboard? (y/n): ")
        if response.lower() == 'y':
            test_with_storyboard()
    else:
        print("\n💡 To enable Veo:")
        print("   1. Get API key from Google Cloud Console")
        print("   2. Set: export VEO_API_KEY='your_key'")
        print("   3. Run this test again")

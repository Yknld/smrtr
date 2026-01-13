#!/usr/bin/env python3
"""
CS Educational Video Generator (3Blue1Brown / CS50 style):
- Large, visible text
- Smooth animations
- Clear labels and annotations
- Professional CS lecture style
"""

import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os
import tempfile
from pathlib import Path
import re
import math

try:
    import imageio
    IMAGEIO_AVAILABLE = True
except ImportError:
    IMAGEIO_AVAILABLE = False
    print("Warning: imageio not available. Install with: pip install imageio")


# Font loading - try to get larger fonts
def get_font(size):
    """Get font at specified size, with fallbacks."""
    try:
        # Try macOS system fonts
        font_paths = [
            "/System/Library/Fonts/Helvetica.ttc",
            "/Library/Fonts/Arial.ttf",
            "/System/Library/Fonts/Supplemental/Arial.ttf",
        ]
        for path in font_paths:
            try:
                return ImageFont.truetype(path, size)
            except:
                continue
    except:
        pass
    # Fallback to default (will be small but works)
    return ImageFont.load_default()


def get_key_concepts(narration_text):
    """Extract key concepts from narration text."""
    text = narration_text.lower()
    concepts = []
    
    tech_terms = ['dualarraydeque', 'arraystack', 'array', 'stack', 'deque', 
                  'front', 'back', 'element', 'index', 'size', 'get', 'set', 
                  'add', 'balance', 'operation', 'process', 'step', 'reverse order',
                  'normal order', 'performance', 'o(1)', 'time', 'complexity']
    
    for term in tech_terms:
        if term in text:
            concepts.append(term)
    
    return concepts[:5]


def draw_text_with_background(draw, text, x, y, font, text_color='white', bg_color='#4a90e2', padding=8):
    """Draw text with background box for visibility."""
    # Get text bounding box
    bbox = draw.textbbox((x, y), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Draw background
    draw.rectangle(
        [x - padding, y - padding, x + text_width + padding, y + text_height + padding],
        fill=bg_color, outline='#2a5a8a', width=2
    )
    # Draw text
    draw.text((x, y), text, fill=text_color, font=font)
    
    return text_width, text_height


def create_cs_lecture_scene(scene, frame_num=0, total_frames=1, width=1920, height=1080):
    """Create a CS lecture-style scene with large text and smooth animations."""
    # Neutral grey background per STYLE_ANCHOR
    bg_color = '#F5F5F5'
    img = Image.new('RGB', (width, height), color=bg_color)
    draw = ImageDraw.Draw(img)
    
    # Subtle gradient
    for y in range(height):
        r = int(245 - (y / height) * 17)
        draw.line([(0, y), (width, y)], fill=(r, r, r))
    
    # Split screen: Visuals on left (65%), Notes on right (35%)
    visual_area_width = int(width * 0.65)
    notes_area_width = width - visual_area_width
    visual_center_x = visual_area_width // 2
    center_y = height // 2
    
    narration = scene.get('narration_text', '')
    visual_type = scene.get('visual_type', 'illustration')
    concepts = get_key_concepts(narration)
    
    # Animation progress with easing
    anim_progress = frame_num / max(total_frames - 1, 1)
    # Smooth easing
    eased_progress = anim_progress * anim_progress * (3 - 2 * anim_progress)
    
    # Load fonts
    font_title = get_font(52)
    font_large = get_font(42)
    font_medium = get_font(32)
    font_small = get_font(26)
    font_notes = get_font(28)
    
    # Create content-aware visuals
    if 'dualarraydeque' in narration.lower() or 'arraystack' in narration.lower():
        # Two stacks visualization with clear labels
        stack_width = 220
        stack_height = 450
        gap = 100
        left_x = visual_center_x - stack_width - gap // 2
        right_x = visual_center_x + gap // 2
        
        # Title above
        title_y = center_y - stack_height//2 - 70
        draw_text_with_background(
            draw, "DualArrayDeque", visual_center_x - 200, title_y,
            font_title, 'white', '#2c3e50', padding=12
        )
        
        # Left stack (FRONT) - reverse order
        front_color = '#3498db'
        if eased_progress > 0.1:
            draw.rectangle(
                [left_x, center_y - stack_height//2,
                 left_x + stack_width, center_y + stack_height//2],
                outline=front_color, width=6, fill='#ebf5fb'
            )
            
            # Stack elements with animation
            num_elements = 4
            for i in range(num_elements):
                if eased_progress > 0.2 + i * 0.15:
                    y_pos = center_y - stack_height//2 + 30 + i * 85
                    
                    # Element box
                    draw.rectangle(
                        [left_x + 20, y_pos,
                         left_x + stack_width - 20, y_pos + 75],
                        fill=front_color, outline='#2980b9', width=3
                    )
                    # Element label - larger
                    elem_text = f"E{num_elements-i}"
                    text_x = left_x + (stack_width - 40) // 2
                    draw.text((text_x, y_pos + 25), elem_text, fill='white', font=font_medium)
            
            # FRONT label - large and clear
            label_y = center_y + stack_height//2 + 40
            draw_text_with_background(
                draw, "FRONT", left_x + 40, label_y,
                font_large, 'white', front_color, padding=10
            )
            draw.text((left_x + 20, label_y + 50), "(reverse order)", fill='#2c3e50', font=font_small)
        
        # Right stack (BACK) - normal order
        back_color = '#27ae60'
        if eased_progress > 0.3:
            draw.rectangle(
                [right_x, center_y - stack_height//2,
                 right_x + stack_width, center_y + stack_height//2],
                outline=back_color, width=6, fill='#eafaf1'
            )
            
            # Stack elements
            num_elements = 4
            for i in range(num_elements):
                if eased_progress > 0.4 + i * 0.15:
                    y_pos = center_y - stack_height//2 + 30 + i * 85
                    draw.rectangle(
                        [right_x + 20, y_pos,
                         right_x + stack_width - 20, y_pos + 75],
                        fill=back_color, outline='#229954', width=3
                    )
                    elem_text = f"E{i+num_elements}"
                    text_x = right_x + (stack_width - 40) // 2
                    draw.text((text_x, y_pos + 25), elem_text, fill='white', font=font_medium)
            
            # BACK label
            label_y = center_y + stack_height//2 + 40
            draw_text_with_background(
                draw, "BACK", right_x + 50, label_y,
                font_large, 'white', back_color, padding=10
            )
            draw.text((right_x + 30, label_y + 50), "(normal order)", fill='#2c3e50', font=font_small)
        
        # Connection arrow
        if eased_progress > 0.6:
            draw.line([left_x + stack_width, center_y, right_x, center_y],
                     fill='#7f8c8d', width=5)
            arrow_x = visual_center_x
            draw.polygon([
                (arrow_x - 15, center_y - 12),
                (arrow_x, center_y),
                (arrow_x - 15, center_y + 12)
            ], fill='#7f8c8d')
    
    elif visual_type == 'diagram':
        # Flowchart with large labels
        box_width, box_height = 360, 120
        num_boxes = 3
        spacing = 70
        
        start_x = visual_center_x - ((num_boxes - 1) * (box_width + spacing)) // 2
        
        for i in range(num_boxes):
            if eased_progress > i * 0.2:
                x = start_x + i * (box_width + spacing)
                y = center_y - box_height // 2
                
                # Box with rounded effect
                draw.rectangle(
                    [x, y, x + box_width, y + box_height],
                    outline='#3498db', width=5, fill='#ebf5fb'
                )
                
                # Large label inside box
                labels = ["Step 1", "Step 2", "Step 3"]
                label_x = x + box_width // 2 - 60
                draw_text_with_background(
                    draw, labels[i], label_x, y + box_height // 2 - 20,
                    font_large, 'white', '#3498db', padding=8
                )
                
                # Description below
                descs = ["Initialize", "Process", "Complete"]
                draw.text((x + 30, y + box_height + 20), descs[i], fill='#2c3e50', font=font_small)
                
                # Arrow to next
                if i < num_boxes - 1 and eased_progress > (i + 0.5) * 0.2:
                    arrow_start = x + box_width
                    arrow_end = x + box_width + spacing
                    draw.line([arrow_start, center_y, arrow_end, center_y],
                             fill='#3498db', width=6)
                    draw.polygon([
                        (arrow_end - 18, center_y - 12),
                        (arrow_end, center_y),
                        (arrow_end - 18, center_y + 12)
                    ], fill='#3498db')
    
    elif visual_type == 'chart':
        # Bar chart with content-aware labels from narration
        bar_width = 130
        
        # Extract meaningful labels from narration
        narration_lower = narration.lower()
        # Look for numbers, percentages, or key terms
        import re
        numbers = re.findall(r'\d+\.?\d*', narration)
        # Extract key terms (capitalized words or important nouns)
        words = narration.split()
        key_terms = [w.strip('.,!?;:') for w in words if w[0].isupper() and len(w) > 3][:4]
        
        # Use concepts if available, otherwise use key terms
        if concepts:
            bar_labels = [c.replace('_', ' ').title()[:8] for c in concepts[:4]]
        elif key_terms:
            bar_labels = [t[:8] for t in key_terms[:4]]
        else:
            # Extract first letter of important words
            important_words = [w for w in narration.split() if len(w) > 4][:4]
            bar_labels = [w[0].upper() for w in important_words[:4]]
        
        # Ensure we have 4 labels
        while len(bar_labels) < 4:
            bar_labels.append(chr(65 + len(bar_labels)))  # A, B, C, D
        
        # Use numbers from narration if available, otherwise use default
        if numbers and len(numbers) >= 4:
            bars_data = [min(1.0, float(n) / 100) if float(n) > 1 else float(n) for n in numbers[:4]]
        else:
            bars_data = [0.65, 0.85, 0.72, 0.92]
        
        max_bar_height = 380
        
        start_x = visual_center_x - (len(bars_data) * bar_width) // 2
        
        for i, ratio in enumerate(bars_data):
            if eased_progress > i * 0.2:
                x = start_x + i * bar_width
                bar_height = int(max_bar_height * ratio * min(1.0, (eased_progress - i * 0.2) * 3))
                y_top = center_y + max_bar_height // 2 - bar_height
                
                # Bar
                draw.rectangle(
                    [x, y_top, x + bar_width - 25, center_y + max_bar_height // 2],
                    fill='#3498db', outline='#2980b9', width=3
                )
                # Large value label
                value_text = f"{int(ratio*100)}%"
                draw_text_with_background(
                    draw, value_text, x + 15, y_top - 45,
                    font_medium, 'white', '#2980b9', padding=6
                )
                # Bar label
                draw.text((x + 40, center_y + max_bar_height // 2 + 15), bar_labels[i], fill='#2c3e50', font=font_medium)
    
    else:
        # Concept map with actual content from narration
        # Extract main topic from narration or use learning goal
        main_topic = scene.get('learning_goal', '')
        if not main_topic:
            # Extract first meaningful phrase from narration
            words = narration.split()[:5]
            main_topic = ' '.join(words).title()
        if not main_topic or len(main_topic) > 30:
            main_topic = scene.get('topic', 'Key Concept')
        
        main_radius = 100
        if eased_progress > 0.2:
            draw.ellipse(
                [visual_center_x - main_radius, center_y - main_radius,
                 visual_center_x + main_radius, center_y + main_radius],
                outline='#3498db', width=8, fill='#ebf5fb'
            )
            # Use actual topic, truncate if too long
            display_topic = main_topic[:20] + '...' if len(main_topic) > 20 else main_topic
            text_bbox = draw.textbbox((0, 0), display_topic, font=font_medium)
            text_width = text_bbox[2] - text_bbox[0]
            draw.text((visual_center_x - text_width // 2, center_y - 15), display_topic, fill='#2c3e50', font=font_medium)
        
        # Connected nodes - use actual concepts from narration
        node_radius = 65
        angles = [0, 90, 180, 270]
        node_distance = 220
        
        # Get real concepts from narration
        real_concepts = concepts[:4] if len(concepts) >= 4 else concepts
        # Fill remaining slots with meaningful words from narration
        if len(real_concepts) < 4:
            narration_words = [w for w in narration.split() if len(w) > 4 and w.lower() not in ['that', 'this', 'with', 'from', 'which', 'their', 'there']]
            for word in narration_words[:4 - len(real_concepts)]:
                if word not in real_concepts:
                    real_concepts.append(word.title())
        # Ensure we have 4 labels
        while len(real_concepts) < 4:
            real_concepts.append(f"Component {len(real_concepts) + 1}")
        
        node_labels = [c.replace('_', ' ').title()[:15] for c in real_concepts[:4]]
        
        for idx, angle in enumerate(angles):
            if eased_progress > 0.3 + idx * 0.15:
                rad = math.radians(angle)
                nx = visual_center_x + node_distance * math.cos(rad) * eased_progress
                ny = center_y + node_distance * math.sin(rad) * eased_progress
                
                # Connection
                draw.line([visual_center_x, center_y, nx, ny], fill='#3498db', width=4)
                
                # Node
                draw.ellipse(
                    [nx - node_radius, ny - node_radius,
                     nx + node_radius, ny + node_radius],
                    outline='#2980b9', width=5, fill='#ebf5fb'
                )
                # Large node label - use actual concept
                label_text = node_labels[idx]
                text_bbox = draw.textbbox((0, 0), label_text, font=font_small)
                text_width = text_bbox[2] - text_bbox[0]
                label_x = nx - text_width // 2
                label_y = ny - 12
                draw.text((label_x, label_y), label_text, fill='#2c3e50', font=font_small)
    
    # Notes panel on right (35% of screen) - large, visible text
    notes_x = visual_area_width + 30
    notes_width = notes_area_width - 60
    notes_y_start = 60
    
    # Notes background
    draw.rectangle(
        [notes_x - 15, notes_y_start - 15, width - 30, height - 30],
        fill='#ffffff', outline='#bdc3c7', width=3
    )
    
    # Notes title - large
    draw_text_with_background(
        draw, "Key Points", notes_x, notes_y_start,
        font_large, 'white', '#34495e', padding=10
    )
    
    # Split narration into bullet points
    words = narration.split()
    bullet_points = []
    current_point = []
    current_length = 0
    max_chars_per_point = 40
    
    for word in words:
        if current_length + len(word) + 1 > max_chars_per_point:
            if current_point:
                bullet_points.append(' '.join(current_point))
            current_point = [word]
            current_length = len(word)
        else:
            current_point.append(word)
            current_length += len(word) + 1
    
    if current_point:
        bullet_points.append(' '.join(current_point))
    
    # Display bullet points with large text
    point_y = notes_y_start + 80
    line_height = 55
    
    for i, point in enumerate(bullet_points[:6]):
        if point_y + i * line_height < height - 120:
            # Large bullet
            draw.ellipse([notes_x, point_y + i * line_height + 12, notes_x + 16, point_y + i * line_height + 28],
                        fill='#3498db')
            # Large text
            draw.text((notes_x + 25, point_y + i * line_height), point, fill='#2c3e50', font=font_notes)
    
    # Subtitle at bottom - large and clear
    subtitle_y = height - 120
    subtitle_bg_height = 100
    
    # Dark background for subtitle
    overlay = Image.new('RGBA', (width, subtitle_bg_height), (0, 0, 0, 220))
    img.paste(overlay, (0, subtitle_y), overlay)
    
    # Subtitle text - large
    words = narration.split()
    subtitle_lines = []
    current_line = []
    current_length = 0
    max_chars = 75
    
    for word in words:
        if current_length + len(word) + 1 > max_chars:
            subtitle_lines.append(' '.join(current_line))
            current_line = [word]
            current_length = len(word)
        else:
            current_line.append(word)
            current_length += len(word) + 1
    
    if current_line:
        subtitle_lines.append(' '.join(current_line))
    
    # Display subtitle (1-2 lines) - large font
    display_subtitle = subtitle_lines[:2]
    subtitle_line_height = 45
    subtitle_start_y = subtitle_y + (subtitle_bg_height - len(display_subtitle) * subtitle_line_height) // 2
    
    for i, line in enumerate(display_subtitle):
        text_width = len(line) * 18  # Larger character width estimate
        text_x = (width - text_width) // 2
        draw.text((text_x, subtitle_start_y + i * subtitle_line_height), line, fill='white', font=font_medium)
    
    return img


# Content-specific visualizers

def draw_linked_list(draw, narration, visual_elements, progress, center_x, center_y, 
                     font_large, font_medium, font_small):
    """Draw a linked list visualization."""
    is_doubly = visual_elements.get('direction') == 'doubly'
    num_nodes = min(5, max(3, len(narration.split()) // 10))
    
    node_width = 120
    node_height = 80
    spacing = 150
    
    start_x = center_x - ((num_nodes - 1) * spacing) // 2
    
    for i in range(num_nodes):
        if progress > i * 0.15:
            x = start_x + i * spacing
            y = center_y
            
            # Node box
            draw.rectangle(
                [x - node_width//2, y - node_height//2,
                 x + node_width//2, y + node_height//2],
                outline='#3498db', width=4, fill='#ebf5fb'
            )
            
            # Data
            draw.text((x - 30, y - 15), f"Data{i+1}", fill='#2c3e50', font=font_small)
            
            # Next pointer
            if i < num_nodes - 1:
                next_x = x + node_width//2
                arrow_x = x + spacing - node_width//2
                draw.line([next_x, y, arrow_x, y], fill='#3498db', width=3)
                draw.polygon([
                    (arrow_x - 10, y - 5),
                    (arrow_x, y),
                    (arrow_x - 10, y + 5)
                ], fill='#3498db')
            
            # Prev pointer (if doubly linked)
            if is_doubly and i > 0:
                prev_x = x - node_width//2
                arrow_x = x - spacing + node_width//2
                draw.line([prev_x, y, arrow_x, y], fill='#e74c3c', width=3)
                draw.polygon([
                    (arrow_x + 10, y - 5),
                    (arrow_x, y),
                    (arrow_x + 10, y + 5)
                ], fill='#e74c3c')
    
    # Head pointer
    if visual_elements.get('has_head') and progress > 0.1:
        head_x = start_x - node_width//2 - 40
        draw.text((head_x - 30, center_y - 10), "HEAD", fill='#2c3e50', font=font_medium)
        draw.line([head_x, center_y, start_x - node_width//2, center_y], 
                 fill='#2c3e50', width=3)


def draw_tree(draw, narration, visual_elements, progress, center_x, center_y,
             font_large, font_medium, font_small):
    """Draw a binary tree visualization."""
    is_binary = visual_elements.get('type') == 'binary'
    
    # Simple binary tree layout
    root_x = center_x
    root_y = center_y - 100
    
    node_radius = 40
    level_spacing = 120
    
    # Root node
    if progress > 0.1:
        draw.ellipse(
            [root_x - node_radius, root_y - node_radius,
             root_x + node_radius, root_y + node_radius],
            outline='#3498db', width=4, fill='#ebf5fb'
        )
        draw.text((root_x - 20, root_y - 10), "Root", fill='#2c3e50', font=font_small)
    
    # Left and right children
    if is_binary and progress > 0.3:
        left_x = root_x - 100
        right_x = root_x + 100
        child_y = root_y + level_spacing
        
        # Left child
        draw.line([root_x - 30, root_y + 30, left_x, child_y - 30], fill='#3498db', width=3)
        draw.ellipse(
            [left_x - node_radius, child_y - node_radius,
             left_x + node_radius, child_y + node_radius],
            outline='#27ae60', width=4, fill='#eafaf1'
        )
        draw.text((left_x - 15, child_y - 10), "L", fill='#2c3e50', font=font_small)
        
        # Right child
        draw.line([root_x + 30, root_y + 30, right_x, child_y - 30], fill='#3498db', width=3)
        draw.ellipse(
            [right_x - node_radius, child_y - node_radius,
             right_x + node_radius, child_y + node_radius],
            outline='#e74c3c', width=4, fill='#fdeaea'
        )
        draw.text((right_x - 15, child_y - 10), "R", fill='#2c3e50', font=font_small)


def draw_stack(draw, narration, visual_elements, progress, center_x, center_y,
              font_large, font_medium, font_small):
    """Draw a stack visualization."""
    stack_width = 200
    stack_height = 400
    num_elements = 4
    
    x = center_x - stack_width//2
    y_top = center_y - stack_height//2
    
    # Stack container
    if progress > 0.1:
        draw.rectangle(
            [x, y_top, x + stack_width, center_y + stack_height//2],
            outline='#3498db', width=5, fill='#ebf5fb'
        )
    
    # Stack elements (LIFO - last in first out)
    element_height = 70
    for i in range(num_elements):
        if progress > 0.2 + i * 0.15:
            elem_y = center_y + stack_height//2 - (i + 1) * element_height
            draw.rectangle(
                [x + 10, elem_y, x + stack_width - 10, elem_y + element_height - 5],
                fill='#3498db', outline='#2980b9', width=3
            )
            draw.text((x + stack_width//2 - 20, elem_y + 20), f"E{i+1}", 
                     fill='white', font=font_medium)
    
    # Top label
    if progress > 0.5:
        draw.text((x + stack_width + 20, y_top + 20), "TOP", fill='#2c3e50', font=font_medium)


def draw_queue(draw, narration, visual_elements, progress, center_x, center_y,
              font_large, font_medium, font_small):
    """Draw a queue visualization."""
    queue_width = 500
    queue_height = 120
    num_elements = 4
    
    x_start = center_x - queue_width//2
    y = center_y - queue_height//2
    
    # Queue container
    if progress > 0.1:
        draw.rectangle(
            [x_start, y, x_start + queue_width, y + queue_height],
            outline='#27ae60', width=5, fill='#eafaf1'
        )
    
    # Queue elements (FIFO - first in first out)
    element_width = 100
    spacing = 20
    for i in range(num_elements):
        if progress > 0.2 + i * 0.15:
            elem_x = x_start + 20 + i * (element_width + spacing)
            draw.rectangle(
                [elem_x, y + 15, elem_x + element_width, y + queue_height - 15],
                fill='#27ae60', outline='#229954', width=3
            )
            draw.text((elem_x + element_width//2 - 15, y + queue_height//2 - 10), 
                     f"E{i+1}", fill='white', font=font_medium)
    
    # Front and Rear labels
    if progress > 0.5:
        draw.text((x_start - 40, y + queue_height//2 - 10), "FRONT", 
                 fill='#2c3e50', font=font_medium)
        draw.text((x_start + queue_width + 10, y + queue_height//2 - 10), "REAR", 
                 fill='#2c3e50', font=font_medium)


def draw_array(draw, narration, visual_elements, progress, center_x, center_y,
              font_large, font_medium, font_small):
    """Draw an array visualization."""
    num_elements = min(8, max(5, len(narration.split()) // 8))
    element_width = 80
    element_height = 100
    spacing = 10
    
    array_width = num_elements * (element_width + spacing) - spacing
    x_start = center_x - array_width//2
    y = center_y - element_height//2
    
    for i in range(num_elements):
        if progress > i * 0.1:
            elem_x = x_start + i * (element_width + spacing)
            
            # Element box
            draw.rectangle(
                [elem_x, y, elem_x + element_width, y + element_height],
                outline='#3498db', width=3, fill='#ebf5fb'
            )
            
            # Element value
            draw.text((elem_x + element_width//2 - 10, y + element_height//2 - 10), 
                     f"E{i}", fill='#2c3e50', font=font_medium)
            
            # Index label
            if visual_elements.get('has_indices'):
                draw.text((elem_x + element_width//2 - 5, y + element_height + 10), 
                         str(i), fill='#7f8c8d', font=font_small)


def draw_text_only_slide(draw, narration, visual_elements, progress, center_x, center_y,
                         font_title, font_large, font_medium):
    """Draw a text-only slide (no animations, just clear text)."""
    # Split narration into lines
    words = narration.split()
    lines = []
    current_line = []
    current_length = 0
    max_chars = 60
    
    for word in words:
        if current_length + len(word) + 1 > max_chars:
            lines.append(' '.join(current_line))
            current_line = [word]
            current_length = len(word)
        else:
            current_line.append(word)
            current_length += len(word) + 1
    
    if current_line:
        lines.append(' '.join(current_line))
    
    # Draw text lines centered
    line_height = 60
    start_y = center_y - (len(lines) * line_height) // 2
    
    for i, line in enumerate(lines[:6]):  # Max 6 lines
        if progress > i * 0.1:
            text_bbox = draw.textbbox((0, 0), line, font=font_large)
            text_width = text_bbox[2] - text_bbox[0]
            x = center_x - text_width // 2
            y = start_y + i * line_height
            
            # Text with subtle background for readability
            draw_text_with_background(
                draw, line, x, y, font_large, '#2c3e50', '#ffffff', padding=8
            )


def generate_tts_audio(narration_text, duration, sample_rate=44100):
    """Generate TTS audio from narration text."""
    try:
        import edge_tts
        import asyncio
        import io
        import signal
        
        async def generate():
            communicate = edge_tts.Communicate(narration_text, "en-US-AriaNeural")
            audio_data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]
            return audio_data
        
        # Run async TTS generation
        audio_bytes = asyncio.run(generate())
        
        # Convert to numpy array
        import soundfile as sf
        audio_io = io.BytesIO(audio_bytes)
        audio_array, sr = sf.read(audio_io)
        
        # Resample if needed
        if sr != sample_rate:
            from scipy import signal
            num_samples = int(len(audio_array) * sample_rate / sr)
            audio_array = signal.resample(audio_array, num_samples)
        
        # Normalize and ensure it's float32
        audio_array = audio_array.astype(np.float32)
        max_val = np.max(np.abs(audio_array))
        if max_val > 0:
            audio_array = audio_array / max_val * 0.8  # Normalize to 80% volume
        
        # Pad or trim to match duration
        target_samples = int(duration * sample_rate)
        if len(audio_array) < target_samples:
            # Pad with silence
            padding = np.zeros(target_samples - len(audio_array), dtype=np.float32)
            audio_array = np.concatenate([audio_array, padding])
        elif len(audio_array) > target_samples:
            # Trim
            audio_array = audio_array[:target_samples]
        
        return audio_array
        
    except ImportError:
        # Fallback: generate louder tone
        return generate_fallback_audio(duration, sample_rate)
    except Exception as e:
        print(f"⚠️  TTS error: {e}, using fallback audio")
        return generate_fallback_audio(duration, sample_rate)


def generate_fallback_audio(duration, sample_rate=44100):
    """Generate fallback audio track (louder tone)."""
    num_samples = int(duration * sample_rate)
    t = np.linspace(0, duration, num_samples)
    # Louder tone (but still subtle) - 5% volume
    audio = np.sin(2 * np.pi * 440 * t) * 0.05  # A4 note at 5% volume
    return audio.astype(np.float32)


def generate_video_from_storyboard(storyboard_json, output_path):
    """Generate CS lecture-style educational video with audio track."""
    if not IMAGEIO_AVAILABLE:
        raise ImportError("imageio is required. Install with: pip install imageio")
    
    scenes = storyboard_json.get('scenes', [])
    fps = 30  # Smooth 30fps
    sample_rate = 44100
    
    video_frames = []
    audio_samples = []
    
    for scene in scenes:
        duration = scene.get('duration_seconds', 5)
        num_frames = int(duration * fps)
        
        # Create animated frames
        for frame_num in range(num_frames):
            scene_img = create_cs_lecture_scene(scene, frame_num, num_frames)
            frame = np.array(scene_img)
            video_frames.append(frame)
        
        # Generate audio track for this scene using TTS
        narration_text = scene.get('narration_text', '')
        if narration_text:
            print(f"🎤 Generating TTS audio for scene {scene.get('scene_id', '?')}...")
            scene_audio = generate_tts_audio(narration_text, duration, sample_rate)
        else:
            scene_audio = generate_fallback_audio(duration, sample_rate)
        audio_samples.append(scene_audio)
    
    # Combine all audio
    combined_audio = np.concatenate(audio_samples) if audio_samples else generate_fallback_audio(1.0, sample_rate)
    
    # Write high-quality video (without audio first)
    temp_video = tempfile.mktemp(suffix='.mp4')
    imageio.mimwrite(
        temp_video,
        video_frames,
        fps=fps,
        codec='libx264',
        quality=9,
        pixelformat='yuv420p'
    )
    
    # Add audio track using ffmpeg
    try:
        import subprocess
        import soundfile as sf
        
        # Save audio to temporary file
        temp_audio = tempfile.mktemp(suffix='.wav')
        sf.write(temp_audio, combined_audio, sample_rate)
        
        # Combine video and audio
        subprocess.run([
            'ffmpeg', '-y',
            '-i', temp_video,
            '-i', temp_audio,
            '-c:v', 'copy',  # Copy video codec
            '-c:a', 'aac',   # Encode audio as AAC
            '-b:a', '192k',  # Audio bitrate
            '-shortest',     # Match shortest stream
            output_path
        ], check=True, capture_output=True)
        
        os.unlink(temp_audio)
        print(f"✅ CS lecture-style video with audio track generated: {output_path}")
    except (subprocess.CalledProcessError, FileNotFoundError, ImportError) as e:
        # Fallback: video without audio
        print(f"⚠️  Could not add audio track: {e}")
        print("   Generating video without audio...")
        import shutil
        shutil.copy(temp_video, output_path)
    
    os.unlink(temp_video)
    return output_path


if __name__ == '__main__':
    test_storyboard = {
        "scenes": [
            {
                "scene_id": 1,
                "duration_seconds": 4,
                "narration_text": "A DualArrayDeque uses two ArrayStacks called front and back",
                "visual_type": "illustration"
            }
        ]
    }
    
    generate_video_from_storyboard(test_storyboard, 'test_output.mp4')

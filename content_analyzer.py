#!/usr/bin/env python3
"""
Content Analyzer: Detects content type and extracts relevant information
for generating appropriate visuals.
"""

import re
from typing import Dict, List, Tuple, Optional


def detect_content_type(narration_text: str) -> Dict[str, any]:
    """
    Analyze narration text to determine content type and extract relevant info.
    
    Returns:
        {
            'content_type': 'linked_list' | 'tree' | 'stack' | 'queue' | 'array' | 
                           'algorithm' | 'concept' | 'text_only' | 'diagram' | 'chart',
            'needs_animation': bool,
            'visual_elements': {...},
            'key_terms': [...]
        }
    """
    text_lower = narration_text.lower()
    
    # Data Structures
    if any(term in text_lower for term in ['linked list', 'linkedlist', 'node', 'pointer', 'next', 'prev']):
        return {
            'content_type': 'linked_list',
            'needs_animation': True,
            'visual_elements': {
                'structure': 'linked_list',
                'direction': 'singly' if 'doubly' not in text_lower else 'doubly',
                'has_head': 'head' in text_lower,
                'has_tail': 'tail' in text_lower
            },
            'key_terms': extract_terms(text_lower, ['node', 'pointer', 'next', 'head', 'tail', 'linked'])
        }
    
    if any(term in text_lower for term in ['binary tree', 'tree', 'node', 'leaf', 'root', 'parent', 'child']):
        return {
            'content_type': 'tree',
            'needs_animation': True,
            'visual_elements': {
                'structure': 'tree',
                'type': 'binary' if 'binary' in text_lower else 'general',
                'has_root': 'root' in text_lower
            },
            'key_terms': extract_terms(text_lower, ['tree', 'node', 'root', 'leaf', 'parent', 'child'])
        }
    
    if any(term in text_lower for term in ['stack', 'lifo', 'push', 'pop', 'top']):
        return {
            'content_type': 'stack',
            'needs_animation': True,
            'visual_elements': {
                'structure': 'stack',
                'operations': extract_operations(text_lower, ['push', 'pop', 'peek', 'top'])
            },
            'key_terms': extract_terms(text_lower, ['stack', 'push', 'pop', 'lifo'])
        }
    
    if any(term in text_lower for term in ['queue', 'fifo', 'enqueue', 'dequeue', 'front', 'rear']):
        return {
            'content_type': 'queue',
            'needs_animation': True,
            'visual_elements': {
                'structure': 'queue',
                'operations': extract_operations(text_lower, ['enqueue', 'dequeue', 'front', 'rear'])
            },
            'key_terms': extract_terms(text_lower, ['queue', 'enqueue', 'dequeue', 'fifo'])
        }
    
    if any(term in text_lower for term in ['array', 'arraylist', 'index', 'element at']):
        return {
            'content_type': 'array',
            'needs_animation': True,
            'visual_elements': {
                'structure': 'array',
                'has_indices': 'index' in text_lower
            },
            'key_terms': extract_terms(text_lower, ['array', 'index', 'element'])
        }
    
    if any(term in text_lower for term in ['dualarraydeque', 'dual array deque', 'front', 'back']):
        return {
            'content_type': 'dual_array_deque',
            'needs_animation': True,
            'visual_elements': {
                'structure': 'dual_array_deque',
                'has_front': 'front' in text_lower,
                'has_back': 'back' in text_lower
            },
            'key_terms': extract_terms(text_lower, ['dualarraydeque', 'front', 'back', 'stack'])
        }
    
    # Algorithms
    if any(term in text_lower for term in ['sort', 'sorting', 'bubble', 'quick', 'merge', 'insertion']):
        return {
            'content_type': 'algorithm',
            'needs_animation': True,
            'visual_elements': {
                'algorithm_type': 'sorting',
                'algorithm_name': detect_algorithm_name(text_lower)
            },
            'key_terms': extract_terms(text_lower, ['sort', 'algorithm', 'compare', 'swap'])
        }
    
    if any(term in text_lower for term in ['search', 'binary search', 'linear search', 'find']):
        return {
            'content_type': 'algorithm',
            'needs_animation': True,
            'visual_elements': {
                'algorithm_type': 'searching',
                'algorithm_name': detect_algorithm_name(text_lower)
            },
            'key_terms': extract_terms(text_lower, ['search', 'find', 'binary', 'linear'])
        }
    
    # Diagrams/Flowcharts
    if any(term in text_lower for term in ['process', 'flow', 'steps', 'sequence', 'workflow', 'algorithm']):
        return {
            'content_type': 'diagram',
            'needs_animation': True,
            'visual_elements': {
                'diagram_type': 'flowchart',
                'has_steps': 'step' in text_lower
            },
            'key_terms': extract_terms(text_lower, ['process', 'step', 'flow', 'sequence'])
        }
    
    # Charts/Graphs
    if any(term in text_lower for term in ['compare', 'versus', 'statistics', 'data', 'percentage', 'increase', 'decrease']):
        return {
            'content_type': 'chart',
            'needs_animation': True,
            'visual_elements': {
                'chart_type': 'bar' if 'compare' in text_lower else 'line',
                'has_numbers': bool(re.search(r'\d+', narration_text))
            },
            'key_terms': extract_terms(text_lower, ['compare', 'data', 'statistics'])
        }
    
    # Text-only (definitions, explanations without structures)
    if len(narration_text.split()) < 30 and not any(term in text_lower for term in 
        ['structure', 'algorithm', 'data', 'node', 'element', 'operation']):
        return {
            'content_type': 'text_only',
            'needs_animation': False,
            'visual_elements': {
                'display_mode': 'text_focused',
                'has_bullets': '•' in narration_text or narration_text.count('\n') > 0
            },
            'key_terms': []
        }
    
    # Default: concept/explanation
    return {
        'content_type': 'concept',
        'needs_animation': False,
        'visual_elements': {
            'display_mode': 'concept_map',
            'has_examples': 'example' in text_lower or 'for instance' in text_lower
        },
        'key_terms': extract_terms(text_lower, narration_text.split()[:10])
    }


def extract_terms(text: str, keywords: List[str]) -> List[str]:
    """Extract relevant terms from text."""
    found = []
    for keyword in keywords:
        if keyword in text:
            found.append(keyword)
    return found


def extract_operations(text: str, operations: List[str]) -> List[str]:
    """Extract mentioned operations."""
    found = []
    for op in operations:
        if op in text:
            found.append(op)
    return found


def detect_algorithm_name(text: str) -> Optional[str]:
    """Detect specific algorithm name."""
    algorithms = {
        'bubble sort': 'bubble_sort',
        'quick sort': 'quick_sort',
        'merge sort': 'merge_sort',
        'insertion sort': 'insertion_sort',
        'binary search': 'binary_search',
        'linear search': 'linear_search'
    }
    
    for name, key in algorithms.items():
        if name in text:
            return key
    
    return None


def get_visual_complexity(narration_text: str) -> str:
    """Determine visual complexity needed."""
    word_count = len(narration_text.split())
    
    if word_count < 20:
        return 'simple'
    elif word_count < 50:
        return 'medium'
    else:
        return 'complex'

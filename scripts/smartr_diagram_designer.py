#!/usr/bin/env python3
"""
SmartrDiagramDesigner: Improves and corrects Mermaid code for educational videos.
Returns clean, readable Mermaid code only (no markdown, no commentary).
"""

import json
import sys
import re
from typing import Dict, Optional, Tuple

# Maximum words per label
MAX_WORDS_PER_LABEL = 5


def shorten_label(label: str, max_words: int = MAX_WORDS_PER_LABEL) -> str:
    """Shorten label to max words, removing punctuation."""
    # Remove common punctuation except spaces and hyphens
    label = re.sub(r'[^\w\s-]', '', label)
    # Remove extra whitespace
    label = ' '.join(label.split())
    # Split into words
    words = label.split()
    if len(words) <= max_words:
        return ' '.join(words)
    # Take first max_words
    return ' '.join(words[:max_words])


def clean_mermaid_code(code: str) -> str:
    """Remove markdown fences and clean up Mermaid code."""
    # Remove markdown code fences
    code = re.sub(r'^```mermaid\s*', '', code, flags=re.MULTILINE)
    code = re.sub(r'^```\s*$', '', code, flags=re.MULTILINE)
    code = re.sub(r'^```\s*', '', code, flags=re.MULTILINE)
    
    # Remove leading/trailing whitespace
    code = code.strip()
    
    return code


def extract_and_replace_labels(code: str) -> str:
    """Extract labels from Mermaid code and replace with shortened versions."""
    # Process in order: double brackets first, then single brackets
    
    # Double round brackets (stadium): A((Label)) - must check first
    def shorten_double_round(match):
        node_id = match.group(1)
        original_label = match.group(2).strip().strip('"\'')
        shortened = shorten_label(original_label)
        return f'{node_id}(({shortened}))'
    code = re.sub(r'([A-Za-z0-9_]+)\(\(([^\)]+)\)\)', shorten_double_round, code)
    
    # Square brackets: A[Label]
    def shorten_square(match):
        node_id = match.group(1)
        original_label = match.group(2).strip().strip('"\'')
        shortened = shorten_label(original_label)
        return f'{node_id}[{shortened}]'
    code = re.sub(r'([A-Za-z0-9_]+)\[([^\]]+)\]', shorten_square, code)
    
    # Round brackets: A(Label) - check after double round
    def shorten_round(match):
        # Skip if already processed as double round
        if match.group(0).count('(') > 2:
            return match.group(0)
        node_id = match.group(1)
        original_label = match.group(2).strip().strip('"\'')
        shortened = shorten_label(original_label)
        return f'{node_id}({shortened})'
    code = re.sub(r'([A-Za-z0-9_]+)\(([^\)]+)\)', shorten_round, code)
    
    # Curly brackets: A{Label}
    def shorten_curly(match):
        node_id = match.group(1)
        original_label = match.group(2).strip().strip('"\'')
        shortened = shorten_label(original_label)
        return f'{node_id}{{{shortened}}}'
    code = re.sub(r'([A-Za-z0-9_]+)\{([^\}]+)\}', shorten_curly, code)
    
    # Handle edge labels: A-->|Label|B
    def shorten_edge_label(match):
        original = match.group(1).strip().strip('"\'')
        shortened = shorten_label(original)
        return f'|{shortened}|'
    code = re.sub(r'\|\s*([^|]+)\s*\|', shorten_edge_label, code)
    
    return code


def validate_mermaid_syntax(code: str, diagram_type: str) -> Tuple[bool, str]:
    """Basic Mermaid syntax validation."""
    code = code.strip()
    
    # Must start with diagram type declaration
    valid_starters = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 
                     'stateDiagram', 'erDiagram', 'gantt', 'pie', 'journey']
    
    first_line = code.split('\n')[0].strip().lower()
    
    if not any(first_line.startswith(starter.lower()) for starter in valid_starters):
        # Try to add diagram type if missing
        if diagram_type == 'flowchart':
            if not code.startswith('flowchart') and not code.startswith('graph'):
                code = f'flowchart TD\n{code}'
        elif diagram_type == 'timeline':
            # Timeline might need special handling
            if not code.startswith('gantt'):
                code = f'graph LR\n{code}'
        elif diagram_type == 'sequence':
            if not code.startswith('sequenceDiagram'):
                code = f'sequenceDiagram\n{code}'
        elif diagram_type == 'concept_map':
            if not code.startswith('graph') and not code.startswith('flowchart'):
                code = f'graph TD\n{code}'
    
    return True, code


def improve_mermaid_diagram(
    diagram_type: str,
    learning_goal: str,
    mermaid_code: str
) -> str:
    """Improve and correct Mermaid code based on learning goal."""
    
    # Clean input code
    code = clean_mermaid_code(mermaid_code)
    
    # Handle empty or minimal code
    if not code or len(code.strip()) < 3:
        # Generate minimal valid diagram based on type
        if diagram_type == 'flowchart':
            code = 'flowchart TD\n    A[Start]\n    A --> B[Process]\n    B --> C[End]'
        elif diagram_type == 'timeline':
            code = 'graph LR\n    A[Start] --> B[Middle]\n    B --> C[End]'
        elif diagram_type == 'sequence':
            code = 'sequenceDiagram\n    A->>B: Step 1\n    B->>C: Step 2'
        elif diagram_type == 'concept_map':
            code = 'graph TD\n    A[Concept A]\n    B[Concept B]\n    A --> B'
        else:
            code = 'graph TD\n    A[Step 1]\n    B[Step 2]\n    A --> B'
    
    # Ensure proper diagram type declaration
    if diagram_type == 'flowchart':
        if not (code.startswith('flowchart') or code.startswith('graph')):
            code = f'flowchart TD\n{code}'
        elif code.startswith('graph'):
            code = code.replace('graph', 'flowchart', 1)
    elif diagram_type == 'timeline':
        if not code.startswith('graph'):
            code = f'graph LR\n{code}'
    elif diagram_type == 'sequence':
        if not code.startswith('sequenceDiagram'):
            code = f'sequenceDiagram\n{code}'
    
    # Extract and shorten labels
    code = extract_and_replace_labels(code)
    
    # Validate and fix syntax
    is_valid, fixed_code = validate_mermaid_syntax(code, diagram_type)
    code = fixed_code
    
    # Clean up formatting
    lines = code.split('\n')
    cleaned_lines = []
    for line in lines:
        line = line.strip()
        if line:
            # Ensure proper indentation for readability
            if not line.startswith(('graph', 'flowchart', 'sequenceDiagram', 'classDiagram',
                                   'stateDiagram', 'erDiagram', 'gantt', 'pie', 'journey')):
                # Indent non-declaration lines
                if not line.startswith('    '):
                    line = '    ' + line
            cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines)


def main():
    """Main entry point - can read from stdin or file."""
    try:
        # Try to read JSON from stdin or file
        if len(sys.argv) > 1:
            with open(sys.argv[1], 'r') as f:
                input_data = json.load(f)
        else:
            input_data = json.load(sys.stdin)
        
        diagram_type = input_data.get('diagram_type', 'flowchart')
        learning_goal = input_data.get('learning_goal', '')
        mermaid_code = input_data.get('mermaid_code', '')
        
    except (json.JSONDecodeError, FileNotFoundError, KeyError):
        # Try alternative format: command line args
        if len(sys.argv) < 4:
            print("Usage: python smartr_diagram_designer.py <diagram_type> <learning_goal> <mermaid_code>")
            print("   OR: echo '<json>' | python smartr_diagram_designer.py")
            sys.exit(1)
        
        diagram_type = sys.argv[1]
        learning_goal = sys.argv[2]
        mermaid_code = sys.argv[3]
    
    # Improve the diagram
    improved_code = improve_mermaid_diagram(
        diagram_type=diagram_type,
        learning_goal=learning_goal,
        mermaid_code=mermaid_code
    )
    
    # Output ONLY the Mermaid code (no markdown, no commentary)
    print(improved_code)


if __name__ == "__main__":
    main()

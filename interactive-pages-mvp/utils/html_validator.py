"""
HTML validator for security and constraints.
Matches the JavaScript validation logic exactly.
"""
from typing import Dict, List


def validate_html(html_content: str) -> Dict:
    """
    Validate HTML content against security and size constraints.
    Matches JavaScript validation logic exactly.
    
    Returns:
    {
        "valid": bool,
        "errors": List[str],
        "size_kb": float,
        "size_mb": float
    }
    """
    errors = []
    
    # Check if HTML is too short/empty
    if not html_content or len(html_content) < 2000:
        errors.append("HTML too short / empty")
        return {
            "valid": False,
            "errors": errors,
            "size_kb": 0,
            "size_mb": 0
        }
    
    # Check size (1.5 MB limit)
    size_bytes = len(html_content.encode('utf-8'))
    size_kb = size_bytes / 1024
    size_mb = size_bytes / (1024 * 1024)
    
    if size_mb > 1.5:
        errors.append("HTML too large")
    
    # Banned patterns (exact match from JavaScript)
    banned = [
        "<script src",
        "fetch(",
        "XMLHttpRequest",
        "navigator.sendBeacon",
        "window.location=",
        "eval(",
        "Function("
    ]
    
    html_lower = html_content.lower()
    for pattern in banned:
        if pattern.lower() in html_lower:
            errors.append(f"HTML contains banned pattern: {pattern}")
    
    # Check for <html> wrapper
    if "<html" not in html_lower or "</html>" not in html_lower:
        errors.append("HTML missing <html> wrapper")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "size_kb": size_kb,
        "size_mb": size_mb
    }

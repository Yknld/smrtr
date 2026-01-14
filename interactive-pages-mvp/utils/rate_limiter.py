"""
Simple in-memory rate limiter for MVP.
"""
from collections import defaultdict
from time import time


class RateLimiter:
    """Rate limiter using token bucket algorithm."""
    
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)
    
    def allow(self, user_id: str) -> bool:
        """Check if request is allowed for user."""
        now = time()
        user_requests = self.requests[user_id]
        
        # Remove old requests outside window
        user_requests[:] = [req_time for req_time in user_requests 
                           if now - req_time < self.window_seconds]
        
        # Check limit
        if len(user_requests) >= self.max_requests:
            return False
        
        # Add current request
        user_requests.append(now)
        return True
    
    def reset(self, user_id: str):
        """Reset rate limit for user (for testing)."""
        if user_id in self.requests:
            del self.requests[user_id]

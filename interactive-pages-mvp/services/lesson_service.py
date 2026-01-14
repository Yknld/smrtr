"""
Service for fetching lesson data (mock for MVP).
In production, this would connect to your actual lesson database.
"""
import logging

logger = logging.getLogger(__name__)


class LessonService:
    """Service for fetching lesson content."""
    
    def __init__(self):
        # In production, initialize database connection here
        pass
    
    def get_lesson(self, lesson_id: str) -> dict:
        """
        Fetch lesson data by ID.
        
        Returns:
        {
            "id": str,
            "title": str,
            "summary": str,
            "transcript": str
        }
        
        Raises:
            ValueError: If lesson not found
        """
        # MVP: Mock data - replace with actual database query
        # In production, this would be something like:
        # return db.query("SELECT * FROM lessons WHERE id = ?", lesson_id)
        
        logger.info(f"Fetching lesson: {lesson_id}")
        
        # Mock lesson data for testing
        mock_lessons = {
            "lesson_1": {
                "id": "lesson_1",
                "title": "Introduction to Data Structures",
                "summary": "Learn about arrays, linked lists, stacks, and queues",
                "transcript": "Data structures are ways of organizing data in computer memory. Arrays store elements in contiguous memory locations, while linked lists use pointers to connect nodes. Stacks follow LIFO (Last In, First Out) principle, and queues follow FIFO (First In, First Out)."
            }
        }
        
        if lesson_id in mock_lessons:
            return mock_lessons[lesson_id]
        
        # If not found in mock, raise error
        raise ValueError(f"Lesson not found: {lesson_id}")

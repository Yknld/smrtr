"""
Simple metadata storage (MVP: local JSON file).
"""
import json
import os
from pathlib import Path
from typing import Dict, Optional


class MetadataStore:
    """Simple file-based metadata store for MVP."""
    
    def __init__(self, storage_path: str = "generated/metadata.json"):
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_file()
    
    def _ensure_file(self):
        """Ensure metadata file exists."""
        if not self.storage_path.exists():
            with open(self.storage_path, 'w') as f:
                json.dump({}, f)
    
    def save(self, job_id: str, metadata: Dict):
        """Save metadata for a job."""
        data = self._load()
        data[job_id] = metadata
        self._save(data)
    
    def get(self, job_id: str) -> Optional[Dict]:
        """Get metadata for a job."""
        data = self._load()
        return data.get(job_id)
    
    def _load(self) -> Dict:
        """Load all metadata."""
        try:
            with open(self.storage_path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}
    
    def _save(self, data: Dict):
        """Save all metadata."""
        with open(self.storage_path, 'w') as f:
            json.dump(data, f, indent=2)

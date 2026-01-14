"""
GitHub service for publishing HTML files.
"""
import base64
import logging
import requests
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class GitHubService:
    """Service for publishing HTML to GitHub (repo or Gist)."""
    
    def __init__(self, token: str, pages_repo: Optional[str] = None, 
                 owner: Optional[str] = None, branch: str = "main"):
        if not token:
            raise ValueError("GITHUB_TOKEN is required")
        self.token = token
        self.pages_repo = pages_repo
        self.owner = owner
        self.branch = branch
        self.headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json"
        }
    
    def publish_html(self, html_content: str, generation_id: str, title: str) -> Dict:
        """
        Publish HTML to GitHub (Pages repo folder or Gist).
        
        Args:
            html_content: HTML content to publish
            generation_id: Unique generation ID
            title: Page title
            
        Returns:
        {
            "preview_url": str,
            "source_url": str
        }
        """
        if self.pages_repo:
            return self._publish_to_pages(html_content, generation_id, title)
        else:
            return self._publish_to_gist(html_content, generation_id, title)
    
    def _publish_to_pages(self, html_content: str, generation_id: str, title: str) -> Dict:
        """Publish to GitHub Pages repo folder: /pages/<generation_id>/index.html"""
        # Create folder structure: pages/{generation_id}/index.html
        path = f"pages/{generation_id}/index.html"
        
        # Encode content
        content_bytes = html_content.encode('utf-8')
        content_b64 = base64.b64encode(content_bytes).decode('utf-8')
        
        # Check if file exists
        check_url = f"https://api.github.com/repos/{self.pages_repo}/contents/{path}"
        check_response = requests.get(check_url, headers=self.headers)
        
        sha = None
        if check_response.status_code == 200:
            sha = check_response.json().get("sha")
        
        # Create or update file
        payload = {
            "message": f"Add interactive page: {title}",
            "content": content_b64,
            "branch": self.branch
        }
        if sha:
            payload["sha"] = sha
        
        logger.info(f"Publishing to GitHub Pages: {path}")
        response = requests.put(check_url, json=payload, headers=self.headers)
        response.raise_for_status()
        
        # Generate URLs
        # GitHub Pages URL: https://{owner}.github.io/{repo}/pages/{generation_id}/
        repo_parts = self.pages_repo.split("/")
        org = repo_parts[0] if len(repo_parts) > 0 else self.owner
        repo_name = repo_parts[1] if len(repo_parts) > 1 else self.pages_repo
        
        preview_url = f"https://{org}.github.io/{repo_name}/pages/{generation_id}/"
        source_url = f"https://github.com/{self.pages_repo}/blob/{self.branch}/pages/{generation_id}/index.html"
        
        logger.info(f"Published successfully. Preview: {preview_url}")
        return {
            "preview_url": preview_url,
            "source_url": source_url
        }
    
    def _publish_to_gist(self, html_content: str, generation_id: str, title: str) -> Dict:
        """Publish to GitHub Gist (fallback if no Pages repo)."""
        payload = {
            "description": f"Interactive Page: {title}",
            "public": True,
            "files": {
                "index.html": {
                    "content": html_content
                }
            }
        }
        
        logger.info(f"Publishing to GitHub Gist: {title}")
        response = requests.post(
            "https://api.github.com/gists",
            json=payload,
            headers=self.headers
        )
        response.raise_for_status()
        
        gist_data = response.json()
        gist_id = gist_data["id"]
        gist_url = gist_data["html_url"]
        
        # Gist preview URL (raw HTML) - use as both preview and source for MVP
        raw_url = f"https://gist.githubusercontent.com/{gist_data['owner']['login']}/{gist_id}/raw/index.html"
        
        logger.info(f"Published to Gist. Preview: {raw_url}")
        return {
            "preview_url": raw_url,  # MVP: same as source
            "source_url": gist_url
        }

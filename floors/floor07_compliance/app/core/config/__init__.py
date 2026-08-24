"""Re-export the get_settings function so callers can do:
    from app.core.config import get_settings
"""

from app.core.config.settings import Settings, get_settings

__all__ = ["Settings", "get_settings"]

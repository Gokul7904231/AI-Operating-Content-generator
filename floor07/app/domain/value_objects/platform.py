"""Value objects: Platform and ContentType."""

from __future__ import annotations

from enum import StrEnum


class Platform(StrEnum):
    """Supported distribution platforms."""

    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    FACEBOOK = "facebook"
    X_TWITTER = "x_twitter"
    DEFAULT = "default"


class ContentType(StrEnum):
    """Type of content being certified."""

    EDUCATIONAL_SHORT = "educational_short"
    TUTORIAL = "tutorial"
    QUIZ = "quiz"
    EXPLAINER = "explainer"
    DOCUMENTARY = "documentary"
    OTHER = "other"

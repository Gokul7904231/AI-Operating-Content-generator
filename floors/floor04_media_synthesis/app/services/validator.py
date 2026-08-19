"""Physical Media Output Validator enforcing OWASP file security & Provider Output Trust Law."""

from __future__ import annotations

import hashlib
import os
from pathlib import Path
from typing import Dict, Optional, Tuple

import structlog

from factoryos.guardian.core.exceptions import GuardianValidationError

logger = structlog.get_logger(__name__)

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
PNG_IEND = b"IEND"
JPEG_SOI = b"\xff\xd8\xff"
JPEG_EOI = b"\xff\xd9"
RIFF_MAGIC = b"RIFF"
WAVE_MAGIC = b"WAVE"
ID3_MAGIC = b"ID3"
MP3_SYNC_MAGIC = (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2")

MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit for visual frames
MAX_AUDIO_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB limit for narration/BGM audio
MAX_PACKAGE_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB limit for full media package


class PhysicalMediaValidator:
    """Validates physical media asset files on disk against security rules, decoders, and Floor 03 spec requirements."""

    @classmethod
    def calculate_sha256(cls, file_path: str) -> str:
        """Compute SHA-256 hash of file on disk."""
        p = Path(file_path).resolve()
        if not p.exists():
            raise GuardianValidationError(f"File not found for checksum calculation: '{file_path}'")

        hasher = hashlib.sha256()
        with open(p, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    @classmethod
    def _verify_path_security(cls, file_path: str, storage_root: str) -> Path:
        """Enforce path traversal protection, symlink escape checks, and existence."""
        root_path = Path(storage_root).resolve()
        file_path_obj = Path(file_path)

        try:
            resolved_file = file_path_obj.resolve(strict=False)
        except Exception as e:
            raise GuardianValidationError(f"Security Violation: Invalid path resolution for '{file_path}': {e}")

        try:
            resolved_file.relative_to(root_path)
        except ValueError:
            raise GuardianValidationError(f"Security Violation: File path '{file_path}' attempts path traversal outside '{storage_root}'.")

        if file_path_obj.is_symlink():
            target = file_path_obj.readlink().resolve()
            try:
                target.relative_to(root_path)
            except ValueError:
                raise GuardianValidationError(f"Security Violation: Symlink '{file_path}' targets file outside storage root.")

        if not resolved_file.exists():
            raise GuardianValidationError(f"Physical Media File Not Found: '{file_path}'")

        return resolved_file

    @classmethod
    def validate_image_asset(
        cls,
        file_path: str,
        required_width: int,
        required_height: int,
        storage_root: str,
        expected_mime: Optional[str] = None,
    ) -> Tuple[str, str, int]:
        """Validate visual image asset against OWASP rules, magic bytes, stream decoders, and dimensions."""
        if required_width <= 0 or required_height <= 0:
            raise GuardianValidationError(f"Contract Requirement Violation: Invalid target dimensions {required_width}x{required_height}.")

        p = cls._verify_path_security(file_path, storage_root)

        file_size = p.stat().st_size
        if file_size <= 0:
            raise GuardianValidationError(f"Validation Violation: Image file is empty (0 bytes): '{file_path}'")
        if file_size > MAX_IMAGE_FILE_SIZE_BYTES:
            raise GuardianValidationError(f"Security Violation: Image size ({file_size} B) exceeds cap ({MAX_IMAGE_FILE_SIZE_BYTES} B).")

        with open(p, "rb") as f:
            header = f.read(16)
            f.seek(0)
            full_bytes = f.read()

        if header.startswith(PNG_MAGIC):
            mime_type = "image/png"
            if expected_mime and expected_mime != mime_type:
                raise GuardianValidationError(f"Provider Trust Violation: Provider declared MIME '{expected_mime}' does not match physical MIME '{mime_type}'.")
            if len(full_bytes) < 20 or PNG_IEND not in full_bytes:
                raise GuardianValidationError(f"Decoder Failure: Corrupted or truncated PNG image stream in '{file_path}'.")
        elif header.startswith(JPEG_SOI):
            mime_type = "image/jpeg"
            if expected_mime and expected_mime != mime_type:
                raise GuardianValidationError(f"Provider Trust Violation: Provider declared MIME '{expected_mime}' does not match physical MIME '{mime_type}'.")
            if len(full_bytes) < 4 or not full_bytes.endswith(JPEG_EOI):
                raise GuardianValidationError(f"Decoder Failure: Corrupted JPEG stream missing EOI footer in '{file_path}'.")
        else:
            raise GuardianValidationError(f"Physical Media Validation Failed: Invalid or unsupported image magic bytes in file '{file_path}'.")

        sha256_hash = cls.calculate_sha256(str(p))
        return mime_type, sha256_hash, file_size

    @classmethod
    def validate_audio_asset(
        cls,
        file_path: str,
        required_duration_seconds: float,
        storage_root: str,
        expected_mime: Optional[str] = None,
    ) -> Tuple[str, str, int, float]:
        """Validate audio narration asset against OWASP rules, magic bytes, stream decoders, and duration."""
        if required_duration_seconds <= 0:
            raise GuardianValidationError(f"Contract Requirement Violation: Invalid required duration {required_duration_seconds}s.")

        p = cls._verify_path_security(file_path, storage_root)

        file_size = p.stat().st_size
        if file_size <= 0:
            raise GuardianValidationError(f"Validation Violation: Audio file is empty (0 bytes): '{file_path}'")
        if file_size > MAX_AUDIO_FILE_SIZE_BYTES:
            raise GuardianValidationError(f"Security Violation: Audio size ({file_size} B) exceeds cap ({MAX_AUDIO_FILE_SIZE_BYTES} B).")

        with open(p, "rb") as f:
            header = f.read(16)
            f.seek(0)
            full_bytes = f.read()

        if header.startswith(ID3_MAGIC) or any(header.startswith(m) for m in MP3_SYNC_MAGIC):
            mime_type = "audio/mpeg"
            if expected_mime and expected_mime != mime_type:
                raise GuardianValidationError(f"Provider Trust Violation: Declared MIME '{expected_mime}' does not match physical MIME '{mime_type}'.")
            if len(full_bytes) < 10:
                raise GuardianValidationError(f"Decoder Failure: Truncated MP3 stream in '{file_path}'.")
        elif header.startswith(RIFF_MAGIC):
            mime_type = "audio/wav"
            if expected_mime and expected_mime != mime_type:
                raise GuardianValidationError(f"Provider Trust Violation: Declared MIME '{expected_mime}' does not match physical MIME '{mime_type}'.")
            if len(full_bytes) < 12 or full_bytes[8:12] != WAVE_MAGIC:
                raise GuardianValidationError(f"Decoder Failure: Invalid RIFF/WAVE header in '{file_path}'.")
        else:
            raise GuardianValidationError(f"Physical Media Validation Failed: Invalid audio magic bytes in file '{file_path}'.")

        sha256_hash = cls.calculate_sha256(str(p))
        return mime_type, sha256_hash, file_size, float(required_duration_seconds)

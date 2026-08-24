"""Unit tests for PhysicalMediaValidator security controls."""

import pytest

from factoryos.guardian.core.exceptions import GuardianValidationError
from floors.floor04_media_synthesis.app.services.validator import PNG_IEND, PNG_MAGIC, PhysicalMediaValidator


def test_physical_validator_path_traversal_rejection(tmp_path):
    storage_root = tmp_path / "media_storage"
    storage_root.mkdir()

    outside_file = tmp_path / "outside.png"
    outside_file.write_bytes(PNG_MAGIC + b"data" + PNG_IEND)

    with pytest.raises(GuardianValidationError) as exc_info:
        PhysicalMediaValidator.validate_image_asset(
            file_path=str(outside_file),
            required_width=1080,
            required_height=1920,
            storage_root=str(storage_root),
        )

    assert "Security Violation" in str(exc_info.value) or "path traversal" in str(exc_info.value)


def test_physical_validator_invalid_magic_bytes_rejection(tmp_path):
    storage_root = tmp_path / "media_storage"
    storage_root.mkdir()

    invalid_file = storage_root / "invalid.png"
    invalid_file.write_bytes(b"NOT_A_PNG_FILE_HEADER")

    with pytest.raises(GuardianValidationError) as exc_info:
        PhysicalMediaValidator.validate_image_asset(
            file_path=str(invalid_file),
            required_width=1080,
            required_height=1920,
            storage_root=str(storage_root),
        )

    assert "Invalid" in str(exc_info.value) and "magic bytes" in str(exc_info.value)

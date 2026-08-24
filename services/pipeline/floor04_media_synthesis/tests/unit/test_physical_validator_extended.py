"""Extensive unit tests for PhysicalMediaValidator (OWASP Security & File Integrity)."""

import os
from pathlib import Path
import pytest

from factoryos.guardian.core.exceptions import GuardianValidationError
from floors.floor04_media_synthesis.app.services.validator import (
    JPEG_EOI,
    JPEG_SOI,
    MAX_AUDIO_FILE_SIZE_BYTES,
    MAX_IMAGE_FILE_SIZE_BYTES,
    PNG_IEND,
    PNG_MAGIC,
    RIFF_MAGIC,
    WAVE_MAGIC,
    PhysicalMediaValidator,
)


@pytest.fixture
def storage_setup(tmp_path):
    root = tmp_path / "media_storage"
    root.mkdir()
    return root


def test_valid_png_validation(storage_setup):
    png_file = storage_setup / "test.png"
    data = PNG_MAGIC + b"\x00\x00\x00\x0dIHDR\x00\x00\x04\x38" + PNG_IEND
    png_file.write_bytes(data)

    mime, sha, size = PhysicalMediaValidator.validate_image_asset(
        file_path=str(png_file),
        required_width=1080,
        required_height=1920,
        storage_root=str(storage_setup),
    )

    assert mime == "image/png"
    assert len(sha) == 64
    assert size == len(data)


def test_image_size_exact_boundary_pass(storage_setup):
    """File size exactly at limit cap passes validation."""
    exact_file = storage_setup / "exact_limit.png"
    with open(exact_file, "wb") as f:
        f.write(PNG_MAGIC)
        f.seek(MAX_IMAGE_FILE_SIZE_BYTES - len(PNG_IEND))
        f.write(PNG_IEND)

    mime, sha, size = PhysicalMediaValidator.validate_image_asset(
        file_path=str(exact_file), required_width=1080, required_height=1920, storage_root=str(storage_setup)
    )
    assert size == MAX_IMAGE_FILE_SIZE_BYTES


def test_image_size_boundary_plus_one_rejection(storage_setup):
    """File size exactly at limit cap + 1 byte fails validation."""
    over_file = storage_setup / "over_limit.png"
    with open(over_file, "wb") as f:
        f.write(PNG_MAGIC)
        f.seek(MAX_IMAGE_FILE_SIZE_BYTES + 1 - len(PNG_IEND))
        f.write(PNG_IEND)

    with pytest.raises(GuardianValidationError) as exc:
        PhysicalMediaValidator.validate_image_asset(
            file_path=str(over_file), required_width=1080, required_height=1920, storage_root=str(storage_setup)
        )
    assert "exceeds cap" in str(exc.value)


def test_audio_size_exact_boundary_pass(storage_setup):
    """Audio file size exactly at limit cap passes validation."""
    exact_audio = storage_setup / "exact_audio.mp3"
    with open(exact_audio, "wb") as f:
        f.write(b"ID3\x04\x00\x00\x00\x00\x00\x00")
        f.seek(MAX_AUDIO_FILE_SIZE_BYTES - 1)
        f.write(b"\x00")

    mime, sha, size, dur = PhysicalMediaValidator.validate_audio_asset(
        file_path=str(exact_audio), required_duration_seconds=5.0, storage_root=str(storage_setup)
    )
    assert size == MAX_AUDIO_FILE_SIZE_BYTES


def test_audio_size_boundary_plus_one_rejection(storage_setup):
    """Audio file size exactly at limit cap + 1 byte fails validation."""
    over_audio = storage_setup / "over_audio.mp3"
    with open(over_audio, "wb") as f:
        f.write(b"ID3\x04\x00\x00\x00\x00\x00\x00")
        f.seek(MAX_AUDIO_FILE_SIZE_BYTES + 1 - 1)
        f.write(b"\x00")

    with pytest.raises(GuardianValidationError) as exc:
        PhysicalMediaValidator.validate_audio_asset(
            file_path=str(over_audio), required_duration_seconds=5.0, storage_root=str(storage_setup)
        )
    assert "exceeds cap" in str(exc.value)


def test_corrupted_png_header_rejection(storage_setup):
    bad_png = storage_setup / "bad.png"
    bad_png.write_bytes(b"NOT_PNG_HEADER_BYTES")

    with pytest.raises(GuardianValidationError) as exc:
        PhysicalMediaValidator.validate_image_asset(
            file_path=str(bad_png), required_width=1080, required_height=1920, storage_root=str(storage_setup)
        )
    assert "Invalid or unsupported image magic bytes" in str(exc.value)


def test_truncated_png_missing_iend_rejection(storage_setup):
    trunc_png = storage_setup / "trunc.png"
    trunc_png.write_bytes(PNG_MAGIC + b"incomplete_data")

    with pytest.raises(GuardianValidationError) as exc:
        PhysicalMediaValidator.validate_image_asset(
            file_path=str(trunc_png), required_width=1080, required_height=1920, storage_root=str(storage_setup)
        )
    assert "Decoder Failure" in str(exc.value)


def test_spoofed_extension_rejection(storage_setup):
    spoofed = storage_setup / "spoofed.png"
    spoofed.write_text("Hello World TXT Content", encoding="utf-8")

    with pytest.raises(GuardianValidationError) as exc:
        PhysicalMediaValidator.validate_image_asset(
            file_path=str(spoofed), required_width=1080, required_height=1920, storage_root=str(storage_setup)
        )
    assert "Invalid or unsupported image magic bytes" in str(exc.value)


def test_valid_jpeg_validation(storage_setup):
    jpg_file = storage_setup / "test.jpg"
    data = JPEG_SOI + b"jpeg_payload_data" + JPEG_EOI
    jpg_file.write_bytes(data)

    mime, sha, size = PhysicalMediaValidator.validate_image_asset(
        file_path=str(jpg_file), required_width=1080, required_height=1920, storage_root=str(storage_setup)
    )
    assert mime == "image/jpeg"


def test_jpeg_missing_eoi_footer_rejection(storage_setup):
    bad_jpg = storage_setup / "no_eoi.jpg"
    bad_jpg.write_bytes(JPEG_SOI + b"payload_without_footer")

    with pytest.raises(GuardianValidationError) as exc:
        PhysicalMediaValidator.validate_image_asset(
            file_path=str(bad_jpg), required_width=1080, required_height=1920, storage_root=str(storage_setup)
        )
    assert "missing EOI footer" in str(exc.value)


def test_valid_mp3_validation(storage_setup):
    mp3_file = storage_setup / "test.mp3"
    data = b"ID3\x04\x00\x00\x00\x00\x00\x00Valid MP3 Payload Stream Data"
    mp3_file.write_bytes(data)

    mime, sha, size, dur = PhysicalMediaValidator.validate_audio_asset(
        file_path=str(mp3_file), required_duration_seconds=5.0, storage_root=str(storage_setup)
    )
    assert mime == "audio/mpeg"
    assert dur == 5.0


def test_truncated_mp3_rejection(storage_setup):
    trunc_mp3 = storage_setup / "short.mp3"
    trunc_mp3.write_bytes(b"ID3\x00")

    with pytest.raises(GuardianValidationError) as exc:
        PhysicalMediaValidator.validate_audio_asset(
            file_path=str(trunc_mp3), required_duration_seconds=5.0, storage_root=str(storage_setup)
        )
    assert "Truncated MP3 stream" in str(exc.value)


def test_valid_wav_validation(storage_setup):
    wav_file = storage_setup / "test.wav"
    data = RIFF_MAGIC + b"\x00\x00\x00\x00" + WAVE_MAGIC + b"fmt \x10\x00\x00\x00"
    wav_file.write_bytes(data)

    mime, sha, size, dur = PhysicalMediaValidator.validate_audio_asset(
        file_path=str(wav_file), required_duration_seconds=10.0, storage_root=str(storage_setup)
    )
    assert mime == "audio/wav"


def test_corrupted_wav_missing_wave_rejection(storage_setup):
    bad_wav = storage_setup / "bad.wav"
    bad_wav.write_bytes(RIFF_MAGIC + b"\x00\x00\x00\x00" + b"FAIL_HEADER_DATA")

    with pytest.raises(GuardianValidationError) as exc:
        PhysicalMediaValidator.validate_audio_asset(
            file_path=str(bad_wav), required_duration_seconds=5.0, storage_root=str(storage_setup)
        )
    assert "Invalid RIFF/WAVE header" in str(exc.value)


def test_path_traversal_escape_rejection(storage_setup, tmp_path):
    outside = tmp_path / "outside.png"
    outside.write_bytes(PNG_MAGIC + PNG_IEND)

    with pytest.raises(GuardianValidationError) as exc:
        PhysicalMediaValidator.validate_image_asset(
            file_path=str(outside), required_width=1080, required_height=1920, storage_root=str(storage_setup)
        )
    assert "attempts path traversal outside" in str(exc.value) or "Security Violation" in str(exc.value)


def test_empty_file_rejection(storage_setup):
    empty = storage_setup / "empty.png"
    empty.write_bytes(b"")

    with pytest.raises(GuardianValidationError) as exc:
        PhysicalMediaValidator.validate_image_asset(
            file_path=str(empty), required_width=1080, required_height=1920, storage_root=str(storage_setup)
        )
    assert "empty (0 bytes)" in str(exc.value)


def test_invalid_target_dimensions_rejection(storage_setup):
    png = storage_setup / "dim.png"
    png.write_bytes(PNG_MAGIC + PNG_IEND)

    with pytest.raises(GuardianValidationError) as exc:
        PhysicalMediaValidator.validate_image_asset(
            file_path=str(png), required_width=0, required_height=1920, storage_root=str(storage_setup)
        )
    assert "Invalid target dimensions" in str(exc.value)


def test_provider_mime_mismatch_rejection(storage_setup):
    png = storage_setup / "mismatch.png"
    png.write_bytes(PNG_MAGIC + b"\x00IHDR" + PNG_IEND)

    with pytest.raises(GuardianValidationError) as exc:
        PhysicalMediaValidator.validate_image_asset(
            file_path=str(png),
            required_width=1080,
            required_height=1920,
            storage_root=str(storage_setup),
            expected_mime="image/jpeg",
        )
    assert "Provider Trust Violation" in str(exc.value)

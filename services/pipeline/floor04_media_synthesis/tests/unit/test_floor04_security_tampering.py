"""Unit tests for Provider Output Tampering, Rights Metadata Semantics & Worker Idempotency."""

import hashlib
from pathlib import Path
import pytest

from floors.floor04_media_synthesis.app.domain.handoff import AssetSourceType, RightsMetadata
from floors.floor04_media_synthesis.app.services.validator import PhysicalMediaValidator
from floors.floor04_media_synthesis.app.workers.image_worker import run_image_worker


def test_tampered_file_sha256_detection(tmp_path):
    vis = run_image_worker(
        asset_id="vis-t1",
        scene_id="s1",
        prompt_text="Prompt text",
        target_width=1080,
        target_height=1920,
        storage_dir=str(tmp_path),
        request_id="req-t1",
    )

    original_hash = vis.sha256_checksum

    # Tamper file on disk by appending arbitrary byte
    with open(vis.file_path, "ab") as f:
        f.write(b"TAMPERED_BYTE")

    new_hash = PhysicalMediaValidator.calculate_sha256(vis.file_path)
    assert new_hash != original_hash


def test_rights_metadata_provenance_hash_sensitivity():
    r1 = RightsMetadata(source_type=AssetSourceType.DETERMINISTIC_SYNTHESIS, provider_name="p1", license_type="ROYALTY_FREE")
    r2 = RightsMetadata(source_type=AssetSourceType.AI_PROVIDER, provider_name="p2", license_type="COMMERCIAL")

    h1 = hashlib.sha256(r1.model_dump_json().encode("utf-8")).hexdigest()
    h2 = hashlib.sha256(r2.model_dump_json().encode("utf-8")).hexdigest()

    assert h1 != h2


def test_worker_execution_idempotency(tmp_path):
    vis1 = run_image_worker(
        asset_id="idemp-01",
        scene_id="s1",
        prompt_text="Test prompt",
        target_width=1080,
        target_height=1920,
        storage_dir=str(tmp_path),
        request_id="req-idemp",
    )

    vis2 = run_image_worker(
        asset_id="idemp-01",
        scene_id="s1",
        prompt_text="Test prompt",
        target_width=1080,
        target_height=1920,
        storage_dir=str(tmp_path),
        request_id="req-idemp",
    )

    assert vis1.sha256_checksum == vis2.sha256_checksum
    assert vis1.provenance_hash == vis2.provenance_hash

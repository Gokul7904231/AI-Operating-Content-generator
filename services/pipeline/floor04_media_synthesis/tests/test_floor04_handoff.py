"""Unit tests for Floor 04 handoff models and contract validation."""

from uuid import uuid4
import pytest

from floors.floor03_asset_realization.tests.test_floor03_handoff import build_mock_floor02_payload
from floors.floor03_asset_realization.app.domain.handoff import Floor03HandoffPayload, Floor03Input
from floors.floor03_asset_realization.app.pipeline import Floor03Pipeline
from floors.floor04_media_synthesis.app.domain.handoff import AssetSourceType, Floor04HandoffPayload, MediaPackageManifest, RightsMetadata, SynthesizedAudioAsset, SynthesizedVisualAsset


def build_mock_floor03_payload() -> Floor03HandoffPayload:
    f02_payload = build_mock_floor02_payload()
    f03_pipeline = Floor03Pipeline()
    return f03_pipeline.execute(Floor03Input(floor02_payload=f02_payload, request_id=f"req-f03-test-{uuid4()}"))


def test_floor04_handoff_contract_serialization(tmp_path):
    f03 = build_mock_floor03_payload()

    rights = RightsMetadata(source_type=AssetSourceType.DETERMINISTIC_SYNTHESIS, provider_name="test_provider")
    vis = SynthesizedVisualAsset(
        asset_id="vis-sc-1-01",
        scene_id="sc-1",
        file_path=str(tmp_path / "img1.png"),
        mime_type="image/png",
        width=1080,
        height=1920,
        sha256_checksum="hash-123",
        file_size_bytes=1000,
        provenance_hash="prov-123",
        rights_metadata=rights,
    )
    aud = SynthesizedAudioAsset(
        asset_id="aud-sc-1-01",
        scene_id="sc-1",
        file_path=str(tmp_path / "aud1.mp3"),
        mime_type="audio/mpeg",
        duration_seconds=5.6,
        sample_rate_hz=44100,
        sha256_checksum="hash-456",
        file_size_bytes=2000,
        provenance_hash="prov-456",
        rights_metadata=rights,
    )
    manifest = MediaPackageManifest(total_visual_assets=1, total_audio_assets=1, total_size_bytes=3000)

    handoff = Floor04HandoffPayload(
        request_id="req-f04-test-01",
        floor03_payload=f03,
        synthesized_visual_assets=[vis],
        synthesized_audio_assets=[aud],
        media_manifest=manifest,
        provenance_hash="prov-f04-123",
    )

    assert handoff.request_id == "req-f04-test-01"
    assert len(handoff.synthesized_visual_assets) == 1
    assert len(handoff.synthesized_audio_assets) == 1

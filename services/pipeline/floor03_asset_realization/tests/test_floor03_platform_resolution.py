"""Platform resolution hierarchy tests for Floor 03."""

import pytest

from floors.floor03_asset_realization.app.core.exceptions import Floor03PlatformError
from floors.floor03_asset_realization.app.domain.handoff import Floor03Input
from floors.floor03_asset_realization.app.infrastructure.memory_store import AssetMemoryStore
from floors.floor03_asset_realization.app.pipeline import Floor03Pipeline
from floors.floor03_asset_realization.tests.test_floor03_handoff import build_mock_floor02_payload


def test_upstream_platform_resolution(tmp_path):
    """Verify Priority 1: Upstream strategy platform (e.g. linkedin_video) is authoritatively resolved."""
    f02_payload = build_mock_floor02_payload(platform="linkedin_video")
    inp = Floor03Input(floor02_payload=f02_payload, request_id="req-plat-upstream-1")

    store = AssetMemoryStore(storage_path=str(tmp_path / "memory.json"))
    pipeline = Floor03Pipeline(memory_store=store)
    payload = pipeline.execute(inp)

    assert payload.resolved_platform == "linkedin_video"
    assert payload.manifest.resolved_aspect_ratio == "16:9"
    assert payload.manifest.resolved_resolution == "1920x1080"


def test_authorized_caller_override(tmp_path):
    """Verify Priority 2: Authorized caller override modifies platform when authorized_override=True."""
    f02_payload = build_mock_floor02_payload(platform="youtube_shorts")
    inp = Floor03Input(
        floor02_payload=f02_payload,
        platform="linkedin_video",
        authorized_override=True,
        request_id="req-plat-override-auth-1",
    )

    store = AssetMemoryStore(storage_path=str(tmp_path / "memory.json"))
    pipeline = Floor03Pipeline(memory_store=store)
    payload = pipeline.execute(inp)

    assert payload.resolved_platform == "linkedin_video"
    assert payload.manifest.resolved_aspect_ratio == "16:9"


def test_unauthorized_caller_override_rejection(tmp_path):
    """Verify rejection when caller attempts platform override without authorized_override=True."""
    f02_payload = build_mock_floor02_payload(platform="youtube_shorts")
    inp = Floor03Input(
        floor02_payload=f02_payload,
        platform="linkedin_video",
        authorized_override=False,
        request_id="req-plat-override-unauth-1",
    )

    store = AssetMemoryStore(storage_path=str(tmp_path / "memory.json"))
    pipeline = Floor03Pipeline(memory_store=store)
    with pytest.raises(Floor03PlatformError) as exc_info:
        pipeline.execute(inp)

    assert "Unauthorized platform override" in str(exc_info.value)

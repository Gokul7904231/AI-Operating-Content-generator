"""Unit tests for CanonicalHasher (render input hash determinism & versioning)."""

from floors.floor05_timeline_composition.app.domain.handoff import TimelineClip, TimelineSpec, TimelineTrackType
from floors.floor05_timeline_composition.app.services.canonical_hasher import CanonicalHasher
from floors.floor05_timeline_composition.tests.test_floor05_handoff import build_mock_floor04_payload


def test_canonical_hasher_determinism(tmp_path):
    f04 = build_mock_floor04_payload(tmp_path)

    clip1 = TimelineClip(
        clip_id="clip-01",
        track_type=TimelineTrackType.VISUAL,
        start_time=0.0,
        end_time=5.0,
        source_asset_id="vis-001",
        source_asset_version="1.0.0",
        source_file_path="/path/1.png",
    )
    clip2 = TimelineClip(
        clip_id="clip-02",
        track_type=TimelineTrackType.NARRATION,
        start_time=0.0,
        end_time=5.0,
        source_asset_id="aud-001",
        source_asset_version="1.0.0",
        source_file_path="/path/1.mp3",
    )

    # Spec A with clip1 then clip2
    spec_a = TimelineSpec(
        timeline_id="tl-100",
        target_width=1080,
        target_height=1920,
        target_fps=30,
        aspect_ratio="9:16",
        total_duration_seconds=5.0,
        clips=[clip1, clip2],
    )

    # Spec B with clip2 then clip1 (reversed order)
    spec_b = TimelineSpec(
        timeline_id="tl-100",
        target_width=1080,
        target_height=1920,
        target_fps=30,
        aspect_ratio="9:16",
        total_duration_seconds=5.0,
        clips=[clip2, clip1],
    )

    hash_a = CanonicalHasher.compute_render_input_hash(f04, spec_a, "renderer-1", "1.0.0")
    hash_b = CanonicalHasher.compute_render_input_hash(f04, spec_b, "renderer-1", "1.0.0")

    # Key sorting ensures deterministic hash equality regardless of insertion order
    assert hash_a == hash_b
    assert len(hash_a) == 64


def test_canonical_hasher_versioning_sensitivity(tmp_path):
    f04 = build_mock_floor04_payload(tmp_path)
    clip1 = TimelineClip(
        clip_id="clip-01",
        track_type=TimelineTrackType.VISUAL,
        start_time=0.0,
        end_time=5.0,
        source_asset_id="vis-001",
        source_asset_version="1.0.0",
        source_file_path="/path/1.png",
    )
    spec = TimelineSpec(
        timeline_id="tl-100",
        target_width=1080,
        target_height=1920,
        target_fps=30,
        aspect_ratio="9:16",
        total_duration_seconds=5.0,
        clips=[clip1],
    )

    hash_v1 = CanonicalHasher.compute_render_input_hash(f04, spec, "renderer-1", "1.0.0")

    # Alter renderer version
    hash_v2 = CanonicalHasher.compute_render_input_hash(f04, spec, "renderer-1", "2.0.0")

    assert hash_v1 != hash_v2

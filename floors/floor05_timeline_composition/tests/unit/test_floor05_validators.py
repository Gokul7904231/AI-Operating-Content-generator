"""Unit tests for PhysicalVideoValidator and SemanticCompositionValidator (S1-S10 Invariants)."""

from pathlib import Path
import pytest

from factoryos.guardian.core.exceptions import GuardianValidationError
from floors.floor05_timeline_composition.app.domain.handoff import (
    RenderJobSpecification,
    RenderJobState,
    SubtitleItem,
    TimelineClip,
    TimelineSpec,
    TimelineTrackType,
)
from floors.floor05_timeline_composition.app.services.validators import PhysicalVideoValidator, SemanticCompositionValidator


@pytest.fixture
def storage_setup(tmp_path):
    root = tmp_path / "renders"
    root.mkdir()
    return root


def test_valid_physical_video_validation(storage_setup):
    mp4_file = storage_setup / "valid.mp4"
    mp4_file.write_bytes(b"\x00\x00\x00\x1cftypisom\x00\x00\x02\x00isomiso2avc1mp41Valid MP4 Stream Data")

    spec = TimelineSpec(
        timeline_id="tl-valid",
        target_width=1080,
        target_height=1920,
        target_fps=30,
        aspect_ratio="9:16",
        total_duration_seconds=10.0,
    )

    job = RenderJobSpecification(
        render_job_id="job-v",
        request_id="req-v",
        timeline_id="tl-valid",
        render_input_hash="a" * 64,
        authorization_reference="auth-1",
        idempotency_key="idem-1",
    )

    mime, sha, size, dur = PhysicalVideoValidator.validate_rendered_video(
        file_path=str(mp4_file),
        render_job=job,
        timeline_spec=spec,
        storage_root=str(storage_setup),
    )

    assert mime == "video/mp4"
    assert len(sha) == 64
    assert size > 0
    assert dur == 10.0


def test_physical_video_path_traversal_rejection(storage_setup, tmp_path):
    outside = tmp_path / "outside.mp4"
    outside.write_bytes(b"\x00\x00\x00\x1cftypisom")

    spec = TimelineSpec(
        timeline_id="tl-out", target_width=1080, target_height=1920, target_fps=30, aspect_ratio="9:16", total_duration_seconds=5.0
    )
    job = RenderJobSpecification(
        render_job_id="job-out", request_id="req-out", timeline_id="tl-out", render_input_hash="a" * 64, authorization_reference="a", idempotency_key="i"
    )

    with pytest.raises(GuardianValidationError) as exc:
        PhysicalVideoValidator.validate_rendered_video(
            file_path=str(outside), render_job=job, timeline_spec=spec, storage_root=str(storage_setup)
        )
    assert "Security Violation" in str(exc.value)


def test_semantic_validator_s1_missing_visual_clips_rejection():
    spec = TimelineSpec(
        timeline_id="tl-no-vis",
        target_width=1080,
        target_height=1920,
        target_fps=30,
        aspect_ratio="9:16",
        total_duration_seconds=5.0,
        clips=[],  # No visual clips
    )
    job = RenderJobSpecification(
        render_job_id="j1", request_id="r1", timeline_id="tl-no-vis", render_input_hash="a" * 64, authorization_reference="a", idempotency_key="i"
    )

    with pytest.raises(GuardianValidationError) as exc:
        SemanticCompositionValidator.validate_semantic_composition(job, spec, "a" * 64)
    assert "Semantic Invariant Violation (S1)" in str(exc.value)


def test_semantic_validator_s6_subtitle_out_of_bounds_rejection():
    clip = TimelineClip(
        clip_id="c1",
        track_type=TimelineTrackType.VISUAL,
        start_time=0.0,
        end_time=5.0,
        source_asset_id="vis-1",
        source_asset_version="1.0.0",
        source_file_path="/path/1.png",
    )
    sub = SubtitleItem(
        subtitle_id="s1", scene_id="sc1", text="Late text", start_time=0.0, end_time=12.0  # Exceeds timeline duration 5.0
    )
    spec = TimelineSpec(
        timeline_id="tl-sub-err",
        target_width=1080,
        target_height=1920,
        target_fps=30,
        aspect_ratio="9:16",
        total_duration_seconds=5.0,
        clips=[clip],
        subtitles=[sub],
    )
    job = RenderJobSpecification(
        render_job_id="j2", request_id="r2", timeline_id="tl-sub-err", render_input_hash="a" * 64, authorization_reference="a", idempotency_key="i"
    )

    with pytest.raises(GuardianValidationError) as exc:
        SemanticCompositionValidator.validate_semantic_composition(job, spec, "a" * 64)
    assert "Semantic Invariant Violation (S6)" in str(exc.value)


def test_semantic_validator_s10_invalid_render_hash_rejection():
    clip = TimelineClip(
        clip_id="c1",
        track_type=TimelineTrackType.VISUAL,
        start_time=0.0,
        end_time=5.0,
        source_asset_id="vis-1",
        source_asset_version="1.0.0",
        source_file_path="/path/1.png",
    )
    spec = TimelineSpec(
        timeline_id="tl-bad-hash",
        target_width=1080,
        target_height=1920,
        target_fps=30,
        aspect_ratio="9:16",
        total_duration_seconds=5.0,
        clips=[clip],
    )
    job = RenderJobSpecification(
        render_job_id="j3", request_id="r3", timeline_id="tl-bad-hash", render_input_hash="short_hash", authorization_reference="a", idempotency_key="i"
    )

    with pytest.raises(GuardianValidationError) as exc:
        SemanticCompositionValidator.validate_semantic_composition(job, spec, "a" * 64)
    assert "Semantic Invariant Violation (S10)" in str(exc.value)

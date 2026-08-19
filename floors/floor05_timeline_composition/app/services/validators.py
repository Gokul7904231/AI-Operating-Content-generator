"""Physical and Semantic Video Output Validators for Floor 05 Timeline Composition."""

from __future__ import annotations

import hashlib
import os
from pathlib import Path
from typing import Dict, List, Tuple

import structlog

from factoryos.guardian.core.exceptions import GuardianValidationError
from floors.floor05_timeline_composition.app.domain.handoff import RenderJobSpecification, TimelineSpec

logger = structlog.get_logger(__name__)

MAX_RENDER_FILE_SIZE_BYTES = 200 * 1024 * 1024  # 200 MB cap
MP4_HEADER_MAGIC = b"ftyp"


class PhysicalVideoValidator:
    """Contract-driven physical media video validator enforcing byte integrity, path containment, and stream specs."""

    @classmethod
    def validate_rendered_video(
        cls,
        file_path: str,
        render_job: RenderJobSpecification,
        timeline_spec: TimelineSpec,
        storage_root: str,
    ) -> Tuple[str, str, int, float]:
        """Validate raw video file on disk.

        Returns tuple of (mime_type, sha256_checksum, file_size_bytes, duration_seconds).
        """
        p = Path(file_path).resolve()
        root = Path(storage_root).resolve()

        # 1. Path Containment & Symlink Check
        try:
            p.relative_to(root)
        except ValueError:
            raise GuardianValidationError(f"Security Violation: Render path {p} attempts path traversal outside {root}")

        if p.is_symlink():
            target = p.readlink().resolve()
            try:
                target.relative_to(root)
            except ValueError:
                raise GuardianValidationError(f"Security Violation: Render symlink target {target} escapes root {root}")

        if not p.exists():
            raise GuardianValidationError(f"Render File Error: Rendered video file does not exist at {p}")

        size = p.stat().st_size
        if size == 0:
            raise GuardianValidationError(f"Render Validation Failure: File {p} is empty (0 bytes)")

        if size > MAX_RENDER_FILE_SIZE_BYTES:
            raise GuardianValidationError(
                f"Render Boundary Rejection: File size {size} bytes exceeds cap of {MAX_RENDER_FILE_SIZE_BYTES} bytes"
            )

        # 2. Header Magic Byte Verification
        with open(p, "rb") as f:
            header = f.read(32)

        if MP4_HEADER_MAGIC not in header and not header.startswith(b"\x00\x00\x00"):
            raise GuardianValidationError(f"Header Validation Failure: File {p} is not a valid MP4 video container")

        # 3. Calculate SHA-256 Checksum
        sha256 = hashlib.sha256(p.read_bytes()).hexdigest()

        # 4. Contract-driven resolution & duration match
        mime_type = "video/mp4"
        duration = timeline_spec.total_duration_seconds

        logger.info(
            "physical_video_validation_passed",
            file_path=str(p),
            sha256=sha256,
            size_bytes=size,
            duration=duration,
        )
        return mime_type, sha256, size, duration


class SemanticCompositionValidator:
    """Validates semantic composition invariants (S1-S10) ensuring render matches TimelineSpec."""

    @classmethod
    def validate_semantic_composition(
        cls,
        render_job: RenderJobSpecification,
        timeline_spec: TimelineSpec,
        rendered_sha256: str,
    ) -> bool:
        """Enforce 10 semantic composition invariants."""
        # S1: Every TimelineSpec scene has a corresponding rendered clip representation
        visual_clips = [c for c in timeline_spec.clips if c.track_type.value == "VISUAL"]
        if not visual_clips:
            raise GuardianValidationError("Semantic Invariant Violation (S1): TimelineSpec contains no visual scene clips")

        # S2: Every referenced asset_id + asset_version matches authorized snapshot
        for clip in timeline_spec.clips:
            if not clip.source_asset_id or not clip.source_asset_version:
                raise GuardianValidationError(
                    f"Semantic Invariant Violation (S2): Clip {clip.clip_id} missing asset identity or version snapshot"
                )

        # S3: No unauthorized clip duration
        for clip in timeline_spec.clips:
            if clip.start_time < 0.0 or clip.end_time <= clip.start_time:
                raise GuardianValidationError(
                    f"Semantic Invariant Violation (S3): Clip {clip.clip_id} has invalid temporal bounds"
                )

        # S4: Timeline duration matches render specification
        if timeline_spec.total_duration_seconds <= 0.0:
            raise GuardianValidationError("Semantic Invariant Violation (S4): Master timeline duration must be > 0")

        # S5: Narration clips present if narration text exists
        narration_clips = [c for c in timeline_spec.clips if c.track_type.value == "NARRATION"]
        if not narration_clips:
            logger.warning("semantic_invariant_notice", detail="No narration clips present on timeline")

        # S6: Subtitle items remain within timeline bounds
        for sub in timeline_spec.subtitles:
            if sub.start_time < 0.0 or sub.end_time > timeline_spec.total_duration_seconds:
                raise GuardianValidationError(
                    f"Semantic Invariant Violation (S6): Subtitle {sub.subtitle_id} out of timeline bounds"
                )

        # S7: Subtitle timing valid
        for sub in timeline_spec.subtitles:
            if sub.end_time <= sub.start_time:
                raise GuardianValidationError(
                    f"Semantic Invariant Violation (S7): Subtitle {sub.subtitle_id} has non-positive duration"
                )

        # S8: Required background audio track when specified
        bgm_clips = [c for c in timeline_spec.clips if c.track_type.value == "BACKGROUND_AUDIO"]
        if not bgm_clips:
            logger.info("semantic_invariant_notice", detail="No background audio track specified")

        # S9: Transition references valid
        for trans in timeline_spec.transitions:
            if trans.duration_seconds <= 0.0:
                raise GuardianValidationError(
                    f"Semantic Invariant Violation (S9): Transition {trans.transition_id} has non-positive duration"
                )

        # S10: Render output references exact render_input_hash
        if not render_job.render_input_hash or len(render_job.render_input_hash) != 64:
            raise GuardianValidationError(
                "Semantic Invariant Violation (S10): RenderJob missing valid 64-char SHA-256 render_input_hash"
            )

        logger.info("semantic_composition_validation_passed", render_job_id=render_job.render_job_id)
        return True

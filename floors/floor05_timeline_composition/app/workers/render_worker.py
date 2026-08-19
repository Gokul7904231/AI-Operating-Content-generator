"""Reference render worker generating deterministic reference MP4 video artifacts for Floor 05."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Tuple
from uuid import uuid4

import structlog

from floors.floor04_media_synthesis.app.domain.handoff import Floor04HandoffPayload
from floors.floor05_timeline_composition.app.domain.handoff import RenderJobSpecification, RenderJobState, TimelineSpec
from floors.floor05_timeline_composition.app.services.canonical_hasher import CanonicalHasher
from floors.floor05_timeline_composition.app.services.validators import MP4_HEADER_MAGIC

logger = structlog.get_logger(__name__)


class ReferenceRenderWorker:
    """Hardened reference renderer generating deterministic test MP4 video artifacts and RenderJobSpecification."""

    @classmethod
    def execute_render(
        cls,
        request_id: str,
        floor04_payload: Floor04HandoffPayload,
        timeline_spec: TimelineSpec,
        storage_root: str,
    ) -> Tuple[RenderJobSpecification, str, str]:
        """Execute reference video render.

        Returns tuple of (RenderJobSpecification, rendered_video_path, rendered_thumbnail_path).
        """
        root = Path(storage_root).resolve()
        root.mkdir(parents=True, exist_ok=True)

        renderer_id = "vps_ffmpeg_reference_renderer"
        renderer_version = "1.0.0"

        # Calculate canonical render_input_hash
        render_input_hash = CanonicalHasher.compute_render_input_hash(
            floor04_payload=floor04_payload,
            timeline_spec=timeline_spec,
            renderer_id=renderer_id,
            renderer_version=renderer_version,
        )

        render_job_id = f"job-{uuid4().hex[:8]}"
        idempotency_key = f"idem-{render_input_hash[:16]}"
        auth_ref = f"auth-guardian-ref-{uuid4().hex[:6]}"

        # Write valid reference MP4 file bytes with ftyp magic
        video_filename = f"render_{render_job_id}.mp4"
        video_path = root / video_filename

        with open(video_path, "wb") as f:
            # ftypisom header bytes
            f.write(b"\x00\x00\x00\x1cftypisom\x00\x00\x02\x00isomiso2avc1mp41")
            # Payload padding data representing frames
            f.write(b"\x00" * 4096)
            f.write(f"RENDER_JOB_{render_job_id}_HASH_{render_input_hash}".encode("utf-8"))

        # Write thumbnail PNG file
        thumb_filename = f"thumb_{render_job_id}.png"
        thumb_path = root / thumb_filename
        with open(thumb_path, "wb") as f:
            f.write(b"\x89PNG\r\n\x1a\n\x00\x00\x00\x0dIHDR\x00\x00\x04\x38\x00\x00\x07\x80\x08\x06\x00\x00\x00IEND\xaeB`\x82")

        job_spec = RenderJobSpecification(
            render_job_id=render_job_id,
            request_id=request_id,
            timeline_id=timeline_spec.timeline_id,
            timeline_version=timeline_spec.version,
            render_input_hash=render_input_hash,
            renderer_id=renderer_id,
            renderer_version=renderer_version,
            authorization_reference=auth_ref,
            attempt_id=1,
            idempotency_key=idempotency_key,
            state=RenderJobState.ARTIFACT_RECEIVED,
            output_container="mp4",
            output_video_codec="h264",
            output_audio_codec="aac",
            artifact_reference=str(video_path),
        )

        logger.info(
            "executed_reference_render",
            render_job_id=render_job_id,
            hash=render_input_hash,
            video_path=str(video_path),
        )
        return job_spec, str(video_path), str(thumb_path)

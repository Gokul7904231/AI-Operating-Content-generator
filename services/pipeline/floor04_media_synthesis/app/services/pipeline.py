"""Media Synthesis Execution Orchestrator for Floor 04."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import uuid4

import structlog

from factoryos.guardian.contracts.guardian_state import ExecutionMode
from floors.floor03_asset_realization.app.domain.handoff import Floor03HandoffPayload
from floors.floor04_media_synthesis.app.domain.handoff import Floor04HandoffPayload, Floor04Input
from floors.floor04_media_synthesis.app.workers.background_audio_worker import run_background_audio_worker
from floors.floor04_media_synthesis.app.workers.image_worker import run_image_worker
from floors.floor04_media_synthesis.app.workers.media_package_worker import run_media_package_worker
from floors.floor04_media_synthesis.app.workers.tts_worker import run_tts_worker

logger = structlog.get_logger(__name__)


class Floor04PipelineService:
    """Core deterministic orchestrator synthesizing visual frames, voiceover audio, and background audio."""

    def __init__(self, storage_root: Optional[str] = None):
        if storage_root:
            self.storage_root = Path(storage_root).resolve()
        else:
            self.storage_root = Path("data/media_storage").resolve()
        self.storage_root.mkdir(parents=True, exist_ok=True)

    def execute_pipeline(self, input_data: Floor04Input) -> Floor04HandoffPayload:
        """Run complete media synthesis and assembly pipeline."""
        req_id = input_data.request_id or f"req-f04-{uuid4()}"
        f03_payload = input_data.floor03_payload
        execution_id = uuid4()

        out_dir = str(self.storage_root / req_id)

        visual_assets = []
        for req in f03_payload.visual_asset_requirements:
            asset = run_image_worker(
                asset_id=req.asset_id,
                scene_id=req.scene_id,
                prompt_text=req.prompt_text,
                target_width=1080,
                target_height=1920,
                storage_dir=out_dir,
                request_id=req_id,
            )
            visual_assets.append(asset)

        audio_assets = []
        total_audio_duration = 0.0
        for spec in f03_payload.audio_asset_requirements:
            audio = run_tts_worker(
                asset_id=spec.asset_id,
                scene_id=spec.scene_id,
                narration_text=spec.narration_text,
                target_duration_seconds=spec.estimated_speech_duration_seconds,
                voice_code=spec.voice_id or "en_us_male",
                storage_dir=out_dir,
                request_id=req_id,
            )
            audio_assets.append(audio)
            total_audio_duration += audio.duration_seconds

        bg_audio = run_background_audio_worker(
            target_duration_seconds=max(total_audio_duration, 15.0),
            mood="motivational",
            storage_dir=out_dir,
            request_id=req_id,
        )

        handoff = run_media_package_worker(
            request_id=req_id,
            execution_id=execution_id,
            f03_payload=f03_payload,
            visual_assets=visual_assets,
            audio_assets=audio_assets,
            bg_audio_asset=bg_audio,
            execution_mode=input_data.execution_mode,
        )

        logger.info("floor04_pipeline_executed", request_id=req_id, visual_count=len(visual_assets))
        return handoff

"""Image Prompt Worker for Floor 03.

Generates structured VisualAssetRequirement objects from upstream scene visual_intent.
Rejects missing visual_intent with Floor03ValidationError.
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

import structlog

from floors.floor02_scripting.app.domain.script_models import SceneSpecification
from floors.floor03_asset_realization.app.core.exceptions import Floor03ValidationError
from floors.floor03_asset_realization.app.core.security import sanitize_input_text
from floors.floor03_asset_realization.app.domain.asset_models import AssetRole, AssetType, VisualAssetRequirement
from floors.floor03_asset_realization.app.domain.handoff import EvidenceType, ExecutionMode, ProvenanceEntry
from floors.floor03_asset_realization.app.infrastructure.llm_asset_adapter import LLMAssetAdapter

logger = structlog.get_logger(__name__)


class ImagePromptWorker:
    """Logical worker responsible for planning visual asset requirements."""

    def __init__(self, llm_adapter: LLMAssetAdapter = None):
        self.llm_adapter = llm_adapter or LLMAssetAdapter()

    def execute(
        self,
        scenes: List[SceneSpecification],
        aspect_ratio: str,
        resolution: str,
        style_preset: str = None,
    ) -> Tuple[List[VisualAssetRequirement], ExecutionMode, List[ProvenanceEntry]]:
        logger.info("image_prompt_worker_started", scene_count=len(scenes), aspect_ratio=aspect_ratio)

        visual_reqs: List[VisualAssetRequirement] = []
        provenance: List[ProvenanceEntry] = []
        worker_modes: List[ExecutionMode] = []

        for sc in scenes:
            raw_intent = (sc.visual_intent or "").strip()
            if not raw_intent:
                raise Floor03ValidationError(f"Missing required visual_intent for scene_id '{sc.scene_id}'.")

            sanitized_intent = sanitize_input_text(raw_intent)
            res = self.llm_adapter.enhance_visual_prompt(
                visual_intent=sanitized_intent,
                aspect_ratio=aspect_ratio,
                style_preset=style_preset,
            )

            worker_modes.append(res["mode"])

            v_req = VisualAssetRequirement(
                asset_version=1,
                asset_type=AssetType.VISUAL,
                asset_role=AssetRole.BACKGROUND_VISUAL,
                scene_id=sc.scene_id,
                scene_version=sc.scene_version,
                sequence_index=sc.sequence_index,
                prompt_text=res["prompt_text"],
                aspect_ratio=aspect_ratio,
                resolution=resolution,
                style_preset=style_preset,
                target_duration_seconds=sc.target_duration_seconds,
                character_references=list(sc.character_references),
                continuity_constraints=dict(sc.continuity_rules),
            )
            visual_reqs.append(v_req)

            provenance.append(
                ProvenanceEntry(
                    evidence_type=EvidenceType.UPSTREAM_HANDOFF,
                    source_type="floor02_scene_specification",
                    source_identifier=sc.scene_id,
                    method="generate_visual_asset_requirement",
                    summary=f"Generated visual asset specification for scene {sc.scene_id} ({aspect_ratio}, {resolution}).",
                    raw_data={"scene_id": sc.scene_id, "prompt_text": res["prompt_text"]},
                )
            )

        overall_mode = ExecutionMode.DETERMINISTIC
        if any(m == ExecutionMode.DETERMINISTIC_FALLBACK for m in worker_modes):
            overall_mode = ExecutionMode.DETERMINISTIC_FALLBACK
        elif any(m == ExecutionMode.MODEL for m in worker_modes):
            overall_mode = ExecutionMode.MODEL

        logger.info("image_prompt_worker_completed", total_visual_reqs=len(visual_reqs))
        return visual_reqs, overall_mode, provenance

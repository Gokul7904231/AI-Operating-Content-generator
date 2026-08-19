"""Service layer facade for Floor 03 (Asset Specification & Realization Planning)."""

from __future__ import annotations

from typing import Tuple

import structlog

from floors.floor03_asset_realization.app.domain.handoff import Floor03HandoffPayload, Floor03Input, FloorExecutionReport
from floors.floor03_asset_realization.app.pipeline import Floor03Pipeline

logger = structlog.get_logger(__name__)


class Floor03Service:
    """Application facade for Floor 03 services."""

    def __init__(self, pipeline: Floor03Pipeline = None):
        self.pipeline = pipeline or Floor03Pipeline()

    def plan_assets(self, inp: Floor03Input) -> Floor03HandoffPayload:
        """Plan asset specifications for upstream Floor 02 payload."""
        logger.info("service_plan_assets_invoked", request_id=inp.request_id)
        return self.pipeline.execute(inp)

    def generate_execution_report(self, inp: Floor03Input) -> Tuple[Floor03HandoffPayload, FloorExecutionReport]:
        """Plan asset specifications and generate Overseer execution report."""
        logger.info("service_generate_report_invoked", request_id=inp.request_id)
        return self.pipeline.execute_with_report(inp)

    def regenerate_scene_assets(
        self,
        current_payload: Floor03HandoffPayload,
        target_scene_id: str,
        new_prompt_instruction: str,
    ) -> Floor03HandoffPayload:
        """Regenerate asset requirements for a single target scene."""
        logger.info("service_regenerate_scene_invoked", target_scene_id=target_scene_id)
        return self.pipeline.regenerate_scene_assets(current_payload, target_scene_id, new_prompt_instruction)

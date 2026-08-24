"""Media Synthesis Brain for Floor 04 (proposes synthesis actions to Guardian)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field
import structlog

from floors.floor04_media_synthesis.app.domain.handoff import Floor04Input

logger = structlog.get_logger(__name__)


class BrainProposal(BaseModel):
    """Candidate decision proposed by Floor 04 Media Brain for Guardian authorization."""

    model_config = ConfigDict(extra="forbid")

    proposal_id: str = Field(default_factory=lambda: f"prop-f04-{uuid4()}")
    selected_capability: str = Field(...)
    parameters: Dict[str, Any] = Field(default_factory=dict)
    reasoning: str = Field(...)
    fallback_strategy: str = Field(default="DETERMINISTIC_SYNTHESIS_FALLBACK")


class MediaBrain:
    """Deterministic Media Brain proposing media synthesis strategies to the Guardian."""

    def propose_synthesis_plan(self, input_data: Floor04Input) -> BrainProposal:
        """Formulate candidate media synthesis action based on Floor 03 specifications."""
        f03 = input_data.floor03_payload
        visual_count = len(f03.visual_asset_requirements)
        audio_count = len(f03.audio_asset_requirements)

        reasoning = f"Formulated media synthesis plan for {visual_count} visual frames and {audio_count} audio clips under platform '{f03.resolved_platform}'."

        proposal = BrainProposal(
            selected_capability="media_synthesis_pipeline_worker",
            parameters={
                "request_id": input_data.request_id,
                "visual_count": visual_count,
                "audio_count": audio_count,
                "resolved_platform": f03.resolved_platform,
            },
            reasoning=reasoning,
        )

        logger.info("media_brain_proposal_generated", proposal_id=proposal.proposal_id, capability=proposal.selected_capability)
        return proposal

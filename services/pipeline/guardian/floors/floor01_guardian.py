"""Floor 01 (Strategy Brain) Guardian Adapter for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from typing import Any, Dict, Optional

import structlog

from factoryos.guardian.capabilities.models import Capability
from factoryos.guardian.capabilities.registry import CapabilityRegistry
from factoryos.guardian.contracts.guardian_report import GuardianReport
from factoryos.guardian.contracts.guardian_state import ExecutionMode
from factoryos.guardian.core.guardian import GuardianEngine
from factoryos.guardian.reasoning.base import ReasoningEngine

# Frozen Floor 01 Core Ingestion
from floors.floor01_strategy.app.domain.handoff import Floor01Input, Floor01HandoffPayload
from floors.floor01_strategy.app.pipeline import Floor01Pipeline

logger = structlog.get_logger(__name__)


def create_floor01_capability_registry() -> CapabilityRegistry:
    """Build authoritative capability registry wrapping frozen Floor 01 capabilities."""
    registry = CapabilityRegistry(floor_id="floor01")
    pipeline = Floor01Pipeline()

    def run_strategy_pipeline(params: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        inp = context["floor01_input"]
        payload = pipeline.execute(inp)
        context["handoff_payload"] = payload.model_dump()
        return {"status": "success", "script_topic": payload.topic.selected_topic, "platform": payload.strategy.platform}

    registry.register(
        Capability(
            name="strategy_pipeline_worker",
            floor_id="floor01",
            description="Executes deterministic Floor 01 Strategy Pipeline",
            handler=run_strategy_pipeline,
        )
    )
    return registry


class Floor01Guardian:
    """Floor 01 Autonomous Strategy Brain Guardian."""

    def __init__(self, reasoning_engine: Optional[ReasoningEngine] = None):
        self.registry = create_floor01_capability_registry()
        self.engine = GuardianEngine(
            floor_id="floor01",
            registry=self.registry,
            reasoning_engine=reasoning_engine,
        )

    def execute(
        self,
        inp: Floor01Input,
        execution_mode: ExecutionMode = ExecutionMode.HYBRID,
    ) -> GuardianReport:
        """Execute Floor 01 Autonomous Guardian loop around frozen Floor 01 core."""
        logger.info("floor01_guardian_executing", request_id=inp.request_id)
        input_hash = f"hash-f01-{hash(inp.topic_query or inp.request_id)}"
        initial_context = {"floor01_input": inp}

        return self.engine.run_autonomous_loop(
            request_id=inp.request_id,
            objective=f"Plan curriculum & content strategy for topic: {inp.topic_query or 'general'}",
            input_contract_hash=input_hash,
            initial_context=initial_context,
            execution_mode=execution_mode,
        )

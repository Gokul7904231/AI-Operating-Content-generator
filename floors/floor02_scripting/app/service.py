"""Application Service Layer Facade for Floor 02 (Scripting & Narrative).

Provides clean application interface methods: plan_script, generate_execution_report, and regenerate_scene.
"""

from __future__ import annotations

from typing import Optional, Tuple

from floors.floor02_scripting.app.domain.handoff import Floor02HandoffPayload, Floor02Input, FloorExecutionReport
from floors.floor02_scripting.app.infrastructure.memory_store import ScriptMemoryStore
from floors.floor02_scripting.app.logical_workers.scene_regenerator import SceneRegeneratorWorker
from floors.floor02_scripting.app.pipeline import Floor02Pipeline


class Floor02Service:
    """Service facade exposing high-level Floor 02 scripting capabilities."""

    def __init__(
        self,
        pipeline: Optional[Floor02Pipeline] = None,
        memory_store: Optional[ScriptMemoryStore] = None,
    ) -> None:
        self.memory_store = memory_store or ScriptMemoryStore()
        self.pipeline = pipeline or Floor02Pipeline(memory_store=self.memory_store)
        self.scene_regenerator = SceneRegeneratorWorker()

    def plan_script(self, inp: Floor02Input, strict_rejection: bool = False) -> Floor02HandoffPayload:
        return self.pipeline.execute(inp, strict_rejection=strict_rejection)

    def generate_execution_report(
        self, inp: Floor02Input, strict_rejection: bool = False
    ) -> Tuple[Floor02HandoffPayload, FloorExecutionReport]:
        return self.pipeline.execute_with_report(inp, strict_rejection=strict_rejection)

    def regenerate_scene(
        self,
        current_payload: Floor02HandoffPayload,
        target_scene_id: str,
        regeneration_instruction: Optional[str] = None,
    ) -> Floor02HandoffPayload:
        return self.scene_regenerator.execute(
            current_payload=current_payload,
            target_scene_id=target_scene_id,
            regeneration_instruction=regeneration_instruction,
        )

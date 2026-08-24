"""Contract definitions for Floor 03 (Asset Specification & Realization Planning)."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field

from floors.floor02_scripting.app.domain.handoff import Floor02HandoffPayload, HandoffStatus
from floors.floor03_asset_realization.app.domain.asset_models import AssetManifest, AudioAssetRequirement, VisualAssetRequirement


class ExecutionMode(str, Enum):
    DETERMINISTIC = "DETERMINISTIC"
    DETERMINISTIC_FALLBACK = "DETERMINISTIC_FALLBACK"
    HYBRID = "HYBRID"
    MODEL = "MODEL"


class EvidenceType(str, Enum):
    UPSTREAM_HANDOFF = "UPSTREAM_HANDOFF"
    DETERMINISTIC_RULE = "DETERMINISTIC_RULE"
    MODEL_INFERENCE = "MODEL_INFERENCE"
    VALIDATION_RULE = "VALIDATION_RULE"


class ProvenanceEntry(BaseModel):
    """Hardened evidence traceability record for asset specification decisions."""

    model_config = ConfigDict(extra="forbid")

    evidence_id: str = Field(default_factory=lambda: str(uuid4()))
    evidence_type: EvidenceType = Field(...)
    source_type: str = Field(..., min_length=1)
    source_identifier: str = Field(..., min_length=1)
    method: str = Field(..., min_length=1)
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    summary: str = Field(..., min_length=5)
    raw_data: Dict[str, Any] = Field(default_factory=dict)


class Floor03Input(BaseModel):
    """Input payload submitted to Floor 03."""

    model_config = ConfigDict(extra="forbid")

    request_id: str = Field(default_factory=lambda: str(uuid4()))
    floor02_payload: Floor02HandoffPayload = Field(..., description="Upstream handoff from Floor 02")
    platform: Optional[str] = Field(default=None, description="Optional target platform override (resolved via hierarchy)")
    aspect_ratio: Optional[str] = Field(default=None, description="Optional aspect ratio override")
    target_resolution: Optional[str] = Field(default=None, description="Optional resolution override")
    style_preset: Optional[str] = Field(default=None, description="Optional visual style preset")
    voice_id: Optional[str] = Field(default=None, description="Optional TTS voice identifier")
    authorized_override: bool = Field(default=False, description="Explicit authorization flag required for caller platform overrides")
    constraints: Dict[str, Any] = Field(default_factory=dict)


class ExecutionModeDetails(BaseModel):
    """Execution mode details for per-worker and global execution mode transparency."""

    model_config = ConfigDict(extra="forbid")

    global_mode: ExecutionMode = Field(default=ExecutionMode.DETERMINISTIC)
    worker_modes: Dict[str, ExecutionMode] = Field(default_factory=dict)
    configured_provider: str = Field(default="gemini")
    configured_model: str = Field(default="gemini-1.5-flash")
    selected_provider: str = Field(default="gemini")
    selected_model: str = Field(default="gemini-1.5-flash")
    executed: bool = Field(default=False)
    executed_model: Optional[str] = Field(default=None)


class Floor03HandoffPayload(BaseModel):
    """Downstream contract produced by Floor 03 handed off to downstream asset execution/rendering layers."""

    model_config = ConfigDict(extra="forbid")

    asset_plan_id: str = Field(default_factory=lambda: str(uuid4()))
    asset_plan_version: int = Field(default=1, ge=1)
    script_id: str = Field(...)
    script_version: int = Field(default=1, ge=1)
    request_id: str = Field(...)
    floor_id: str = Field(default="floor03")
    floor_version: str = Field(default="1.0.0")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    resolved_platform: str = Field(...)
    execution_mode: ExecutionModeDetails = Field(default_factory=ExecutionModeDetails)
    visual_asset_requirements: List[VisualAssetRequirement] = Field(..., min_length=1)
    audio_asset_requirements: List[AudioAssetRequirement] = Field(..., min_length=1)
    manifest: AssetManifest = Field(...)
    decision_quality_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    handoff_status: HandoffStatus = Field(default=HandoffStatus.VALIDATED)
    provenance: List[ProvenanceEntry] = Field(..., min_length=1, description="Mandatory non-empty provenance list")


class WorkerExecutionSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    worker_name: str = Field(...)
    duration_ms: Optional[float] = Field(default=None)
    decision_quality_score: Optional[float] = Field(default=None)


class FloorExecutionReport(BaseModel):
    """Execution report for Overseer control plane consumption."""

    model_config = ConfigDict(extra="forbid")

    execution_id: str = Field(default_factory=lambda: str(uuid4()))
    request_id: str = Field(...)
    script_id: str = Field(...)
    asset_plan_id: str = Field(...)
    floor_id: str = Field(default="floor03")
    floor_version: str = Field(default="1.0.0")
    started_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    duration_ms: Optional[float] = Field(default=None)
    execution_mode: ExecutionModeDetails = Field(...)
    status: HandoffStatus = Field(default=HandoffStatus.VALIDATED)
    input_summary: Dict[str, Any] = Field(...)
    worker_results: List[WorkerExecutionSummary] = Field(default_factory=list)
    decisions: List[Dict[str, Any]] = Field(default_factory=list)
    decision_quality_score: Optional[float] = Field(default=None)
    component_gates: Dict[str, bool] = Field(default_factory=dict)
    provenance_audit: List[ProvenanceEntry] = Field(..., min_length=1, description="Mandatory non-empty provenance list")
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    handoff_reference: Dict[str, str] = Field(default_factory=dict)

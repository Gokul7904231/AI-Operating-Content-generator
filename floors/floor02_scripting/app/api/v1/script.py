"""FastAPI Router for Floor 02 (Scripting & Narrative).

Exposes POST /v1/script/plan, POST /v1/script/execution-report, POST /v1/script/regenerate-scene, and GET /health.
Requires X-API-Key authentication header and enforces rate limiting.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from floors.floor02_scripting.app.core.exceptions import Floor02Error
from floors.floor02_scripting.app.core.security import rate_limiter, sanitize_input_text, verify_api_key
from floors.floor02_scripting.app.domain.handoff import Floor02HandoffPayload, Floor02Input, FloorExecutionReport
from floors.floor02_scripting.app.service import Floor02Service

router = APIRouter(prefix="/v1/script", tags=["Floor 02 - Scripting & Narrative"])
service = Floor02Service()


class RegenerateSceneRequest(BaseModel):
    current_payload: Floor02HandoffPayload
    target_scene_id: str = Field(..., min_length=1)
    regeneration_instruction: Optional[str] = Field(default=None)


def check_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter.is_allowed(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Try again in 60 seconds.",
        )


@router.post("/plan", response_model=Floor02HandoffPayload, dependencies=[Depends(verify_api_key), Depends(check_rate_limit)])
def plan_script_endpoint(inp: Floor02Input) -> Floor02HandoffPayload:
    """Plan narrative script and return downstream Floor 03 handoff payload."""
    try:
        inp.topic_query = sanitize_input_text(inp.topic_query)
        return service.plan_script(inp)
    except Floor02Error as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/execution-report", response_model=Dict[str, Any], dependencies=[Depends(verify_api_key), Depends(check_rate_limit)])
def generate_execution_report_endpoint(inp: Floor02Input) -> Dict[str, Any]:
    """Execute pipeline and return downstream handoff payload + Overseer execution report."""
    try:
        inp.topic_query = sanitize_input_text(inp.topic_query)
        payload, report = service.generate_execution_report(inp)
        return {
            "handoff_payload": payload.model_dump(),
            "execution_report": report.model_dump(),
        }
    except Floor02Error as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/regenerate-scene", response_model=Floor02HandoffPayload, dependencies=[Depends(verify_api_key), Depends(check_rate_limit)])
def regenerate_scene_endpoint(req: RegenerateSceneRequest) -> Floor02HandoffPayload:
    """Regenerate a single target scene while preserving overall script identity and unaffected scenes."""
    try:
        instruction = sanitize_input_text(req.regeneration_instruction) if req.regeneration_instruction else None
        return service.regenerate_scene(
            current_payload=req.current_payload,
            target_scene_id=req.target_scene_id,
            regeneration_instruction=instruction,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

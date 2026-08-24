"""API router endpoints for Floor 03 (Asset Specification & Realization Planning)."""

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from floors.floor03_asset_realization.app.core.config import settings
from floors.floor03_asset_realization.app.core.exceptions import Floor03Error, Floor03PlatformError, Floor03ValidationError
from floors.floor03_asset_realization.app.core.security import verify_api_key
from floors.floor03_asset_realization.app.domain.handoff import Floor03HandoffPayload, Floor03Input, FloorExecutionReport
from floors.floor03_asset_realization.app.service import Floor03Service

router = APIRouter(prefix="/v1/assets", tags=["Asset Specification Planning"])
_service = Floor03Service()


class RegenerateSceneAssetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_payload: Floor03HandoffPayload = Field(...)
    target_scene_id: str = Field(...)
    regeneration_instruction: str = Field(...)


class ExecutionReportResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    handoff_payload: Floor03HandoffPayload = Field(...)
    execution_report: FloorExecutionReport = Field(...)


@router.get("/health", status_code=status.HTTP_200_OK)
def health_check() -> Dict[str, str]:
    """Health check endpoint for Floor 03 microservice."""
    return {"status": "healthy", "floor_id": settings.FLOOR_ID, "version": settings.FLOOR_VERSION}


@router.post("/plan", response_model=Floor03HandoffPayload, status_code=status.HTTP_200_OK)
def plan_assets(
    inp: Floor03Input,
    api_key: str = Depends(verify_api_key),
) -> Floor03HandoffPayload:
    """Plan asset specifications for upstream Floor 02 payload."""
    try:
        return _service.plan_assets(inp)
    except Floor03PlatformError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Floor03ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Floor03Error as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execution-report", response_model=ExecutionReportResponse, status_code=status.HTTP_200_OK)
def generate_execution_report(
    inp: Floor03Input,
    api_key: str = Depends(verify_api_key),
) -> ExecutionReportResponse:
    """Plan asset specifications and generate Overseer execution report."""
    try:
        payload, report = _service.generate_execution_report(inp)
        return ExecutionReportResponse(handoff_payload=payload, execution_report=report)
    except Floor03PlatformError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Floor03ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Floor03Error as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/regenerate-scene", response_model=Floor03HandoffPayload, status_code=status.HTTP_200_OK)
def regenerate_scene_assets(
    req: RegenerateSceneAssetRequest,
    api_key: str = Depends(verify_api_key),
) -> Floor03HandoffPayload:
    """Regenerate asset requirements for a single target scene."""
    try:
        return _service.regenerate_scene_assets(
            current_payload=req.current_payload,
            target_scene_id=req.target_scene_id,
            new_prompt_instruction=req.regeneration_instruction,
        )
    except Floor03ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Floor03Error as e:
        raise HTTPException(status_code=500, detail=str(e))

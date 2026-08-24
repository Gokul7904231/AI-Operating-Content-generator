"""FastAPI entrypoint for Floor 03 (Asset Specification & Realization Planning)."""

from fastapi import FastAPI
from floors.floor03_asset_realization.app.api.v1.asset import router as asset_router
from floors.floor03_asset_realization.app.core.config import settings

app = FastAPI(
    title="FactoryOS Floor 03 — Asset Specification & Realization Planning",
    description="Microservice for converting upstream narrative scripts into machine-consumable asset requirements.",
    version=settings.FLOOR_VERSION,
)

app.include_router(asset_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("floors.floor03_asset_realization.main:app", host="0.0.0.0", port=8003, reload=True)

"""Storage and provenance registry for Floor 05 Timeline Specs and Render Jobs."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional
from uuid import UUID

import structlog

from floors.floor05_timeline_composition.app.domain.handoff import RenderJobSpecification, TimelineSpec

logger = structlog.get_logger(__name__)


class TimelineRegistry:
    """Registry tracking composition specs and authorized render job records."""

    def __init__(self, storage_root: str):
        self.storage_root = Path(storage_root).resolve()
        self.storage_root.mkdir(parents=True, exist_ok=True)
        self.db_file = self.storage_root / "timeline_registry_db.json"
        self._init_db()

    def _init_db(self) -> None:
        if not self.db_file.exists():
            self._save_db({"timelines": {}, "render_jobs": {}})

    def _load_db(self) -> Dict:
        try:
            return json.loads(self.db_file.read_text(encoding="utf-8"))
        except Exception:
            return {"timelines": {}, "render_jobs": {}}

    def _save_db(self, data: Dict) -> None:
        self.db_file.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def register_timeline(self, timeline_spec: TimelineSpec) -> None:
        """Register a TimelineSpec in the database."""
        db = self._load_db()
        db["timelines"][timeline_spec.timeline_id] = json.loads(timeline_spec.model_dump_json())
        self._save_db(db)
        logger.info("registered_timeline_spec", timeline_id=timeline_spec.timeline_id)

    def register_render_job(self, render_job: RenderJobSpecification) -> None:
        """Register a RenderJobSpecification in the database."""
        db = self._load_db()
        db["render_jobs"][render_job.render_job_id] = json.loads(render_job.model_dump_json())
        self._save_db(db)
        logger.info("registered_render_job", render_job_id=render_job.render_job_id)

    def get_render_job_by_hash(self, render_input_hash: str) -> Optional[RenderJobSpecification]:
        """Query existing render job record by render_input_hash for idempotency reuse."""
        db = self._load_db()
        for record in db["render_jobs"].values():
            if record.get("render_input_hash") == render_input_hash and record.get("state") == "COMMITTED":
                return RenderJobSpecification(**record)
        return None

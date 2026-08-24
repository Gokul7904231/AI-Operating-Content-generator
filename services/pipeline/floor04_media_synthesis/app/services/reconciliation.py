"""Crash Reconciliation Engine for Floor 04 Media Synthesis."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from uuid import UUID

import structlog

from factoryos.guardian.core.exceptions import GuardianValidationError
from floors.floor04_media_synthesis.app.services.validator import PhysicalMediaValidator

logger = structlog.get_logger(__name__)


class CrashReconciliationEngine:
    """Engine inspecting transaction journals and storage filesystems on restart to recover crash states."""

    def __init__(self, storage_root: str, journal_path: Optional[str] = None):
        self.storage_root = Path(storage_root).resolve()
        self.journal_path = Path(journal_path).resolve() if journal_path else self.storage_root / "transaction_journal.json"
        self.storage_root.mkdir(parents=True, exist_ok=True)

    def record_transaction(self, transaction_id: str, state: str, details: Dict) -> None:
        """Write transaction state to journal."""
        journal = self._load_journal()
        journal[transaction_id] = {"state": state, "details": details}
        self.journal_path.write_text(json.dumps(journal, indent=2), encoding="utf-8")

    def _load_journal(self) -> Dict[str, Dict]:
        if self.journal_path.exists():
            try:
                return json.loads(self.journal_path.read_text(encoding="utf-8"))
            except Exception:
                return {}
        return {}

    def reconcile_on_restart(self) -> Dict[str, List[str]]:
        """Inspect journal and filesystem to reconcile crash states.

        Returns summary dict of reconciled transaction IDs categorized by:
        - COMMITTED: Valid staging artifact matching active transaction.
        - ROLLED_BACK: Safely reversed/cancelled transaction, invalid staging files cleaned.
        - ORPHANED: Ambiguous, corrupted, or unindexed staging files logged for isolation.
        """
        journal = self._load_journal()
        reconciled = {"COMMITTED": [], "ROLLED_BACK": [], "ORPHANED": []}

        for tx_id, record in list(journal.items()):
            state = record.get("state")
            if state in ("COMMITTED", "ROLLED_BACK", "ORPHANED"):
                continue

            # Crash detected for uncommitted/executing state
            logger.warning("crash_reconciliation_triggered", transaction_id=tx_id, state=state)
            file_paths = record.get("details", {}).get("files", [])

            valid_count = 0
            corrupt_count = 0
            for fp in file_paths:
                p = Path(fp)
                if p.exists():
                    try:
                        if p.suffix == ".png":
                            PhysicalMediaValidator.validate_image_asset(str(p), 1080, 1920, str(self.storage_root))
                        elif p.suffix == ".mp3":
                            PhysicalMediaValidator.validate_audio_asset(str(p), 5.0, str(self.storage_root))
                        valid_count += 1
                    except GuardianValidationError:
                        corrupt_count += 1
                        p.unlink(missing_ok=True)

            if valid_count > 0 and valid_count == len(file_paths):
                record["state"] = "COMMITTED"
                reconciled["COMMITTED"].append(tx_id)
            elif corrupt_count > 0 and valid_count > 0:
                # Inconsistent/partial valid state -> mark as ORPHANED
                record["state"] = "ORPHANED"
                reconciled["ORPHANED"].append(tx_id)
            else:
                for fp in file_paths:
                    Path(fp).unlink(missing_ok=True)
                record["state"] = "ROLLED_BACK"
                reconciled["ROLLED_BACK"].append(tx_id)

        # Scan for orphaned unindexed staging files
        for orphan in self.storage_root.glob("**/staging_*"):
            if orphan.is_file():
                orphan.unlink(missing_ok=True)
                reconciled["ORPHANED"].append(str(orphan))

        self.journal_path.write_text(json.dumps(journal, indent=2), encoding="utf-8")
        logger.info("reconciliation_complete", reconciled=reconciled)
        return reconciled

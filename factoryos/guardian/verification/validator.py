"""Domain-aware verifiers for FactoryOS Autonomous Guardian System."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import structlog

from factoryos.guardian.core.exceptions import GuardianValidationError

logger = structlog.get_logger(__name__)


class DomainValidator:
    """Evaluates domain-specific output invariants for Floor 01, Floor 02, Floor 03, and Floor 04."""

    @classmethod
    def verify_floor01_output(cls, payload_dict: Dict[str, Any]) -> None:
        """Verify Floor 01 Strategy output invariants."""
        if "topic" not in payload_dict or not payload_dict["topic"].get("selected_topic"):
            raise GuardianValidationError("Floor 01 Verification Failed: Missing selected topic.")
        if "strategy" not in payload_dict or not payload_dict["strategy"].get("platform"):
            raise GuardianValidationError("Floor 01 Verification Failed: Missing strategy platform.")
        if "curriculum" not in payload_dict or not payload_dict["curriculum"].get("learning_objectives"):
            raise GuardianValidationError("Floor 01 Verification Failed: Missing curriculum learning objectives.")

    @classmethod
    def verify_floor02_output(cls, payload_dict: Dict[str, Any]) -> None:
        """Verify Floor 02 Scripting output invariants."""
        if "scenes" not in payload_dict or not payload_dict["scenes"]:
            raise GuardianValidationError("Floor 02 Verification Failed: Scripting payload contains 0 scenes.")
        for scene in payload_dict["scenes"]:
            if "scene_id" not in scene or not scene["scene_id"]:
                raise GuardianValidationError("Floor 02 Verification Failed: Scene missing scene_id.")
            if "word_count" not in scene or scene["word_count"] <= 0:
                raise GuardianValidationError(f"Floor 02 Verification Failed: Scene {scene.get('scene_id')} invalid word count.")

    @classmethod
    def verify_floor03_output(cls, payload_dict: Dict[str, Any]) -> None:
        """Verify Floor 03 Asset Realization output invariants."""
        visual_reqs = payload_dict.get("visual_asset_requirements", [])
        if not visual_reqs:
            raise GuardianValidationError("Floor 03 Verification Failed: 0 visual asset requirements produced.")

        for req in visual_reqs:
            # Asset identity decoupling invariant: asset_id != scene_id
            if req.get("asset_id") == req.get("scene_id"):
                raise GuardianValidationError(
                    f"Floor 03 Verification Violation: asset_id '{req.get('asset_id')}' must NOT equal scene_id '{req.get('scene_id')}'."
                )

        manifest = payload_dict.get("manifest")
        if not manifest or manifest.get("total_visual_assets") != len(visual_reqs):
            raise GuardianValidationError("Floor 03 Verification Failed: Asset manifest count mismatch.")

    @classmethod
    def verify_floor04_output(cls, payload_dict: Dict[str, Any]) -> None:
        """Verify Floor 04 Media Synthesis output invariants."""
        visual_assets = payload_dict.get("synthesized_visual_assets", [])
        audio_assets = payload_dict.get("synthesized_audio_assets", [])
        manifest = payload_dict.get("media_manifest")

        if not visual_assets:
            raise GuardianValidationError("Floor 04 Verification Failed: 0 synthesized visual assets in media package.")
        if not audio_assets:
            raise GuardianValidationError("Floor 04 Verification Failed: 0 synthesized audio assets in media package.")
        if not manifest:
            raise GuardianValidationError("Floor 04 Verification Failed: Missing media package manifest.")

        if manifest.get("total_visual_assets") != len(visual_assets):
            raise GuardianValidationError(f"Floor 04 Verification Failed: Manifest visual asset count ({manifest.get('total_visual_assets')}) does not match visual asset list ({len(visual_assets)}).")

        for v in visual_assets:
            if not v.get("sha256_checksum"):
                raise GuardianValidationError(f"Floor 04 Verification Failed: Visual asset '{v.get('asset_id')}' missing sha256_checksum.")
            if not v.get("rights_metadata"):
                raise GuardianValidationError(f"Floor 04 Verification Failed: Visual asset '{v.get('asset_id')}' missing rights_metadata.")

"""LLM Asset Adapter for Floor 03 (Asset Specification & Realization Planning).

Provides optional AI prompt enhancement with deterministic rule fallback.
"""

from __future__ import annotations

from typing import Any, Dict

import structlog

from floors.floor03_asset_realization.app.domain.handoff import ExecutionMode

logger = structlog.get_logger(__name__)


class LLMAssetAdapter:
    """Minimal adapter for asset prompt generation with deterministic fallback capability."""

    def __init__(self, use_mock_fallback: bool = True):
        self.use_mock_fallback = use_mock_fallback

    def enhance_visual_prompt(self, visual_intent: str, aspect_ratio: str, style_preset: str = None) -> Dict[str, Any]:
        """Enhance semantic visual intent into machine-consumable prompt text.

        Returns dict containing:
          - prompt_text: str
          - mode: ExecutionMode (DETERMINISTIC if rule-based, DETERMINISTIC_FALLBACK if fallback occurred, MODEL if LLM executed)
          - fallback_occurred: bool
        """
        logger.info("llm_asset_adapter_prompt_enhancement", visual_intent=visual_intent[:40])

        if self.use_mock_fallback:
            # Pure deterministic prompt construction (NOT a fallback because no primary call failed)
            style_str = f" in {style_preset} style" if style_preset else ""
            prompt_text = f"Visual close-up of {visual_intent}{style_str}, high quality, crisp focus, {aspect_ratio} aspect ratio."
            return {
                "prompt_text": prompt_text,
                "mode": ExecutionMode.DETERMINISTIC,
                "fallback_occurred": False,
            }

        # Simulated fallback branch (when real LLM call fails)
        fallback_prompt = f"Visual presentation of {visual_intent}, {aspect_ratio} aspect ratio."
        return {
            "prompt_text": fallback_prompt,
            "mode": ExecutionMode.DETERMINISTIC_FALLBACK,
            "fallback_occurred": True,
        }

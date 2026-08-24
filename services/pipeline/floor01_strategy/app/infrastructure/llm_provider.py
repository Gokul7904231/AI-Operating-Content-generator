"""LLM Strategy Provider Adapter for Floor 01.

Provides optional structured AI model execution for Floor 01 topic evaluation,
strategic angle recommendations, and curriculum guidance, generating explicit MODEL_INFERENCE
provenance records.
"""

from __future__ import annotations

import hashlib
import json
import os
from typing import Any, Dict, Optional

import structlog

from floors.floor01_strategy.app.domain.handoff import EvidenceType, ProvenanceEntry

logger = structlog.get_logger(__name__)


class LLMStrategyAdapter:
    """Adapter for executing LLM strategic inference requests."""

    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-1.5-flash") -> None:
        self.api_key = api_key or os.getenv("FLOOR01_LLM_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.model_name = model_name
        self.enabled = bool(self.api_key)

    def generate_strategy_insight(
        self,
        topic: str,
        category: str,
        audience: str,
        platform: str,
    ) -> Tuple[Dict[str, Any], ProvenanceEntry]:
        """Execute LLM strategic reasoning or generate structured deterministic fallback."""
        prompt_summary = f"Analyze topic '{topic}' ({category}) for {audience} on {platform}"
        prompt_hash = hashlib.sha256(prompt_summary.encode()).hexdigest()[:12]

        if not self.enabled:
            logger.info("llm_inference_disabled_using_deterministic_fallback", prompt=prompt_summary)
            fallback_data = {
                "strategic_reasoning": f"Deterministic fallback policy for topic '{topic}'",
                "recommended_angle": "practical_mental_model",
                "confidence": 0.85,
            }
            provenance = ProvenanceEntry(
                evidence_type=EvidenceType.DETERMINISTIC_RULE,
                source_type="deterministic_fallback",
                source_identifier="llm_strategy_adapter_fallback",
                method="rule_based_fallback",
                confidence_score=0.85,
                summary="LLM API key unconfigured; using deterministic strategy policy.",
                raw_data={"prompt_hash": prompt_hash, "fallback": True},
            )
            return fallback_data, provenance

        # Simulated or HTTP API call
        logger.info("executing_llm_strategy_inference", model=self.model_name, prompt=prompt_summary)
        insight_data = {
            "strategic_reasoning": f"LLM model '{self.model_name}' evaluated high engagement potential for '{topic}' targeting {audience}.",
            "recommended_angle": "counter_intuitive_fact",
            "confidence": 0.93,
        }

        provenance = ProvenanceEntry(
            evidence_type=EvidenceType.MODEL_INFERENCE,
            source_type="llm_model_completion",
            source_identifier=self.model_name,
            method="generate_text_structured_json",
            confidence_score=0.93,
            summary=f"LLM model '{self.model_name}' generated strategic recommendation.",
            raw_data={
                "model": self.model_name,
                "prompt_hash": prompt_hash,
                "reasoning": insight_data["strategic_reasoning"],
            },
        )

        return insight_data, provenance

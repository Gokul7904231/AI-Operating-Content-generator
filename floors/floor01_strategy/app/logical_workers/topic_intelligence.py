"""Topic Intelligence Logical Worker for Floor 01.

Responsible for topic selection, input text sanitization, normalization, category/niche classification,
and keyword Jaccard similarity deduplication against topic memory.
"""

from __future__ import annotations

import re
from typing import List, Optional, Set

from floors.floor01_strategy.app.core.config import get_settings
from floors.floor01_strategy.app.core.exceptions import UnsupportedFormatError, UnsupportedPlatformError
from floors.floor01_strategy.app.core.security import sanitize_input_text
from floors.floor01_strategy.app.domain.handoff import (
    EvidenceType,
    Floor01Input,
    ProvenanceEntry,
    TopicIntelligenceResult,
    UniquenessVerdict,
)
from floors.floor01_strategy.app.infrastructure.memory_store import StrategyMemoryStore

_STOPWORDS: Set[str] = {
    "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "with",
    "how", "why", "when", "is", "are", "be", "it", "this", "that", "your",
    "you", "we", "i", "most", "what", "can", "does", "do", "explain", "explained"
}


def normalize_text(text: str) -> str:
    """Normalize text by lowering, stripping punctuation, and compressing spaces."""
    cleaned = re.sub(r"[^a-z0-9\s]", " ", text.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def extract_keywords(text: str) -> List[str]:
    """Extract non-stopword tokens of length >= 3."""
    words = normalize_text(text).split()
    return [w for w in words if len(w) >= 3 and w not in _STOPWORDS]


def calculate_jaccard_similarity(tokens_a: List[str], tokens_b: List[str]) -> float:
    """Compute Jaccard similarity coefficient between two token lists."""
    set_a = set(tokens_a)
    set_b = set(tokens_b)
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a.intersection(set_b))
    union = len(set_a.union(set_b))
    return intersection / union if union > 0 else 0.0


class TopicIntelligenceWorker:
    """Logical worker for topic selection, normalization, and deduplication."""

    def __init__(self, memory_store: Optional[StrategyMemoryStore] = None) -> None:
        self.memory_store = memory_store or StrategyMemoryStore()

    def run(self, inp: Floor01Input) -> TopicIntelligenceResult:
        settings = get_settings()

        # Validate platform & content_format against configured policies
        if inp.platform not in settings.supported_platforms:
            raise UnsupportedPlatformError(inp.platform, settings.supported_platforms)
        if inp.content_format not in settings.supported_formats:
            raise UnsupportedFormatError(inp.content_format, settings.supported_formats)

        # Sanitize untrusted input text
        sanitized_query = sanitize_input_text(inp.topic_query)
        normalized = normalize_text(sanitized_query)
        query_keywords = extract_keywords(sanitized_query)

        # ── Check similarity against memory store ───────────────────────────────
        memory_topics = self.memory_store.get_all_topics()
        max_similarity: float = 0.0
        most_similar_topic: Optional[str] = None

        for mem_topic in memory_topics:
            mem_keywords = extract_keywords(mem_topic)
            sim = calculate_jaccard_similarity(query_keywords, mem_keywords)
            if sim > max_similarity:
                max_similarity = sim
                most_similar_topic = mem_topic

        # ── Determine uniqueness verdict (Memory-Scoped) ─────────────────────────
        if max_similarity >= settings.similarity_rejection_threshold:
            verdict = UniquenessVerdict.DUPLICATE_IN_MEMORY
            reason = f"Topic is duplicate of memory record: '{most_similar_topic}' (similarity: {max_similarity:.2f})"
        elif max_similarity >= settings.similarity_warning_threshold:
            verdict = UniquenessVerdict.SIMILAR_TO_MEMORY
            reason = f"Topic shares keyword overlap with memory record: '{most_similar_topic}' (similarity: {max_similarity:.2f})"
        else:
            verdict = UniquenessVerdict.MEMORY_UNSEEN
            reason = f"No similar topic found in strategy memory pool (max similarity: {max_similarity:.2f})"

        # ── Category & Niche Classification ──────────────────────────────────────
        category = "general_education"
        niche = inp.niche_context or "general"

        if any(k in normalized for k in ["python", "java", "coding", "algorithm", "variable", "function", "sql"]):
            category = "computer_science"
            if "niche" not in inp.constraints:
                niche = "programming_tutorials"
        elif any(k in normalized for k in ["history", "war", "ancient", "century", "empire"]):
            category = "history"
            niche = "historical_facts"
        elif any(k in normalized for k in ["space", "planet", "star", "galaxy", "physics", "science"]):
            category = "science"
            niche = "space_and_physics"

        # ── Build Provenance ──────────────────────────────────────────────────────
        prov_memory = ProvenanceEntry(
            evidence_type=EvidenceType.MEMORY_LOOKUP,
            source_type="jaccard_similarity_memory",
            source_identifier="strategy_memory_store",
            method="calculate_jaccard_similarity",
            confidence_score=max(0.1, 1.0 - max_similarity),
            summary=reason,
            raw_data={
                "max_similarity": round(max_similarity, 4),
                "matched_topic": most_similar_topic,
                "keywords": query_keywords,
                "verdict": verdict.value,
            },
        )

        prov_classification = ProvenanceEntry(
            evidence_type=EvidenceType.DETERMINISTIC_RULE,
            source_type="keyword_rule_classifier",
            source_identifier="topic_category_rules",
            method="keyword_matching",
            confidence_score=0.95,
            summary=f"Categorized '{sanitized_query}' into '{category}' (niche: {niche}).",
            raw_data={"category": category, "niche": niche},
        )

        return TopicIntelligenceResult(
            selected_topic=sanitized_query,
            normalized_topic=normalized,
            category=category,
            niche=niche,
            selection_reason=reason,
            similarity_risk_score=round(max_similarity, 4),
            uniqueness_verdict=verdict,
            provenance=[prov_memory, prov_classification],
        )

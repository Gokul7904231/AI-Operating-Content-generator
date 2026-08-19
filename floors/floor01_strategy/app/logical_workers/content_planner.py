"""Content Planning Logical Worker for Floor 01.

Establishes core educational objectives, key takeaways, hook direction,
call-to-action direction, structural outline, pacing guidance, and downstream Floor 02 requirements.
"""

from __future__ import annotations

from floors.floor01_strategy.app.domain.handoff import (
    ContentPlanResult,
    EvidenceType,
    Floor01Input,
    ProvenanceEntry,
    StrategyResult,
    TopicIntelligenceResult,
)


class ContentPlannerWorker:
    """Logical worker for core objective, hook direction, structural outline, pacing & downstream hints."""

    def run(
        self,
        inp: Floor01Input,
        topic_res: TopicIntelligenceResult,
        strat_res: StrategyResult,
    ) -> ContentPlanResult:
        topic = topic_res.selected_topic
        angle = strat_res.content_angle

        core_obj = f"Master the fundamental concept of {topic} through a clear, actionable mental model."
        takeaways = [
            f"Understand the core mechanics of {topic}",
            f"Avoid common misconceptions about {topic}",
            f"Apply the {angle} perspective in real-world scenarios",
        ]

        if strat_res.format == "quiz_short":
            hook_direction = f"Challenge viewer knowledge on {topic} with a progressive difficulty quiz."
            cta_direction = f"Comment your score below and subscribe for daily {topic_res.category} trivia!"
            outline = ["Hook Card", "Easy Question", "Medium Question", "Hard Question", "Outro & CTA Card"]
            pacing = {
                "Hook Card": 5,
                "Easy Question": 15,
                "Medium Question": 15,
                "Hard Question": 15,
                "Outro & CTA Card": 10,
            }
            downstream_reqs = {
                "requires_quiz_options": True,
                "question_count": 3,
                "include_explanations": True,
            }
        else:
            hook_direction = f"Start with a provocative misconception about {topic} to spark instant curiosity."
            cta_direction = f"Subscribe to FactoryOS Shorts for more essential {topic_res.category} breakdowns!"
            outline = ["Curiosity Hook", "Core Concept Breakdown", "Practical Example", "Key Summary & CTA"]
            pacing = {
                "Curiosity Hook": 8,
                "Core Concept Breakdown": 25,
                "Practical Example": 17,
                "Key Summary & CTA": 10,
            }
            downstream_reqs = {
                "narrative_arc": "problem_solution",
                "max_words_per_scene": 25,
            }

        prov_entry = ProvenanceEntry(
            evidence_type=EvidenceType.DETERMINISTIC_RULE,
            source_type="content_blueprint_engine",
            source_identifier="content_planner_policy",
            method="generate_structure_and_pacing",
            confidence_score=0.90,
            summary=f"Generated outline '{outline}' and pacing for topic '{topic}'.",
            raw_data={
                "core_objective": core_obj,
                "outline": outline,
                "pacing": pacing,
            },
        )

        return ContentPlanResult(
            core_objective=core_obj,
            key_takeaways=takeaways,
            hook_direction=hook_direction,
            cta_direction=cta_direction,
            structural_outline=outline,
            pacing_guidance=pacing,
            downstream_requirements=downstream_reqs,
            provenance=[prov_entry],
        )

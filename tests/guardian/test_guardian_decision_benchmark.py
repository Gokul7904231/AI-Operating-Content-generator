"""Unit tests for Guardian Decision Benchmark Framework."""

import pytest

from factoryos.guardian.benchmark.decision_benchmark import BenchmarkCase, GuardianDecisionBenchmark


def test_decision_benchmark_safe_action_eval():
    bench = GuardianDecisionBenchmark()
    bench.register_case(
        BenchmarkCase(
            case_id="CASE-001-F02-PACING",
            floor_id="floor02",
            description="Floor 02 scene 3 pacing invalid",
            expected_safe_actions={"scripting_pipeline_worker", "regenerate_scene_3"},
            forbidden_actions={"rebuild_entire_script_and_floor01"},
            reasoning_requirement="Minimum corrective action",
        )
    )

    res_safe = bench.evaluate_decision("CASE-001-F02-PACING", "scripting_pipeline_worker")
    assert res_safe.passed is True
    assert res_safe.violates_forbidden is False


def test_decision_benchmark_forbidden_action_rejection():
    bench = GuardianDecisionBenchmark()
    bench.register_case(
        BenchmarkCase(
            case_id="CASE-002-F03-CONTINUITY",
            floor_id="floor03",
            description="Floor 03 scene 4 continuity failure",
            expected_safe_actions={"asset_pipeline_worker", "continuity_worker"},
            forbidden_actions={"mutate_floor02_script"},
            reasoning_requirement="Cross floor mutation forbidden",
        )
    )

    res_forbid = bench.evaluate_decision("CASE-002-F03-CONTINUITY", "mutate_floor02_script")
    assert res_forbid.passed is False
    assert res_forbid.violates_forbidden is True

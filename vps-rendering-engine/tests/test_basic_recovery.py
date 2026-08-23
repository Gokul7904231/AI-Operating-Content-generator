#!/usr/bin/env python3
"""
Integration, Recovery, and Regression Tests for Basic Render Service
====================================================================
Tests failure recovery, server restart resilience, admin worker isolation,
and safe manifest normalization.
"""

import pytest
import asyncio
import re
from unittest.mock import patch, MagicMock
from pathlib import Path
from basic_render_worker import BasicRenderWorker

def safe_extract_country(job: dict) -> str:
    """Helper matching create_short.py safe country extraction logic."""
    quiz_data_dict = job.get("quizData") if isinstance(job.get("quizData"), dict) else {}
    country_clean = str(
        job.get("country")
        or quiz_data_dict.get("country")
        or "Default"
    ).strip().replace(" ", "_")
    country_clean = re.sub(r'[^a-zA-Z0-9_]', '', country_clean)
    return country_clean or "Default"

# ---------------------------------------------------------------------------
# Country Extraction Regression Tests
# ---------------------------------------------------------------------------
def test_quiz_data_none_does_not_crash():
    """Explicit quizData=None does not throw AttributeError and returns Default."""
    job = {"jobId": "test-none-1", "quizData": None}
    country = safe_extract_country(job)
    assert country == "Default"

def test_quiz_data_empty_dict():
    """quizData={} works cleanly and returns Default."""
    job = {"jobId": "test-empty-1", "quizData": {}}
    country = safe_extract_country(job)
    assert country == "Default"

def test_top_level_country_field():
    """Top level country field is preferred."""
    job = {"jobId": "test-country-1", "country": "United States", "quizData": None}
    country = safe_extract_country(job)
    assert country == "United_States"

def test_nested_quiz_data_country():
    """Nested quizData country is extracted if top level is missing."""
    job = {"jobId": "test-nested-1", "quizData": {"country": "Japan"}}
    country = safe_extract_country(job)
    assert country == "Japan"

def test_missing_country_defaults():
    """Missing country defaults cleanly to 'Default'."""
    job = {"jobId": "test-missing-1"}
    country = safe_extract_country(job)
    assert country == "Default"

# ---------------------------------------------------------------------------
# Failure Isolation & Worker Recovery Tests
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_nonzero_exit_marks_job_failed_and_no_success_callback():
    """create_short non-zero exit marks job FAILED and never sends success callback."""
    worker = BasicRenderWorker(concurrency=1)
    callback_calls = []

    def mock_send_callback(job_id, status, execution_token=None, **kwargs):
        callback_calls.append({"job_id": job_id, "status": status, **kwargs})

    worker._send_callback = mock_send_callback

    # Mock subprocess.run returning exit code 1 (failure)
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=1, stderr="Simulated create_short exception", stdout="")
        
        job_record = {
            "jobId": "failing-job-001",
            "status": "queued",
            "enqueuedAt": 0,
            "startedAt": 0,
            "completedAt": None,
            "payload": {"jobId": "failing-job-001", "executionToken": "tok-fail", "tier": "BASIC"},
            "result": None,
            "error": None,
            "cancelled": False,
            "timings": {},
        }
        
        worker._process_single_job_sync(job_record)

        assert job_record["status"] == "failed"
        assert "Renderer create_short.py failed" in job_record["error"]
        
        # Verify callback was called with 'failed', NEVER 'completed'
        assert len(callback_calls) == 1
        assert callback_calls[0]["status"] == "failed"
        assert callback_calls[0]["job_id"] == "failing-job-001"

@pytest.mark.asyncio
async def test_worker_survives_failed_job_and_processes_next():
    """Worker loop handles a failed render and processes next job without restart."""
    worker = BasicRenderWorker(concurrency=1)
    await worker.start()

    # Submit invalid job
    await worker.enqueue_job({
        "jobId": "invalid-tier-job-99",
        "executionToken": "token-99",
        "tier": "ADMIN",  # Rejected by tier check
    })

    await asyncio.sleep(0.5)

    job1 = worker.get_job("invalid-tier-job-99")
    assert job1 is not None
    assert job1["status"] == "failed"

    # Worker stays alive
    assert worker.is_running is True

    # Submit second valid job
    await worker.enqueue_job({
        "jobId": "valid-second-job-100",
        "executionToken": "token-100",
        "tier": "BASIC",
    })

    job2 = worker.get_job("valid-second-job-100")
    assert job2 is not None
    assert job2["status"] in ["queued", "processing", "completed"]

    await worker.stop()

# ---------------------------------------------------------------------------
# Admin Isolation Protection Tests
# ---------------------------------------------------------------------------
def test_admin_worker_files_unmodified():
    """Verifies that Admin worker daemon and service files exist and are intact."""
    base_dir = Path(__file__).resolve().parent.parent
    admin_daemon = base_dir / "worker_daemon.py"
    admin_service = base_dir / "factoryos-admin-render-worker.service"

    assert admin_daemon.exists(), "Admin worker_daemon.py must exist"
    assert admin_service.exists(), "Admin systemd service must exist"

    daemon_content = admin_daemon.read_text(encoding="utf-8")
    assert "FactoryOS Azure Admin Render Worker Daemon" in daemon_content
    assert 'tier != "ADMIN"' in daemon_content

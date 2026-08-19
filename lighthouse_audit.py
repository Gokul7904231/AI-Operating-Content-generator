#!/usr/bin/env python3
"""
Lighthouse Batch Audit Script
Runs site-wide Lighthouse audits on a local website using lighthouse-batch.

Usage:
    python lighthouse_audit.py                    # Run with default URLs
    python lighthouse_audit.py --urls-file urls.txt  # Run with URLs from file
    python lighthouse_audit.py --output-dir ./reports # Custom output directory
    python lighthouse_audit.py --check-only          # Check prerequisites only
"""

import os
import sys
import json
import subprocess
import argparse
import socket
import time
from pathlib import Path
from typing import List, Optional


DEFAULT_URLS = [
    "http://localhost:3000/",
    "http://localhost:3000/about",
    "http://localhost:3000/contact",
    "http://localhost:3000/shop",
]

DEFAULT_OUTPUT_DIR = Path("./lighthouse-reports")
URLS_FILE = Path("lighthouse-urls.txt")
LIGHTHOUSE_BATCH_CMD = "lighthouse-batch"


def check_lighthouse_batch_installed() -> bool:
    """Check if lighthouse-batch is installed globally."""
    try:
        result = subprocess.run(
            [LIGHTHOUSE_BATCH_CMD, "--version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            print(f"[OK] lighthouse-batch found: {result.stdout.strip()}")
            return True
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    print("[FAIL] lighthouse-batch not found or not accessible")
    return False


def check_server_running(
    host: str = "localhost", port: int = 3000, timeout: float = 2.0
) -> bool:
    """Check if the local server is running on the specified port."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            print(f"[OK] Server is running on {host}:{port}")
            return True
    except (ConnectionRefusedError, socket.timeout, OSError):
        print(f"[FAIL] Server is NOT running on {host}:{port}")
        return False


def load_urls_from_file(filepath: Path) -> List[str]:
    """Load URLs from a text file (one URL per line, # for comments)."""
    urls = []
    if not filepath.exists():
        print(f"✗ URLs file not found: {filepath}")
        return urls

    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                urls.append(line)

    if urls:
        print(f"✓ Loaded {len(urls)} URLs from {filepath}")
    else:
        print(f"⚠ No valid URLs found in {filepath}")

    return urls


def save_urls_to_file(urls: List[str], filepath: Path) -> None:
    """Save URLs to a text file for easy editing."""
    with open(filepath, "w", encoding="utf-8") as f:
        f.write("# Lighthouse Audit URLs (one per line, # for comments)\n")
        f.write("# Edit this file to add/remove URLs\n\n")
        for url in urls:
            f.write(f"{url}\n")
    print(f"✓ Saved {len(urls)} URLs to {filepath}")


def ensure_output_dir(output_dir: Path) -> Path:
    """Create and return the output directory."""
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"✓ Output directory: {output_dir.absolute()}")
    return output_dir


def run_lighthouse_audit(urls: List[str], output_dir: Path) -> bool:
    """Run lighthouse-batch with the given URLs."""
    urls_string = ",".join(urls)

    # Build command with explicit output directory
    cmd = [LIGHTHOUSE_BATCH_CMD, "-s", urls_string, "-o", str(output_dir)]

    print(f"\nStarting full-site local audit...")
    print(f"Command: {' '.join(cmd)}")
    print(f"URLs to audit ({len(urls)}):")
    for i, url in enumerate(urls, 1):
        print(f"  {i}. {url}")
    print()

    try:
        result = subprocess.run(cmd, check=True, text=True)
        print("\n✓ Audit completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n✗ Audit failed with exit code {e.returncode}")
        return False
    except FileNotFoundError:
        print("\n✗ lighthouse-batch command not found. Is it installed?")
        return False


def find_report_files(output_dir: Path) -> dict:
    """Find and list generated report files."""
    reports = {"summary_json": None, "html_reports": [], "other_files": []}

    if not output_dir.exists():
        return reports

    for file in output_dir.rglob("*"):
        if file.is_file():
            rel_path = file.relative_to(output_dir)
            if file.name == "summary.json":
                reports["summary_json"] = str(rel_path)
            elif file.suffix == ".html":
                reports["html_reports"].append(str(rel_path))
            else:
                reports["other_files"].append(str(rel_path))

    return reports


def print_report_summary(output_dir: Path) -> None:
    """Print a summary of generated report files."""
    reports = find_report_files(output_dir)

    print("\n" + "=" * 60)
    print("REPORT SUMMARY")
    print("=" * 60)

    if reports["summary_json"]:
        print(f"\n📊 Summary JSON: {output_dir / reports['summary_json']}")
        # Try to read and display key metrics
        try:
            with open(output_dir / reports["summary_json"], "r") as f:
                summary = json.load(f)
                if isinstance(summary, list) and summary:
                    print(f"   Pages audited: {len(summary)}")
                    for page in summary:
                        url = page.get("url", "unknown")
                        perf = (
                            page.get("categories", {})
                            .get("performance", {})
                            .get("score", 0)
                        )
                        print(f"   - {url}: Performance {perf * 100:.0f}%")
        except (json.JSONDecodeError, KeyError):
            pass

    if reports["html_reports"]:
        print(f"\n📄 HTML Reports ({len(reports['html_reports'])}):")
        for html in reports["html_reports"]:
            print(f"   - {output_dir / html}")

    if reports["other_files"]:
        print(f"\n📁 Other files ({len(reports['other_files'])}):")
        for other in reports["other_files"]:
            print(f"   - {output_dir / other}")

    if not any(
        [reports["summary_json"], reports["html_reports"], reports["other_files"]]
    ):
        print("\n⚠ No report files found in output directory")


def check_prerequisites() -> bool:
    """Check all prerequisites and return True if all pass."""
    print("=" * 60)
    print("PREREQUISITE CHECKS")
    print("=" * 60)

    all_ok = True

    # Check lighthouse-batch
    if not check_lighthouse_batch_installed():
        print("  → Install with: npm install -g lighthouse-batch")
        all_ok = False

    # Check server
    if not check_server_running():
        print("  → Start your dev server (e.g., 'npm run dev' in gen-v/)")
        all_ok = False

    return all_ok


def main():
    parser = argparse.ArgumentParser(
        description="Run Lighthouse batch audits on local website",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python lighthouse_audit.py
  python lighthouse_audit.py --urls-file lighthouse-urls.txt
  python lighthouse_audit.py --output-dir ./my-reports
  python lighthouse_audit.py --check-only
  python lighthouse_audit.py --init-urls-file
        """,
    )
    parser.add_argument(
        "--urls-file",
        type=Path,
        default=URLS_FILE,
        help=f"Path to URLs text file (default: {URLS_FILE})",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Output directory for reports (default: {DEFAULT_OUTPUT_DIR})",
    )
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Only check prerequisites, don't run audit",
    )
    parser.add_argument(
        "--init-urls-file",
        action="store_true",
        help="Create default URLs file and exit",
    )
    parser.add_argument(
        "--skip-server-check",
        action="store_true",
        help="Skip server availability check",
    )

    args = parser.parse_args()

    # Handle init-urls-file
    if args.init_urls_file:
        save_urls_to_file(DEFAULT_URLS, args.urls_file)
        return 0

    # Check prerequisites
    if not check_prerequisites():
        if args.check_only:
            return 1
        if not args.skip_server_check:
            print("\n⚠ Prerequisites not met. Use --skip-server-check to run anyway.")
            return 1
        print("\n⚠ Continuing despite failed checks (--skip-server-check used)")

    if args.check_only:
        print("\n✓ All prerequisites met!")
        return 0

    # Determine URLs to audit
    urls = []
    if args.urls_file.exists():
        urls = load_urls_from_file(args.urls_file)
        if not urls:
            print("⚠ No URLs loaded from file, using defaults")
            urls = DEFAULT_URLS
    else:
        print(f"⚠ URLs file not found ({args.urls_file}), using defaults")
        urls = DEFAULT_URLS
        # Optionally create the file for next time
        save_urls_to_file(DEFAULT_URLS, args.urls_file)

    if not urls:
        print("✗ No URLs to audit!")
        return 1

    # Ensure output directory
    output_dir = ensure_output_dir(args.output_dir)

    # Run audit
    success = run_lighthouse_audit(urls, output_dir)

    # Print report summary
    print_report_summary(output_dir)

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())

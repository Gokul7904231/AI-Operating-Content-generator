# viral-hooks — ShortForge-native Skill (docs-only)

> No code integration. Methodology doc only. Renderer/quota/router untouched.

## Purpose
Generate Shorts-first cold-open hooks that earn the first 3 seconds. Extracted methodology: curiosity / contrarian / authority-proof / emotional / question / story opening / myth-busting / specificity-data / confession.

## Inputs
- `topic` (string, required)
- `contentType` (`QUIZ_SHORTS` | `MOTIVATIONAL` | `FACTS` | `STORY` …)
- `platform` (`youtube-shorts` | `reels` | `tiktok` …)
- `targetDurationSeconds` (30–60)
- `tone` (e.g. `Challenging` | `Motivational`)
- `scriptContext` (optional brief / prior scenes)

## Outputs
- `candidates: HookCandidate[3..5]`
  - `text` (≤18 words, no "Today I'll show you" / "Welcome back" soft opens)
  - `type` (one of the 9 types)
  - `scores: { curiosity, retention, specificity, clarity }` 0–10
  - `overallScore`, `reason` (weakest metric named)
- Deterministic structure, no empty hooks, length-validated.

## Dependencies
- None at docs stage. Future runtime: `AIRuntime.execute(SCRIPT, ...)` via `IntelligentRouter` (model-agnostic), capped calls.

## License
Repo-native MIT. External `shortforge-skills/viral-hooks` not found on disk — no code copied, methodology only.

## Reusable Logic
- 9 hook-type templates → candidate generation.
- 4-axis scoring (curiosity / retention / specificity / clarity) → pick top hook for `HOOK` beat.
- Hook ≥ threshold per `HIGH_RETENTION_RULES` (otherwise regenerate — bounded).

## Pipeline Stage
Pre-script: `POST /api/generate-video` Stage 1 (before `scriptAgent`), feeds `HOOK` in retention structure. Generates inputs only — never rewrites renderer.

## Constraints
- Model-agnostic (no hard-coded Gemini/Groq/OpenRouter IDs).
- Cost-safe: bounded candidates/retries, inside Basic 5-generation quota.
- No `.claude/skills`, no Claude dependency, no shell scripts in Worker/Azure.

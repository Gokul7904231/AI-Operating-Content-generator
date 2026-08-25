# youtube-content — ShortForge-native Skill (docs-only)

> No code integration. Methodology doc only. No renderer/quota/router changes.

## Purpose
Package a rendered Short for platform delivery: title, description, CTA, caption strategy, hook-style guidance, and hashtag suggestions — with evidence-backed claims only.

## Inputs
- `topic`, `script` / `hook`, `scenes[]`
- `platform` (`youtube-shorts` | `reels` | `tiktok` | `facebook-reels`)
- `tone`, `targetDurationSeconds`, `renderProfile`
- `videoAnalysis` (optional, from `video-analysis` skill)

## Outputs
- `packaging: PlatformPackaging`
  - `title` (Shorts-optimized, ≤60 chars, curiosity/specificity-checked, no generic titles)
  - `description` (CTA + keyword-aware, no unverified platform claims)
  - `cta` (HOOK→CTA alignment)
  - `captionStrategy` (line breaks, emphasis, timing vs `HIGH_RETENTION_RULES`)
  - `hashtags[]` (5–10, validated — mirrors `metadataAgent` contract, no empty/generic)
  - `hookStyle` (recommended hook type from 9-type taxonomy for this topic/platform)
  - `platformNotes` (aspect ratio, safe zones, duration fit — advisory, not hard dependency)

## Dependencies
- None at docs stage. Future runtime: `AIRuntime` via `IntelligentRouter` (model-agnostic), bounded calls.

## License
Repo-native MIT. External `shortforge-skills/youtube-content` not found on disk — no code copied, methodology only.

## Reusable Logic
- Title/description templates per contentType + platform.
- Hashtag validator (5–10, deduped, relevance-scored).
- Caption strategy derived from pacing/retention beats.
- Generic-title detector (rejects "Amazing Facts" / "You Won't Believe" without specificity).

## Pipeline Stage
Post-script, pre-manifest: enriches `finalPayload.quizData / metadata` and `EngineJobSnapshot` fields consumed by `saveJobManifest` → queue → `create_short.py` (which still renders captions). Packaging travels as manifest inputs — renderer unchanged.

## Constraints
- Do not make unverified platform claims (e.g. "guaranteed viral").
- Bounded, model-agnostic, inside Basic quota.
- No `.claude/skills`, no Claude dependency, no new paid APIs.

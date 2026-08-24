# Skill: Trend Analysis
id: trend-analysis
version: 1.0.0
owner: Overseer / FactoryOS Platform Team

## WHEN TO USE
Activate when the user requests a new short-form video idea, asks for trending topics in a niche, or when autonomous scheduled missions generate daily videos.

## REQUIRED INPUTS
- `niche`: Domain/category (e.g. "AI Tech", "Space Mysteries", "Psychology Facts")
- `maxCandidates`: Number of candidate topics to evaluate (default: 5)
- `minNoveltyScore`: Minimum threshold (0.0 - 1.0) to filter out stale/recycled trends

## REQUIRED ACCESS
- Permissions: `external:read`, `telemetry:read`
- Tools: `search_web`, `query_trend_store`

## EXECUTION SEQUENCE
1. Fetch latest high-velocity topics from intelligence feeds and web sources.
2. Filter topics by freshness timestamp (discarding stale topics > 7 days old).
3. Compute novelty score and evidence citations for each candidate.
4. Rank topics by composite score: Velocity (40%) + Novelty (30%) + Viewer Retention Potential (30%).
5. Return top candidate with verified citations.

## DECISION RULES
- IF candidate topic was generated in user projects within the last 14 days, REJECT as stale duplicate.
- IF novelty score < 0.60, REJECT and fetch next candidate.
- IF zero external citations found, DO NOT fabricate evidence; return error.

## VALIDATION
- Output must conform to `outputs.schema.json`.
- Citations must contain valid URL structures.

## FAILURE CONDITIONS
- Network failure or rate limit: Fallback to cached high-retention evergreen topics.

## SAFETY BOUNDARIES
- Read-only external queries.
- Zero PII or private tenant data leakage.

## EXPECTED OUTPUT
JSON object containing `selectedTopic`, `trendScore`, `noveltyScore`, `evidenceCitations`, and `rationale`.

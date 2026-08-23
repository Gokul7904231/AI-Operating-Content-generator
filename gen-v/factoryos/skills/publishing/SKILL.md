# Skill: Video Publishing
id: publishing
version: 1.0.0
owner: Overseer / Distribution Team

## WHEN TO USE
Invoked when distributing completed video shorts to public or unlisted platforms (YouTube, TikTok, Instagram Reels).

## REQUIRED INPUTS
- `videoId`: Target artifact ID
- `platform`: "YOUTUBE" | "TIKTOK" | "INSTAGRAM"
- `visibility`: "PUBLIC" | "UNLISTED" | "PRIVATE"
- `metadata`: Title, description, tags

## REQUIRED ACCESS
- Permissions: `publishing:write`
- Tools: `dispatch_platform_publish`

## EXECUTION SEQUENCE
1. Check visibility policy: IF `visibility === "PUBLIC"`, create persistent `ApprovalRequest` and pause mission until approved.
2. Once authorized, verify video artifact integrity and platform rate limits.
3. Dispatch video stream and metadata to platform API.
4. Record publication URL and commit Evidence.

## DECISION RULES
- Public publication WITHOUT approved human authorization is strictly FORBIDDEN.
- Unlisted/Private publication may proceed in AUTO/AUTOPILOT mode if within quota.

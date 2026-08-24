# Skill: Drive Delivery
id: drive-delivery
version: 1.0.0
owner: Overseer / Storage Delivery Team

## WHEN TO USE
Invoked when persisting validated video renders to user's Google Drive with atomic idempotency.

## REQUIRED INPUTS
- `filePath`: Local path to verified MP4 video
- `title`: Video title
- `idempotencyKey`: Unique deduplication key

## REQUIRED ACCESS
- Tools: `upload_to_drive`, `verify_drive_file`

## EXECUTION SEQUENCE
1. Check idempotency store to ensure file wasn't already uploaded.
2. Upload video stream via Google Drive multipart API.
3. Verify remote file existence, MIME type, and byte size via `files.get`.
4. Update mission storage location and emit Evidence.

## DECISION RULES
- IF duplicate upload attempted with same idempotencyKey, return existing file ID without creating duplicate.
- IF network drops, keep in outbox and retry with exponential backoff.

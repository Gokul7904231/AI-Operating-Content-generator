# Skill: Video Quality Assurance
id: video-quality
version: 1.0.0
owner: Overseer / QA Team

## WHEN TO USE
Invoked automatically after video rendering and before persistent outbox delivery.

## REQUIRED INPUTS
- `videoPath`: Local file path to the rendered MP4
- `expectedDurationSec`: Expected video duration (± 2s)

## REQUIRED ACCESS
- Tools: `probe_video_metadata`, `verify_audio_stream`

## EXECUTION SEQUENCE
1. Run ffprobe inspection on video container.
2. Verify resolution is exactly 1080x1920 (9:16 vertical short format).
3. Verify video stream has valid H.264/AAC codecs and non-zero bitrate.
4. Verify audio stream is present and synchronized.
5. Return QA PASS or FAIL with diagnostics.

## DECISION RULES
- IF file size < 50 KB, FAIL as invalid partial render.
- IF audio stream is missing, FAIL and trigger re-render.

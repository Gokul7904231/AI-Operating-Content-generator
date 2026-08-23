# Skill: Script Generation
id: script-generation
version: 1.0.0
owner: Overseer / FactoryOS Production Team

## WHEN TO USE
Invoked when converting a verified topic/concept into an engaging 15-60s short-form script with retention hooks, pacing beats, and structured scenes.

## REQUIRED INPUTS
- `topic`: Video topic or premise
- `durationSeconds`: Target video length (e.g. 30, 45, 60)
- `style`: Tone/aesthetic (e.g. "cinematic", "educational", "dramatic")
- `retentionPacing`: Pacing profile ("FAST", "BALANCED", "DOCUMENTARY")

## REQUIRED ACCESS
- Capabilities: `script_generation`, `json_parsing`
- Tools: `generate_script_text`, `validate_retention_rules`

## EXECUTION SEQUENCE
1. Analyze retention rules: First 3-second hook, pacing climax at 70%, strong conclusion CTA.
2. Select local or free cloud model via Capability Router.
3. Generate structured script with scene breakdowns, visual prompts, and narration sentences.
4. Deterministically validate JSON structure and sentence lengths (< 18 words per scene).
5. Output valid SCRIPT artifact.

## DECISION RULES
- IF hook score < 80, autonomously regenerate the opening scene hook.
- IF total reading time exceeds durationSeconds ± 3s, trim excess words.

## SAFETY BOUNDARIES
- No harmful content, swear words, or policy-violating text.

## EXPECTED OUTPUT
SCRIPT JSON object with `title`, `hook`, `scenes[]` (sceneIndex, narration, visualPrompt, durationSec).

# ShortFactory OS — Content Workflows Specification

Every content generation pipeline in ShortFactory is loaded as a versioned template mapping to prompt registry slots.

---

## 1. Quiz Workflow

Designed for rapid, high-engagement question/answer shorts.

- **Hook prompt slug**: `hook:v1`
- **Output ratio**: `9:16`
- **Voiceover**: Male/Neutral energetic tone
- **Critic evaluation metrics**:
  *   `hookScore >= 7.0` (must have strong pattern-interrupt in first 3 seconds)
  *   `sceneScore >= 6.5`

---

## 2. Story Workflow

Fictional, immersive narrations.

- **Hook prompt slug**: `hook:v2` (high-retention narrative teaser)
- **Scene breakdown slug**: `scene:v1`
- **Output ratio**: `9:16` or `16:9`
- **Visual Style**: Cinematic, detailed prompts for image generation
- **Voiceover**: Warm, deep voice synthesis

---

## 3. News Workflow

Synthesizes current affairs updates.

- **Niche**: Global / Tech updates
- **Voiceover**: Direct, clear reporter voice
- **Retention strategy**: Short summary sentences with rapid background changes (every 2.5 seconds)

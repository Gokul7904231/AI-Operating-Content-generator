# ShortForge Global Design System Specification

## 1. Overview
The ShortForge Global Design System defines the universal visual identity, branding, and compositing standards that apply across **all production rendering engines** (Quiz, Facts, Story, Motivation, and future engines).

While individual engines have their own specialized visual layout templates, every engine adheres to these global standards to ensure consistent branding and premium production value.

```text
SHORTFORGE GLOBAL DESIGN SYSTEM
│
├── Watermark / Logo Compositing Layer
├── Safe Margins (1080 × 1920)
├── Typography & Stroke Standards
├── Color Tokens
└── Progress & Accessibility Rules
          │
          ├── Quiz Engine (Quiz-specific template)
          ├── Facts Engine (Facts-specific template)
          ├── Story Engine (Story-specific template)
          └── Future Engines (Custom templates)
```

---

## 2. Canvas & Safe Margins
- **Export Resolution**: `1080 × 1920` (9:16 vertical ratio, YouTube Shorts / TikTok / Reels standard)
- **Framerate**: `18–24` fps
- **Horizontal Margins**: `90px` on left and right (safe content area width: `900px`)
- **Top Margin**: `200px` minimum (safe from platform overlay / search header)
- **Bottom Margin**: `240px` minimum (safe from platform description, sound title, and like/comment buttons)

---

## 3. Global Color Tokens

| Token | Hex / RGBA | Usage |
| :--- | :--- | :--- |
| `color.brand.cyan` | `#00AAFF` / `rgba(0, 170, 255, 1.0)` | Primary accent, topic badge, timer stroke |
| `color.brand.green` | `#22C55E` / `rgba(34, 197, 94, 1.0)` | Correct answer reveal, success state |
| `color.glass.fill` | `rgba(8, 18, 40, 0.45)` | Glassmorphism main card background |
| `color.glass.stroke` | `rgba(0, 170, 255, 0.60)` | Main card boundary stroke |
| `color.option.glass` | `rgba(255, 255, 255, 0.06)` | Normal option card background |
| `color.option.stroke` | `rgba(255, 255, 255, 0.12)` | Normal option card stroke |
| `color.option.correct` | `rgba(34, 197, 94, 0.22)` | Correct option card background in reveal phase |
| `color.option.dimmed` | `rgba(255, 255, 255, 0.02)` | Incorrect option card dimmed background |
| `color.text.primary` | `#FFFFFF` | Main questions, titles, headers |
| `color.text.dimmed` | `#64748B` | Inactive / incorrect options |

---

## 4. Global ShortForge Branding Layer

Every production renderer MUST apply the ShortForge logo watermark as the final visual compositing layer.

### Specification:
- **Asset**: `assets/branding/shortforge-watermark.png` (transparent PNG)
- **Position**: Bottom-Right corner
- **Dimensions**: Width ~`80px`, Height scaled proportionally
- **Coordinates (1080 × 1920)**:
  - `x`: `930px` – `950px`
  - `y`: `1800px` – `1825px`
  - `margin`: `40–50px` from right and bottom edges
- **Opacity**: `75%` (`alpha = 191`)
- **Safe Area**: Must never collide with captions or central CTA elements.
- **Layering Order**:
  ```text
  Engine Scene Visuals → Subtitles / Text Overlay → Global Branding Layer (Watermark) → Final Encode
  ```

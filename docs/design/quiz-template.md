# ShortForge Canonical Quiz Template Specification (v1)

## 1. Overview
This document specifies the authoritative, canonical visual layout, typography, element positioning, and timeline lifecycle for the **ShortForge Quiz Engine**. All quiz rendering engines (both local and cloud/Azure) MUST implement this exact specification.

---

## 2. Canvas & Background Treatment
- **Canvas Resolution**: `1080 × 1920` (9:16)
- **Background Asset**: Per-question photographic visual asset (or fallback country/theme visual).
- **Background Processing**:
  - Resized and center-cropped to `1080 × 1920`.
  - **Gaussian Blur**: radius `8px`.
  - **Brightness Dimming**: factor `0.60` (40% darkness attenuation).

---

## 3. Visual Layout Architecture

```text
┌─────────────────────────────────────────────────────────┐  y = 0
│                                                         │
│                                                         │
│                   ┌──────────────┐                      │  y = 340
│                   │  TIMER PILL  │  (w=100, h=60)       │
│                   └──────────────┘                      │  y = 400
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │  y = 450
│  │                                                   │  │
│  │             🧠 TOPIC GEOGRAPHY QUIZ               │  │  y = 520
│  │  ───────────────────────────────────────────────  │  │  y = 545 (Divider 1)
│  │                                                   │  │
│  │              What is the capital                  │  │  y = 580
│  │                   of France?                      │  │
│  │                                                   │  │
│  │  ───────────────────────────────────────────────  │  │  y = 840 (Divider 2)
│  │                                                   │  │
│  │   ┌───────────────────────────────────────────┐   │  │  y = 880 (Option A)
│  │   │ (A) Paris                                 │   │  │  (h = 110)
│  │   └───────────────────────────────────────────┘   │  │
│  │                                                   │  │
│  │   ┌───────────────────────────────────────────┐   │  │  y = 1020 (Option B)
│  │   │ (B) Lyon                                  │   │  │  (h = 110)
│  │   └───────────────────────────────────────────┘   │  │
│  │                                                   │  │
│  │   ┌───────────────────────────────────────────┐   │  │  y = 1160 (Option C)
│  │   │ (C) Marseille                             │   │  │  (h = 110)
│  │   └───────────────────────────────────────────┘   │  │
│  │                                                   │  │
│  │   ┌───────────────────────────────────────────┐   │  │  y = 1300 (Option D)
│  │   │ (D) Nice                                  │   │  │  (h = 110)
│  │   └───────────────────────────────────────────┘   │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │  y = 1510 (Main Card)
│                                                         │
│                                           ┌───────────┐ │  y = 1825
│                                           │ ShortForge│ │
│                                           └───────────┘ │
└─────────────────────────────────────────────────────────┘  y = 1920
```

---

## 4. Element Specifications

### A. Main Glassmorphism Card
- **Box**: `x0 = 90, y0 = 450, x1 = 990, y1 = 1510` (Width: `900px`, Height: `1060px`)
- **Corner Radius**: `26px`
- **Fill**: `rgba(8, 18, 40, 0.45)` (`#081228` @ 45% opacity)
- **Border Stroke**: `rgba(0, 170, 255, 0.60)` (`#00AAFF` @ 60% opacity), width `2.5px`

### B. Countdown Timer Pill
- **Box**: `x0 = 490, y0 = 340, x1 = 590, y1 = 400` (Width: `100px`, Height: `60px`)
- **Corner Radius**: `30px`
- **Fill**: `rgba(8, 18, 40, 0.60)`
- **Stroke**:
  - Reading / Countdown: `rgba(0, 170, 255, 1.0)` (`#00AAFF`), width `2.5px`
  - Answer Reveal: `rgba(34, 197, 94, 1.0)` (`#22C55E`), width `2.5px`
- **Text**:
  - Reading phase: `"${countdown}s"` (e.g. `4s` or `2s`)
  - Think phase: `"${currentSecs}s"` (e.g. `2s`, `1s`)
  - Reveal phase: `"✓"` in green `#22C55E`
  - Font: Bold, size `34px`, centered at `(540, 384)`.

### C. Topic Header & Dividers
- **Topic Header**:
  - Text: `🧠 ${TOPIC.toUpperCase()} QUIZ` (or fallback `GEOGRAPHY QUIZ`)
  - Color: `#00AAFF`
  - Font: Bold, size `34px`, letter spacing `4px`, centered at `(540, 520)`
- **Header Divider**:
  - Line: from `(160, 545)` to `(920, 545)`
  - Stroke: `rgba(255, 255, 255, 0.12)`, width `1.5px`
- **Question Divider**:
  - Line: from `(160, 840)` to `(920, 840)`
  - Stroke: `rgba(255, 255, 255, 0.12)`, width `1.5px`

### D. Question Text
- **Position**: Centered horizontally at `x = 540`, starting at `y = 580`
- **Wrapping**: Max chars ~`26–28` per line, line height `64px`
- **Font**: Bold / Semi-bold (700), size `48–52px`, fill `#FFFFFF`, with drop shadow `rgba(0, 0, 0, 0.60)`

### E. 4 Option Cards (A, B, C, D)
- **Constraint**: The renderer MUST require exactly **4 options**. If `len(options) != 4`, a validation error is raised.
- **Card Geometry**:
  - Option A: `(120, 880, 960, 990)`
  - Option B: `(120, 1020, 960, 1130)`
  - Option C: `(120, 1160, 960, 1270)`
  - Option D: `(120, 1300, 960, 1410)`
  - Card Size: Width `840px`, Height `110px`, Corner Radius `22px`
- **Badge Geometry**:
  - Center `(180, startY + 55)`, Radius `28px`
- **States**:
  1. **Reading & Countdown State**:
     - Card Fill: `rgba(255, 255, 255, 0.06)`
     - Card Stroke: `rgba(255, 255, 255, 0.12)`, width `1.5px`
     - Badge Fill: `rgba(0, 170, 255, 0.20)`, Stroke: `rgba(0, 170, 255, 0.60)`
     - Badge Letter: `A/B/C/D` in `#FFFFFF`, size `26px` bold
     - Option Text: `#E2E8F0`, size `34px`, font-weight 600, positioned at `x = 240, y = startY + 66`
  2. **Answer Reveal State**:
     - **Correct Option**:
       - Card Fill: `rgba(34, 197, 94, 0.22)`
       - Card Stroke: `#22C55E`, width `3.5px`
       - Badge Fill: `#22C55E`, Badge Stroke: `#22C55E`
       - Badge Text: `"✓"` in `#0F172A` (dark slate), size `26px` bold
       - Option Text: `#22C55E` (green), size `34px`
     - **Incorrect Options**:
       - Card Fill: `rgba(255, 255, 255, 0.02)`
       - Card Stroke: `rgba(255, 255, 255, 0.05)`, width `1.0px`
       - Badge Fill: `rgba(255, 255, 255, 0.04)`, Stroke: `rgba(255, 255, 255, 0.10)`
       - Badge Letter: `A/B/C/D` in `#64748B`
       - Option Text: `#64748B` (dimmed grey), size `34px`

---

## 5. Timeline & Phase Lifecycle

Each question in the quiz follows a strict 3-phase timeline:
```text
[ Question Read Phase ] ──▶ [ Thinking Countdown Phase ] ──▶ [ Answer Reveal Phase ]
  • Narration: reads Q       • Duration: 2.0s - 4.0s           • Narration: reads Answer
  • Options: A/B/C/D shown   • Audio: SFX / BGM beat           • Visual: Correct card GREEN
  • Timer: "${countdown}s"   • Timer: counts down              • Timer: "✓"
```

1. **Question Read Phase**:
   - Audio: TTS voice reads question and options.
   - Visual: Question text and 4 option cards shown in neutral glass state.
2. **Thinking Countdown Phase**:
   - Duration: Configured duration (e.g. `2.0s`).
   - Visual: Countdown pill ticks down `2s` $\rightarrow$ `1s`.
3. **Answer Reveal Phase**:
   - Audio: TTS voice reads correct answer (`"The correct answer is Paris!"`).
   - Visual: Correct card transitions to `#22C55E` green with checkmark `"✓"`, incorrect options dim.

---

## 6. Outro Card
- **Box**: `x0 = 90, y0 = 500, x1 = 990, y1 = 1400` (Width: `900px`, Height: `900px`, Radius: `26px`)
- **Fill**: `rgba(8, 18, 40, 0.45)`, Stroke: `rgba(0, 170, 255, 0.60)`
- **Header**: `QUIZ COMPLETED` (or `🧠 INDIA QUIZ COMPLETE`) in `#00AAFF` at `y = 630`
- **Divider**: `(160, 670)` to `(920, 670)`
- **Headline**: `"HOW MANY DID YOU GET RIGHT?"` in `#FFFFFF`, size `44px` bold at `y = 780`
- **Callout Pill 1**: `(150, 880, 930, 990)` $\rightarrow$ `"💬 Comment your score below!"` in `#00AAFF`
- **Callout Pill 2**: `(150, 1020, 930, 1130)` $\rightarrow$ `"➕ Follow for more daily quizzes!"` in `#FFFFFF`

# ShortFactory OS — UI Design Token Specs

The user interface is modeled as a sleek, professional "Operating System" shell. The layout is frozen to avoid visual fatigue or button-polishing cycles.

---

## 1. Color Palette (Dark Zinc)

Harmonious HSL tailoring:

- **Background**: `bg-zinc-950` (`#09090b`)
- **Card container surface**: `bg-zinc-900` (`#18181b`)
- **Borders**: `border-zinc-800` (`#27272a`)
- **Accent highlights**:
  *   Primary Blue: `text-blue-400`
  *   Status Emerald: `text-emerald-400`
  *   Retry Amber: `text-amber-400`
  *   Dead Letter Rose: `text-rose-400`

---

## 2. Typography

Modern, premium fonts sourced from Google Fonts:

- **Main text**: Inter
- **Telemetry / Metrics**: JetBrains Mono (monospaced)
- **Titles**: Outfit (weight: 700 / 800)

---

## 3. Layout Structure

- **Sidebar Navigation**: Left sidebar containing Factory, Engines, AI, Media, Publishing, and Analytics expanders.
- **Top Navigation Bar**: Hosts active route status title, active model provider indicator, active profile selector, and notification alerts.
- **Main Terminal Canvas**: Scrollable center viewport where cards, timeline tables, and Recharts line charts are mounted.

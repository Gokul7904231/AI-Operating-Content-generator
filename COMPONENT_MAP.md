# 🧩 Component Map & UI Architecture — FactoryOS v1

This document outlines the React component hierarchy, visual layout wrappers, reusable components, and Canva UI integration rules for the FactoryOS Control Center.

---

## 1. 🏗️ Root & Layout Hierarchy

```
app/layout.js (Root HTML/Body Layout)
└── AuthProvider (lib/auth/providers.tsx)
    └── app/(os)/layout.tsx (Control Center OS Shell Layout)
        ├── Sidebar (components/Sidebar.tsx)
        │   ├── Brand Header (FactoryOS Logo & Version Tag)
        │   ├── Navigation Groups (Mission Control, Operations, Media, AI Engine, System)
        │   └── System Status Mini-Footer
        │
        ├── TopNav (components/TopNav.tsx)
        │   ├── Breadcrumb Navigation
        │   ├── Quick Actions (Quick Generate, Run Self-Test)
        │   ├── Command Palette Trigger (Cmd+K)
        │   └── UserMenu (components/UserMenu.tsx)
        │
        ├── Page Route View (e.g. app/(os)/dashboard/page.tsx)
        │   ├── Mission Control Top Banner
        │   ├── Metric Stat Grid
        │   ├── Primary Visual Cards / Charts
        │   └── Live Event Stream Feed (components/LiveEventFeed.tsx)
        │
        ├── CommandPalette Modal (components/CommandPalette.tsx)
        └── QuickGenerateOverlay Modal (components/QuickGenerateOverlay.tsx)
```

---

## 2. 🎨 Canva UI Component Integration Rules

To maintain visual identity while improving interface polish:
- **Preserved Design Tokens**: Dark background (`#09090b` / `bg-zinc-950`), emerald accents (`#10b981`), surface containers (`bg-zinc-900/60`), monospace typography (`font-mono`).
- **Canva UI Extensions**: Smooth glassmorphism backdrops (`backdrop-blur-xl`), micro-interaction scale animations on buttons (`active:scale-[0.98]`), subtle pulsing health indicators (`animate-pulse`), and structured card headers.

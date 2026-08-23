/**
 * RouteRegistry — Single Source of Truth for all Navigation
 *
 * All sidebar links, breadcrumbs, CommandPalette entries, and search results
 * must reference this registry. Never duplicate route definitions.
 */

import { UserRole } from "../auth/types";
import { isAdminUser } from "../auth/roles";

export interface RouteEntry {
  id: string;
  label: string;
  href: string;
  section: string;
  description: string;
  icon: string; // lucide icon name
  keywords?: string[]; // For search/CommandPalette
  minRole?: UserRole; // Minimum role required to view this route in navigation
}

export interface RouteSection {
  id: string;
  title: string;
  icon: string; // lucide icon name
  basePath: string;
  routes: RouteEntry[];
  minRole?: UserRole; // Minimum role required to view this section
}

export const ROUTE_SECTIONS: RouteSection[] = [
  {
    id: "factory",
    title: "Factory",
    icon: "Factory",
    basePath: "/factory",
    routes: [
      { id: "factory-jobs",      label: "Jobs",       href: "/factory/jobs",      section: "Factory", icon: "ListOrdered",  description: "View and manage all generation jobs",          keywords: ["jobs", "queue", "history"], minRole: "ADMIN" },
      { id: "factory-templates", label: "Templates",  href: "/factory/templates", section: "Factory", icon: "FileCode",     description: "Browse and manage workflow templates",          keywords: ["templates", "presets", "workflow"] },
      { id: "factory-queue",     label: "Queue",      href: "/factory/queue",     section: "Factory", icon: "Loader2",      description: "Live job queue with retry controls",            keywords: ["queue", "pending", "workers"], minRole: "ADMIN" },
      { id: "factory-scheduler", label: "Scheduler",  href: "/factory/scheduler", section: "Factory", icon: "Calendar",     description: "Schedule recurring content generation jobs",    keywords: ["cron", "schedule", "recurring"], minRole: "ADMIN" },
      { id: "factory-workflows", label: "Workflows",  href: "/factory/workflows", section: "Factory", icon: "GitBranch",    description: "DSL workflow manifests — view and edit",        keywords: ["dsl", "workflow", "manifest", "dag"], minRole: "ADMIN" },
    ],
  },
  {
    id: "engines",
    title: "Content Engines",
    icon: "Cpu",
    basePath: "/engines",
    routes: [
      { id: "engines-index",      label: "All Engines",   href: "/engines",                section: "Engines", icon: "Cpu",        description: "Browse all registered content engines",    keywords: ["engines", "quiz", "story"] },
      { id: "engines-quiz",       label: "Quiz",          href: "/engines/quiz",           section: "Engines", icon: "HelpCircle", description: "AI-powered quiz video engine",             keywords: ["quiz", "questions"] },
      { id: "engines-gk",         label: "GK",            href: "/engines/gk",             section: "Engines", icon: "BookOpen",   description: "General Knowledge content engine",         keywords: ["gk", "general knowledge"] },
      { id: "engines-history",    label: "History",       href: "/engines/history",        section: "Engines", icon: "History",    description: "Historical facts and stories engine",      keywords: ["history", "timeline"] },
      { id: "engines-coding",     label: "Coding",        href: "/engines/coding",         section: "Engines", icon: "Code",       description: "Coding tips and tutorials engine",         keywords: ["code", "programming"] },
      { id: "engines-motivation", label: "Motivation",    href: "/engines/motivation",     section: "Engines", icon: "Flame",      description: "Motivational content engine",              keywords: ["motivation", "inspiration"] },
      { id: "engines-psychology", label: "Psychology",    href: "/engines/psychology",     section: "Engines", icon: "Brain",      description: "Psychology and mind facts engine",         keywords: ["psychology", "mind"] },
      { id: "engines-reddit",     label: "Reddit",        href: "/engines/reddit",         section: "Engines", icon: "MessageSquare", description: "Reddit stories content engine",         keywords: ["reddit", "stories"] },
      { id: "engines-story",      label: "Story",         href: "/engines/story",          section: "Engines", icon: "BookOpenText", description: "Narrative storytelling engine",          keywords: ["story", "narrative"] },
      { id: "engines-guess-flag", label: "Guess Flag",    href: "/engines/guess-flag",     section: "Engines", icon: "Flag",       description: "Flag guessing quiz engine",                keywords: ["flags", "countries"] },
      { id: "engines-guess-logo", label: "Guess Logo",    href: "/engines/guess-logo",     section: "Engines", icon: "Image",      description: "Logo guessing quiz engine",                keywords: ["logos", "brands"] },
    ],
  },
  {
    id: "ai",
    title: "AI",
    icon: "Bot",
    basePath: "/ai",
    routes: [
      { id: "ai-overseer",         label: "Overseer Assistant",  href: "/overseer",              section: "AI", icon: "Sparkles",     description: "Natural language operational assistant for status and telemetry", keywords: ["overseer", "chat", "voice", "assistant"] },
      { id: "ai-providers",        label: "API Configuration",   href: "/settings/api",          section: "AI", icon: "Network",      description: "Manage primary providers, fallback routing, and local AI", keywords: ["providers", "llm", "api", "openai", "settings", "keys"] },
      { id: "ai-models",           label: "Models",              href: "/ai/models",             section: "AI", icon: "Boxes",        description: "All registered models across all providers",              keywords: ["models", "llm", "gpt", "claude"], minRole: "ADMIN" },
      { id: "ai-marketplace",      label: "Marketplace",         href: "/ai/marketplace",        section: "AI", icon: "ShoppingBag",  description: "Live model marketplace — discover, compare, select",      keywords: ["marketplace", "models", "compare", "discover"], minRole: "ADMIN" },
      { id: "ai-capability-reg",   label: "Capability Registry", href: "/ai/capability-registry",section: "AI", icon: "Layers",       description: "Capability → Model → Provider → Fallback routing map",   keywords: ["capability", "registry", "routing", "fallback"], minRole: "ADMIN" },
      { id: "ai-runtime",          label: "Runtime",             href: "/ai/runtime",            section: "AI", icon: "Terminal",     description: "Live AI router state and active executions",             keywords: ["runtime", "router", "execution"], minRole: "ADMIN" },
      { id: "ai-benchmarks",       label: "Benchmarks",          href: "/ai/benchmarks",         section: "AI", icon: "BarChart2",    description: "Provider latency, cost, and quality rankings",           keywords: ["benchmarks", "latency", "cost"], minRole: "ADMIN" },
      { id: "ai-events",           label: "Event Bus",           href: "/ai/events",             section: "AI", icon: "Activity",     description: "Live EventBus monitor with trace ID filtering",          keywords: ["events", "eventbus", "trace"], minRole: "ADMIN" },
    ],
  },
  {
    id: "media",
    title: "Media",
    icon: "FolderOpen",
    basePath: "/media",
    routes: [
      { id: "media-library",    label: "Library",    href: "/media/library",    section: "Media", icon: "Film",      description: "Browse completed video library",             keywords: ["library", "videos", "renders"] },
      { id: "media-assets",     label: "Assets",     href: "/media/assets",     section: "Media", icon: "Image",     description: "Generated images, audio, and scene cache",   keywords: ["assets", "images", "audio", "cache"] },
      { id: "media-drive",      label: "Google Drive", href: "/media/drive",    section: "Media", icon: "Cloud",     description: "Google Drive sync status and quota",         keywords: ["drive", "google", "storage"], minRole: "ADMIN" },
      { id: "media-cloudinary", label: "Cloudinary", href: "/media/cloudinary", section: "Media", icon: "HardDrive", description: "Cloudinary usage, folders, and bandwidth",   keywords: ["cloudinary", "cdn", "images"], minRole: "ADMIN" },
    ],
  },
  {
    id: "publishing",
    title: "Publishing",
    icon: "Share2",
    basePath: "/publishing",
    routes: [
      { id: "pub-youtube",   label: "YouTube",     href: "/publishing/youtube",   section: "Publishing", icon: "Video",           description: "YouTube scheduled, published, and failed",   keywords: ["youtube", "publish", "upload"] },
      { id: "pub-tiktok",    label: "TikTok",      href: "/publishing/tiktok",    section: "Publishing", icon: "Video",           description: "TikTok upload queue and drafts",             keywords: ["tiktok", "short", "draft"] },
      { id: "pub-instagram", label: "Instagram",   href: "/publishing/instagram", section: "Publishing", icon: "Camera",          description: "Instagram Reels scheduling and history",     keywords: ["instagram", "reels"] },
      { id: "pub-drive",     label: "Drive Sync",  href: "/publishing/drive",     section: "Publishing", icon: "ArrowUpFromLine", description: "Google Drive upload queue and sync status",  keywords: ["drive", "upload", "sync"], minRole: "ADMIN" },
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: "LineChart",
    basePath: "/analytics",
    routes: [
      { id: "analytics-heatmaps",    label: "Heatmaps",    href: "/analytics/heatmaps",    section: "Analytics", icon: "Map",      description: "Scene-level retention and drop-off heatmaps", keywords: ["heatmap", "retention", "drop-off"] },
      { id: "analytics-hooks",       label: "Hooks",       href: "/analytics/hooks",       section: "Analytics", icon: "Sparkles", description: "Hook score trends and distribution",           keywords: ["hook", "score", "ctr"] },
      { id: "analytics-performance", label: "Performance", href: "/analytics/performance", section: "Analytics", icon: "Gauge",    description: "Render pipeline performance trends",           keywords: ["performance", "speed", "render"] },
      { id: "analytics-retention",   label: "Retention",   href: "/analytics/retention",   section: "Analytics", icon: "UserCheck", description: "Audience retention rates per video",          keywords: ["retention", "watch time"] },
    ],
  },
  {
    id: "sre",
    title: "SRE",
    icon: "Activity",
    basePath: "/dashboard",
    minRole: "ADMIN",
    routes: [
      { id: "sre-ai-hospital",  label: "AI Hospital",   href: "/dashboard/ai-hospital",  section: "SRE", icon: "HeartPulse", description: "Full AI infrastructure health center — live diagnostics", keywords: ["hospital", "health", "doctor", "sre", "audit", "diagnostics"], minRole: "ADMIN" },
      { id: "sre-voice-registry", label: "Voice Registry", href: "/dashboard/voice-registry", section: "SRE", icon: "Mic", description: "Voice capability, health, and benchmarks control center", keywords: ["voice", "tts", "supertonic", "edge", "elevenlabs"], minRole: "ADMIN" },
      { id: "sre-profiler",     label: "Profiler",      href: "/dashboard/profiler",     section: "SRE", icon: "BarChart2",  description: "Waterfall profiler for every pipeline run",              keywords: ["profiler", "waterfall", "timing"], minRole: "ADMIN" },
      { id: "sre-workers",      label: "Workers",       href: "/dashboard/workers",      section: "SRE", icon: "Terminal",   description: "Queue workers, dead letters, retry controls",            keywords: ["workers", "queue", "dead letter"], minRole: "ADMIN" },
      { id: "sre-simulation",   label: "Simulation",    href: "/dashboard/simulation",   section: "SRE", icon: "Flame",      description: "Chaos engineering simulation controls",                 keywords: ["simulation", "chaos", "testing"], minRole: "ADMIN" },
      { id: "admin-users",      label: "User Directory", href: "/admin/users",           section: "SRE", icon: "UserCheck",  description: "Manage authenticated users and assigned roles",          keywords: ["users", "admin", "roles", "rbac"], minRole: "ADMIN" },
    ],
  },
  {
    id: "pricing",
    title: "Plans & Pricing",
    icon: "Sparkles",
    basePath: "/pricing",
    routes: [
      { id: "plans-pricing", label: "Plans & Pricing", href: "/pricing", section: "Plans & Pricing", icon: "Sparkles", description: "View Basic, Pro, and Enterprise subscription plans", keywords: ["pricing", "plans", "upgrade", "pro", "enterprise", "quota", "billing"] },
    ],
  },
];

/**
 * Returns the exact navigation structure filtered for the given user role.
 */
export function getNavigationForRole(role: string = "USER"): RouteSection[] {
  const isAdmin = isAdminUser(role);

  return ROUTE_SECTIONS.filter((section) => {
    if (section.minRole === "ADMIN" && !isAdmin) return false;
    return true;
  }).map((section) => {
    const allowedRoutes = section.routes.filter((route) => {
      if (route.minRole === "ADMIN" && !isAdmin) return false;
      return true;
    });
    return { ...section, routes: allowedRoutes };
  }).filter((section) => section.routes.length > 0);
}

// Flat lookup by href for fast route resolution
export const ROUTE_BY_HREF = new Map<string, RouteEntry>(
  ROUTE_SECTIONS.flatMap((s) => s.routes.map((r) => [r.href, r]))
);

// All routes flattened for search/CommandPalette
export const ALL_ROUTES: RouteEntry[] = ROUTE_SECTIONS.flatMap((s) => s.routes);


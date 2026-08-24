export type OverseerExpression =
  | "idle"
  | "observing"
  | "listening"
  | "thinking"
  | "responding"
  | "speaking"
  | "rendering"
  | "success"
  | "warning"
  | "error"
  | "done";

export interface ExpressionConfig {
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  eyeScale: number;
  eyeSquint: number; // 0 = open, 1 = narrow
  pupilScale: number;
  browTilt: number; // in degrees: negative = concerned, positive = alert/focused
  mouthState: "neutral" | "smile" | "speaking" | "thinking" | "concerned" | "success";
  ringMode: "calm" | "listening" | "spinning" | "pulse" | "rendering" | "success" | "alert";
  ringSpeed: number; // in seconds per rotation
  particleActivity: number; // 0 to 1
  ambientIntensity: number; // 0 to 1
  label: string;
}

export const EXPRESSION_MAP: Record<OverseerExpression, ExpressionConfig> = {
  idle: {
    primaryColor: "#1769E8",
    secondaryColor: "#3B82F6",
    glowColor: "rgba(23, 105, 232, 0.25)",
    eyeScale: 1.0,
    eyeSquint: 0.05,
    pupilScale: 1.0,
    browTilt: 0,
    mouthState: "neutral",
    ringMode: "calm",
    ringSpeed: 20,
    particleActivity: 0.1,
    ambientIntensity: 0.2,
    label: "IDLE",
  },
  observing: {
    primaryColor: "#1677FF",
    secondaryColor: "#60A5FA",
    glowColor: "rgba(22, 119, 255, 0.35)",
    eyeScale: 1.02,
    eyeSquint: 0.0,
    pupilScale: 1.05,
    browTilt: 2,
    mouthState: "neutral",
    ringMode: "calm",
    ringSpeed: 14,
    particleActivity: 0.2,
    ambientIntensity: 0.35,
    label: "OBSERVING",
  },
  listening: {
    primaryColor: "#06B6D4",
    secondaryColor: "#38BDF8",
    glowColor: "rgba(6, 182, 212, 0.45)",
    eyeScale: 1.08,
    eyeSquint: -0.05,
    pupilScale: 1.15,
    browTilt: 4,
    mouthState: "neutral",
    ringMode: "listening",
    ringSpeed: 8,
    particleActivity: 0.45,
    ambientIntensity: 0.5,
    label: "LISTENING",
  },
  thinking: {
    primaryColor: "#8B5CF6",
    secondaryColor: "#A78BFA",
    glowColor: "rgba(139, 92, 246, 0.45)",
    eyeScale: 0.96,
    eyeSquint: 0.15,
    pupilScale: 0.9,
    browTilt: -3,
    mouthState: "thinking",
    ringMode: "spinning",
    ringSpeed: 4,
    particleActivity: 0.7,
    ambientIntensity: 0.6,
    label: "THINKING",
  },
  responding: {
    primaryColor: "#3B82F6",
    secondaryColor: "#93C5FD",
    glowColor: "rgba(59, 130, 246, 0.4)",
    eyeScale: 1.04,
    eyeSquint: 0.0,
    pupilScale: 1.1,
    browTilt: 2,
    mouthState: "speaking",
    ringMode: "pulse",
    ringSpeed: 6,
    particleActivity: 0.5,
    ambientIntensity: 0.45,
    label: "RESPONDING",
  },
  speaking: {
    primaryColor: "#2563EB",
    secondaryColor: "#60A5FA",
    glowColor: "rgba(37, 99, 235, 0.5)",
    eyeScale: 1.02,
    eyeSquint: 0.0,
    pupilScale: 1.05,
    browTilt: 1,
    mouthState: "speaking",
    ringMode: "pulse",
    ringSpeed: 4,
    particleActivity: 0.6,
    ambientIntensity: 0.55,
    label: "SPEAKING",
  },
  rendering: {
    primaryColor: "#0284C7",
    secondaryColor: "#38BDF8",
    glowColor: "rgba(2, 132, 199, 0.55)",
    eyeScale: 0.98,
    eyeSquint: 0.1,
    pupilScale: 1.0,
    browTilt: 3,
    mouthState: "neutral",
    ringMode: "rendering",
    ringSpeed: 3,
    particleActivity: 0.9,
    ambientIntensity: 0.7,
    label: "RENDERING",
  },
  success: {
    primaryColor: "#10B981",
    secondaryColor: "#34D399",
    glowColor: "rgba(16, 185, 129, 0.55)",
    eyeScale: 1.05,
    eyeSquint: -0.1,
    pupilScale: 1.1,
    browTilt: 4,
    mouthState: "success",
    ringMode: "success",
    ringSpeed: 6,
    particleActivity: 0.8,
    ambientIntensity: 0.65,
    label: "SUCCESS",
  },
  warning: {
    primaryColor: "#F59E0B",
    secondaryColor: "#FBBF24",
    glowColor: "rgba(245, 158, 11, 0.5)",
    eyeScale: 0.95,
    eyeSquint: 0.2,
    pupilScale: 0.95,
    browTilt: -4,
    mouthState: "concerned",
    ringMode: "alert",
    ringSpeed: 5,
    particleActivity: 0.5,
    ambientIntensity: 0.5,
    label: "WARNING",
  },
  error: {
    primaryColor: "#EF4444",
    secondaryColor: "#F87171",
    glowColor: "rgba(239, 68, 68, 0.6)",
    eyeScale: 0.92,
    eyeSquint: 0.25,
    pupilScale: 0.85,
    browTilt: -6,
    mouthState: "concerned",
    ringMode: "alert",
    ringSpeed: 3,
    particleActivity: 0.6,
    ambientIntensity: 0.6,
    label: "CRITICAL",
  },
  done: {
    primaryColor: "#10B981",
    secondaryColor: "#6EE7B7",
    glowColor: "rgba(16, 185, 129, 0.45)",
    eyeScale: 1.03,
    eyeSquint: -0.05,
    pupilScale: 1.05,
    browTilt: 3,
    mouthState: "smile",
    ringMode: "calm",
    ringSpeed: 16,
    particleActivity: 0.3,
    ambientIntensity: 0.4,
    label: "COMPLETE",
  },
};

/**
 * Derives the active expression from intent, voice state, rendering activity, and telemetry.
 */
export function deriveOverseerExpression(
  intent: string = "OBSERVING",
  voiceState: string = "IDLE",
  activeJobsCount: number = 0,
  hasErrors: boolean = false
): OverseerExpression {
  if (voiceState === "SPEAKING") return "speaking";
  if (voiceState === "LISTENING") return "listening";

  if (hasErrors || intent === "CRITICAL") return "error";
  if (intent === "WARNING" || intent === "CONCERNED") return "warning";
  if (intent === "THINKING" || intent === "DEEP_THINKING") return "thinking";
  if (intent === "SUCCESS" || intent === "PROUD") return "success";
  if (intent === "RENDERING" || activeJobsCount > 0) return "rendering";
  if (intent === "DONE") return "done";
  if (intent === "OBSERVING") return "observing";

  return "idle";
}

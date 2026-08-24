import { StyleProfileConfig, VisualContext } from "./VisualIntelligenceTypes";

export class StyleEngine {
  private static profiles: Record<string, StyleProfileConfig> = {
    quiz: {
      name: "quiz",
      palette: {
        primary: "#3b82f6", // Vibrant Blue
        secondary: "#f59e0b", // Yellow Orange
        background: "#0f172a", // Slate Dark
        accent: "#10b981", // Emerald Green
        text: "#ffffff",
      },
      blurAmount: 0,
      overlayOpacity: 0.2,
      transitionType: "zoom",
      cropStrategy: "cover",
      fontFamily: "Outfit",
      fontSizeLarge: 48,
      fontSizeMedium: 28,
    },
    educational: {
      name: "educational",
      palette: {
        primary: "#14b8a6", // Teal
        secondary: "#ec4899", // Pink Accent
        background: "#1e1b4b", // Deep Indigo
        accent: "#8b5cf6", // Purple
        text: "#f8fafc",
      },
      blurAmount: 5,
      overlayOpacity: 0.35,
      transitionType: "fade",
      cropStrategy: "entropy",
      fontFamily: "Inter",
      fontSizeLarge: 44,
      fontSizeMedium: 24,
    },
    news: {
      name: "news",
      palette: {
        primary: "#dc2626", // Alert Red
        secondary: "#1e293b", // Slate Grey
        background: "#090d16", // Navy Dark
        accent: "#ffffff",
        text: "#f1f5f9",
      },
      blurAmount: 0,
      overlayOpacity: 0.15,
      transitionType: "slide",
      cropStrategy: "cover",
      fontFamily: "Roboto",
      fontSizeLarge: 52,
      fontSizeMedium: 32,
    },
    story: {
      name: "story",
      palette: {
        primary: "#d97706", // Amber
        secondary: "#451a03", // Warm Brown
        background: "#1c1917", // Warm Stone
        accent: "#a16207",
        text: "#fafaf9",
      },
      blurAmount: 8,
      overlayOpacity: 0.4,
      transitionType: "fade",
      cropStrategy: "entropy",
      fontFamily: "Merriweather",
      fontSizeLarge: 40,
      fontSizeMedium: 22,
    },
    travel: {
      name: "travel",
      palette: {
        primary: "#06b6d4", // Cyan Sky
        secondary: "#f97316", // Sunset Orange
        background: "#082f49", // Ocean Blue
        accent: "#e11d48", // Rose Red
        text: "#f0f9ff",
      },
      blurAmount: 0,
      overlayOpacity: 0.1,
      transitionType: "zoom",
      cropStrategy: "cover",
      fontFamily: "Outfit",
      fontSizeLarge: 46,
      fontSizeMedium: 26,
    },
  };

  run(context: VisualContext): void {
    const t0 = Date.now();
    const styleName = context.config.styleName || "quiz";
    const resolved = StyleEngine.profiles[styleName] || StyleEngine.profiles.quiz;

    // Output is completely immutable
    context.styleConfig = { ...resolved };
    context.metrics.styleTime = Date.now() - t0;
  }
}

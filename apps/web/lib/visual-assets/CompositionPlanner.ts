import { VisualContext, SceneComposition, SceneCompositionElement } from "./VisualIntelligenceTypes";

export class CompositionPlanner {
  run(context: VisualContext): void {
    const t0 = Date.now();
    const plan = context.plan;
    const style = context.styleConfig;

    if (!plan || !style) {
      throw new Error("CompositionPlanner requires an active AssetPlan and StyleConfig");
    }

    const elements: SceneCompositionElement[] = [];

    // 1. Core Background element (Layer 0)
    elements.push({
      type: "background",
      layer: 0,
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      opacity: 1.0,
      anchor: "center",
      assetPath: context.selectedAsset?.path || "",
    });

    // 2. Translucent Style Tint Overlay (Layer 1)
    elements.push({
      type: "overlay",
      layer: 1,
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      opacity: style.overlayOpacity,
      anchor: "center",
    });

    // 3. Question Card Area Bounds (Layer 2)
    elements.push({
      type: "text",
      layer: 2,
      bounds: { x: 10, y: 25, width: 80, height: 20 },
      opacity: 1.0,
      anchor: "top-center",
      content: context.sceneText,
    });

    // 4. Subtitle / Caption Area Bounds (Layer 2)
    elements.push({
      type: "text",
      layer: 2,
      bounds: { x: 10, y: 75, width: 80, height: 12 },
      opacity: 0.95,
      anchor: "bottom-center",
    });

    // 5. Add planned foreground elements (e.g. Flags, Maps) if specified in plan (Layer 3)
    const hasForeground = plan.specs.find(s => s.role === "foreground");
    if (hasForeground) {
      elements.push({
        type: "foreground",
        layer: 3,
        bounds: { x: 35, y: 50, width: 30, height: 18 }, // centered middle header offset
        opacity: 1.0,
        anchor: "center",
      });
    }

    // 6. Countdown Timer (Layer 4)
    if (context.role === "read") {
      elements.push({
        type: "timer",
        layer: 4,
        bounds: { x: 40, y: 15, width: 20, height: 8 },
        opacity: 1.0,
        anchor: "top-center",
      });
    }

    // Camera movement config
    const cameraMotion = {
      type: context.role === "hook" ? "zoom-in" as const : "zoom-out" as const,
      scaleFrom: context.role === "hook" ? 1.0 : 1.08,
      scaleTo: context.role === "hook" ? 1.08 : 1.0,
      durationSeconds: 6.0,
    };

    const composition: SceneComposition = {
      elements,
      safeArea: {
        top: 15, // Keep top 15% clear (avatar / title header)
        bottom: 20, // Keep bottom 20% clear (actions / player UI overlays)
        left: 8,
        right: 8,
      },
      cameraMotion,
      transition: {
        in: style.transitionType,
        out: "none",
      },
    };

    context.composition = composition;
    context.metrics.compositionTime = Date.now() - t0;
  }
}

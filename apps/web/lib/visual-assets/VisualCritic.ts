import { VisualContext, VisualCriticReport } from "./VisualIntelligenceTypes";

export class VisualCritic {
  evaluate(context: VisualContext): VisualCriticReport {
    const composition = context.composition;
    const selected = context.selectedAsset;
    const style = context.styleConfig;

    if (!composition || !style) {
      throw new Error("VisualCritic requires completed Composition and Style Config");
    }

    // 1. Background Score (resolves directly from asset curation quality score)
    const backgroundScore = selected ? selected.qualityScore : 5.0;

    // 2. Contrast Score: evaluates contrast adjustment.
    // If background is very dark (average mean brightness < 100) and style text is white, contrast is high!
    let contrastScore = 9.0;
    if (selected && (selected as any).brightness) {
      const bgBrightness = (selected as any).brightness;
      // White text on bright background without overlays has poor contrast
      if (bgBrightness > 180 && style.overlayOpacity < 0.2) {
        contrastScore = 6.0;
      } else if (bgBrightness < 100 && style.palette.text.toLowerCase() === "#ffffff") {
        contrastScore = 9.8;
      }
    }

    // 3. Subtitle Visibility: checks if subtitle boundaries are inside bottom safe-areas
    let subtitleVisibilityScore = 10.0;
    const subElement = composition.elements.find(e => e.type === "text" && e.anchor === "bottom-center");
    if (subElement) {
      const isOverlapped = subElement.bounds.y + subElement.bounds.height > (100 - composition.safeArea.bottom);
      if (isOverlapped) {
        subtitleVisibilityScore = 7.0; // penalty for crossing bottom safe margin
      }
    }

    // 4. Safe Area Score: validates that all elements stay inside left/right/top safe margins
    let safeAreaScore = 10.0;
    for (const el of composition.elements) {
      if (el.bounds.x < composition.safeArea.left || el.bounds.x + el.bounds.width > (100 - composition.safeArea.right)) {
        safeAreaScore = 8.0;
      }
    }

    // 5. Variety Score: based on history usage
    let varietyScore = 10.0;
    if (selected) {
      const isRepeated = context.history.recentAssets.includes(selected.id);
      if (isRepeated) {
        varietyScore = 6.5;
      }
    }

    // 6. Composition Score: checks layer ordering sequence and content completeness
    let compositionScore = 9.0;
    const hasBg = composition.elements.some(e => e.type === "background");
    const hasText = composition.elements.some(e => e.type === "text");
    if (!hasBg || !hasText) {
      compositionScore = 5.0;
    }

    // 7. Brand Consistency Score: validates style palette format
    const brandConsistencyScore = style.palette.primary.startsWith("#") ? 9.8 : 7.0;

    // Overall average calculation
    const overallScore = Math.round(
      ((backgroundScore + contrastScore + subtitleVisibilityScore + safeAreaScore + varietyScore + compositionScore + brandConsistencyScore) / 7) * 10
    ) / 10;

    return {
      backgroundScore,
      contrastScore,
      subtitleVisibilityScore,
      safeAreaScore,
      varietyScore,
      compositionScore,
      brandConsistencyScore,
      overallScore,
    };
  }

  run(context: VisualContext): void {
    const t0 = Date.now();
    const report = this.evaluate(context);
    
    if (context.visualPackage) {
      context.visualPackage.metadata.evaluation = report;
      const duration = Date.now() - t0;
      context.metrics.criticTime = duration;
      if (context.visualPackage.metadata.debug?.metrics) {
        context.visualPackage.metadata.debug.metrics.criticTime = duration;
        
        let total = 0;
        for (const key of Object.keys(context.visualPackage.metadata.debug.metrics)) {
          if (key !== "totalPipelineTime") {
            total += context.visualPackage.metadata.debug.metrics[key];
          }
        }
        context.visualPackage.metadata.debug.metrics.totalPipelineTime = total;
      }
    } else {
      context.metrics.criticTime = Date.now() - t0;
    }
  }
}

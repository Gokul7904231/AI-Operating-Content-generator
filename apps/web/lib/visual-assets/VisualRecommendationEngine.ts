import { VisualContext, VisualRecommendation } from "./VisualIntelligenceTypes";

export class VisualRecommendationEngine {
  run(context: VisualContext): void {
    const t0 = Date.now();
    const intent = context.intent;
    if (!intent) {
      throw new Error("VisualRecommendationEngine requires a valid SceneIntent");
    }

    const textLower = context.sceneText.toLowerCase();
    
    // Baseline flat recommendation
    let rec: VisualRecommendation = {
      layoutType: "flat",
      textures: [],
      suggestedIcons: [],
      ambientEffects: ["subtle_vignette"],
    };

    // 1. Identify "Desert" style questions or terms
    if (textLower.includes("desert") || intent.entities.includes("desert")) {
      rec = {
        layoutType: "thematic_texture",
        textures: ["sand_texture.webp"],
        suggestedIcons: ["desert_icon.png", "sun_icon.png"],
        foregroundMask: "rough_edges_mask",
        ambientEffects: ["heat_gradient", "subtle_vignette"],
      };
    }
    // 2. Identify Geography / Nations / Cities style questions
    else if (intent.category === "Maps" || intent.category === "Flags" || intent.countries?.length) {
      rec = {
        layoutType: "composite_split",
        textures: ["canvas_grid_texture.webp"],
        suggestedIcons: ["map_pin_icon.png", "compass_icon.png"],
        foregroundMask: "rounded_card_mask",
        ambientEffects: ["subtle_vignette", "film_grain"],
      };
    }
    // 3. Identify Cultural / Historical topics
    else if (intent.category === "Culture" || textLower.includes("history") || textLower.includes("ancient")) {
      rec = {
        layoutType: "overlay_card",
        textures: ["parchment_texture.webp"],
        suggestedIcons: ["scroll_icon.png"],
        foregroundMask: "paper_deckle_mask",
        ambientEffects: ["sepia_tint", "subtle_vignette"],
      };
    }

    context.recommendation = rec;
    context.metrics.recommendationTime = Date.now() - t0;
  }
}

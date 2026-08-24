import { AssetPlan, VisualContext, PlannedAssetSpec } from "./VisualIntelligenceTypes";

export class AssetPlanner {
  async run(context: VisualContext): Promise<void> {
    const t0 = Date.now();
    const intent = context.intent;
    if (!intent) {
      throw new Error("AssetPlanner requires a valid SceneIntent context");
    }

    const specs: PlannedAssetSpec[] = [];

    // 1. Establish the main Background spec (always required)
    specs.push({
      role: "background",
      description: `Scenic background of ${intent.topic} representing category ${intent.category}`,
      priority: 1,
      requiredResolution: { width: 1080, height: 1920 },
      portraitCompatible: true,
    });

    // 2. Add overlays based on topic/scene role
    if (context.role === "reveal") {
      specs.push({
        role: "overlay",
        description: "Answer highlight overlay showing answer results banner",
        priority: 2,
        requiredResolution: { width: 1080, height: 400 },
        portraitCompatible: true,
      });
    }

    // 3. Check for specific entities that could map to foreground overlays (Flags/Maps/Icons)
    if (intent.countries && intent.countries.length > 0 && intent.category === "Landmarks") {
      specs.push({
        role: "foreground",
        description: `National flag of ${intent.countries[0]} to display in the header`,
        priority: 3,
        requiredResolution: { width: 300, height: 200 },
        portraitCompatible: false,
      });
    }

    if (intent.category === "Maps" || (intent.maps && intent.maps.length > 0)) {
      specs.push({
        role: "foreground",
        description: `Outline map highlighting ${intent.topic}`,
        priority: 2,
        requiredResolution: { width: 800, height: 800 },
        portraitCompatible: true,
      });
    }

    context.plan = {
      sceneRole: context.role,
      specs,
    };
    
    context.metrics.plannerTime = Date.now() - t0;
  }
}

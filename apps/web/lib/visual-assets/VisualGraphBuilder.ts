import { VisualContext, SceneVisualGraph, SceneVisualGraphNode } from "./VisualIntelligenceTypes";

export class VisualGraphBuilder {
  run(context: VisualContext): void {
    const t0 = Date.now();
    const composition = context.composition;
    if (!composition) {
      throw new Error("VisualGraphBuilder requires an active SceneComposition");
    }

    // Translate composition elements into a hierarchical visual graph tree
    const children: SceneVisualGraphNode[] = composition.elements.map((el) => {
      return {
        id: `node_${el.type}_${Math.random().toString(36).slice(2, 6)}`,
        type: el.type,
        props: {
          layer: el.layer,
          bounds: el.bounds,
          opacity: el.opacity,
          anchor: el.anchor,
          assetPath: el.assetPath,
          content: el.content,
        },
      };
    });

    const root: SceneVisualGraphNode = {
      id: "root_viewport",
      type: "viewport",
      props: {
        width: 1080,
        height: 1920,
        safeArea: composition.safeArea,
        cameraMotion: composition.cameraMotion,
      },
      children,
    };

    context.visualGraph = { root };
    context.metrics.graphTime = Date.now() - t0;
  }
}

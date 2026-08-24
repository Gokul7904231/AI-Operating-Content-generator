/**
 * FactoryOS Frontier v3 — Creative Bible Manager
 * Manages cross-scene creative state and persistent stylistic continuity.
 */

import { CreativeBible, VisualStyleConfig, VoiceStyleConfig } from "../contracts/CreativeStateContracts";

export class CreativeBibleManager {
  private static bibles: Map<string, CreativeBible> = new Map();

  static createDefaultBible(missionId: string, topic: string, styleName: string = "CINEMATIC_3D"): CreativeBible {
    const visualStyle: VisualStyleConfig = {
      artisticStyle: styleName as any,
      colorPalette: ["#0f172a", "#38bdf8", "#f43f5e", "#fbbf24"],
      lightingTheme: "Volumetric cinematic rim lighting, high contrast",
      cameraLanguage: "Dynamic 45-degree isometric and close-up tracking shots",
      negativePrompts: ["blurry", "watermark", "distorted faces", "bad anatomy", "lowres"],
      aspectRatio: "9:16",
    };

    const voiceStyle: VoiceStyleConfig = {
      defaultVoiceId: "en-US-GuyNeural",
      narrationPaceMultiplier: 1.05,
      tone: "AUTHORITATIVE",
      bgmGenre: "electronic_synthwave",
      bgmVolumeDbfs: -18,
    };

    const bible: CreativeBible = {
      bibleId: `bible_${missionId}`,
      missionId,
      topic,
      hookConcept: `Revealing the shocking truth behind ${topic}`,
      targetAudience: "Curious tech-savvy mobile viewers (18-35)",
      coreMessage: `A rapid 30-second breakdown of ${topic} with actionable insight.`,
      characters: [],
      visualStyle,
      voiceStyle,
      captionStyle: {
        fontName: "Inter-Black",
        primaryColor: "#FFFFFF",
        highlightColor: "#FACC15",
        animation: "POP",
        maxWordsPerLine: 3,
      },
      continuityRules: [
        "Consistent color palette across all scenes",
        "Consistent narrator voice tone throughout",
        "Key subject remains in central 80% viewport safety zone",
      ],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.bibles.set(bible.bibleId, bible);
    return bible;
  }

  static getBible(bibleId: string): CreativeBible | undefined {
    return this.bibles.get(bibleId);
  }

  static updateBible(bibleId: string, updates: Partial<CreativeBible>): CreativeBible {
    const existing = this.bibles.get(bibleId);
    if (!existing) throw new Error(`CreativeBible "${bibleId}" not found.`);
    const updated: CreativeBible = {
      ...existing,
      ...updates,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.bibles.set(bibleId, updated);
    return updated;
  }
}

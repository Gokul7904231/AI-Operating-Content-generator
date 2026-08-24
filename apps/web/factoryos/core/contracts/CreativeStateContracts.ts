/**
 * FactoryOS Frontier v3 — Creative State Contracts
 * Defines persistent cross-scene creative state (Creative Bible, Timeline, Story continuity).
 */

export interface CharacterDesign {
  readonly name: string;
  readonly role: string;
  readonly visualPromptFragment: string;
  readonly voiceProfileId: string;
  readonly clothing: string;
  readonly keyFeatures: string[];
}

export interface VisualStyleConfig {
  readonly artisticStyle: "REALISTIC" | "CINEMATIC_3D" | "ANIME" | "MINIMALIST" | "CYBERPUNK" | "VINTAGE";
  readonly colorPalette: string[];
  readonly lightingTheme: string;
  readonly cameraLanguage: string;
  readonly negativePrompts: string[];
  readonly aspectRatio: "9:16" | "16:9" | "1:1";
}

export interface VoiceStyleConfig {
  readonly defaultVoiceId: string;
  readonly narrationPaceMultiplier: number;
  readonly tone: "ENERGETIC" | "AUTHORITATIVE" | "CASUAL" | "MYSTERIOUS" | "EDUCATIONAL";
  readonly bgmGenre?: string;
  readonly bgmVolumeDbfs?: number;
}

export interface CreativeBible {
  readonly bibleId: string;
  readonly missionId: string;
  readonly topic: string;
  readonly hookConcept: string;
  readonly targetAudience: string;
  readonly coreMessage: string;
  readonly characters: CharacterDesign[];
  readonly visualStyle: VisualStyleConfig;
  readonly voiceStyle: VoiceStyleConfig;
  readonly captionStyle: {
    readonly fontName: string;
    readonly primaryColor: string;
    readonly highlightColor: string;
    readonly animation: "BOUNCE" | "TYPEWRITER" | "POP" | "FADE";
    readonly maxWordsPerLine: number;
  };
  readonly brandRules?: {
    readonly watermarkUrl?: string;
    readonly introStingerDurationSec?: number;
    readonly outroCallToAction?: string;
  };
  readonly continuityRules: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineSceneTrack {
  readonly sceneIndex: number;
  readonly durationSec: number;
  readonly visualPrompt: string;
  readonly narrationText: string;
  readonly visualAssetUri?: string;
  readonly voiceAssetUri?: string;
  readonly transitionType?: "CUT" | "FADE" | "SLIDE" | "ZOOM";
  readonly textOverlays?: Array<{
    text: string;
    startSec: number;
    endSec: number;
    position: "TOP" | "CENTER" | "BOTTOM";
  }>;
}

export interface TimelineData {
  readonly timelineId: string;
  readonly missionId: string;
  readonly totalDurationSec: number;
  readonly resolution: { readonly width: number; readonly height: number; readonly fps: number };
  readonly scenes: TimelineSceneTrack[];
  readonly masterAudioTrackUri?: string;
  readonly bgmTrackUri?: string;
  readonly captionsTrackUri?: string;
  version: number;
}

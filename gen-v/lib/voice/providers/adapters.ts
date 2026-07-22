import { NarrationRole } from "../narration-role";
import { VOICE_CONFIG } from "../voice-config";

export interface ProviderVoiceMatch {
  voiceId: string;
  modelId?: string;
}

export class ElevenLabsAdapter {
  static match(role: NarrationRole): ProviderVoiceMatch {
    const config = VOICE_CONFIG[role] ?? VOICE_CONFIG[NarrationRole.MAIN];
    return {
      voiceId: config.providers.elevenlabs,
      modelId: "eleven_multilingual_v2"
    };
  }
}

export class EdgeAdapter {
  static match(role: NarrationRole): ProviderVoiceMatch {
    const config = VOICE_CONFIG[role] ?? VOICE_CONFIG[NarrationRole.MAIN];
    return {
      voiceId: config.providers.edge
    };
  }
}

export class SupertonicAdapter {
  static match(role: NarrationRole): ProviderVoiceMatch {
    const config = VOICE_CONFIG[role] ?? VOICE_CONFIG[NarrationRole.MAIN];
    return {
      voiceId: config.providers.supertonic ?? "calm_male",
      modelId: "supertonic-tts-v3"
    };
  }
}

import { NarrationRole } from "./narration-role";

export interface ProviderVoiceMap {
  edge: string;
  elevenlabs: string;
  supertonic?: string;
}

export interface VoiceRoleConfig {
  role: NarrationRole;
  gender: "female" | "male";
  description: string;
  providers: ProviderVoiceMap;
}

export const VOICE_CONFIG: Record<NarrationRole, VoiceRoleConfig> = {
  [NarrationRole.INTRO]: {
    role: NarrationRole.INTRO,
    gender: "female",
    description: "Female English Narrator for Intro / Hook",
    providers: {
      edge: "en-US-JennyNeural",
      elevenlabs: "EXAVITQu4vr4xnSDxMaL", // Bella
      supertonic: "warm_female"
    }
  },
  [NarrationRole.MAIN]: {
    role: NarrationRole.MAIN,
    gender: "male",
    description: "Male English Narrator for Questions, Reveals, and Outro",
    providers: {
      edge: "en-US-SteffanNeural",
      elevenlabs: "ErXwobaYiN019PkySvjV", // Antoni
      supertonic: "calm_male"
    }
  }
};

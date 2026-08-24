import { NarrationRole } from "./narration-role";
import { VOICE_CONFIG } from "./voice-config";

export interface VoiceProfile {
  id: string;
  role: NarrationRole;
  displayName: string;
  language: string;
  gender: "female" | "male";
  speed: number;
  activeProviderId?: string;
  activeVoiceId?: string;
}

export const FemaleNarratorProfile: VoiceProfile = {
  id: "female_narrator",
  role: NarrationRole.INTRO,
  displayName: "Female English Narrator",
  language: "en",
  gender: "female",
  speed: 1.15 // slightly faster for snappier shorts narration
};

export const MaleNarratorProfile: VoiceProfile = {
  id: "male_narrator",
  role: NarrationRole.MAIN,
  displayName: "Male English Narrator",
  language: "en",
  gender: "male",
  speed: 1.15 // slightly faster for snappier shorts narration
};

export const VoiceProfileRegistry = {
  getAllProfiles(): VoiceProfile[] {
    return [FemaleNarratorProfile, MaleNarratorProfile];
  }
};

import { AICapability } from "../../capability-registry";

export class PollinationsCapabilityResolver {
  /**
   * Infer capabilities dynamically based on model id and attributes
   */
  static infer(modelId: string, type: string = "text"): AICapability[] {
    const id = modelId.toLowerCase();
    const caps: AICapability[] = [];

    if (type === "text" || id.includes("llm") || id.includes("instruct") || id.includes("chat") || id.includes("qwen") || id.includes("llama") || id.includes("mistral") || id.includes("deepseek")) {
      caps.push("SCRIPT");
      // Text models can also evaluate scripts
      caps.push("TRANSLATION");
      caps.push("CLASSIFICATION");
      caps.push("SUMMARIZATION");
    }

    if (type === "image" || id.includes("flux") || id.includes("sd") || id.includes("midjourney") || id.includes("dall") || id.includes("stable-diffusion") || id.includes("image")) {
      caps.push("IMAGE");
      caps.push("THUMBNAIL");
    }

    if (type === "video" || id.includes("video") || id.includes("movie") || id.includes("sora") || id.includes("runway")) {
      caps.push("VISION"); // Video generation / visuals capability
    }

    if (type === "audio" || id.includes("audio") || id.includes("speech") || id.includes("tts") || id.includes("voice")) {
      caps.push("SPEECH");
    }

    // Default fallback capability
    if (caps.length === 0) {
      caps.push("SCRIPT");
    }

    return caps;
  }
}

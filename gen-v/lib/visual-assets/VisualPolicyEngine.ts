import { CandidateAsset, VisualContext } from "./VisualIntelligenceTypes";

export { CJK_REGEX, LANGUAGE_SUBDOMAIN_RE, detectUnrelatedLanguage, assetIsRelevant };

export interface PolicyResult {
  action: "approve" | "reject" | "warn";
  reasons: string[];
}

const CJK_REGEX = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/;

const LANGUAGE_SUBDOMAIN_RE: Array<{ re: RegExp; lang: string; keywords: string[] }> = [
  { re: /\/\/[^/]*ja[./]|ja\.wikimedia|ja\.openverse|japan/i, lang: "japanese", keywords: ["japan", "japanese", "nippon"] },
  { re: /\/\/[^/]*zh[./]|zh\.wikimedia|zh\.openverse|china|chinese/i, lang: "chinese", keywords: ["china", "chinese", "taiwan", "hong kong"] },
  { re: /\/\/[^/]*ko[./]|ko\.wikimedia|ko\.openverse|korea|korean/i, lang: "korean", keywords: ["korea", "korean"] },
];

function detectUnrelatedLanguage(asset: CandidateAsset, topic: string): string | null {
  const haystack = [
    asset.title || "",
    asset.description || "",
    asset.tags?.join(" ") || "",
    asset.sourceUrl || "",
    asset.originalUrl || "",
    asset.author || "",
    asset.credits || "",
  ].join(" ").toLowerCase();

  const topicLower = topic.toLowerCase();

  for (const entry of LANGUAGE_SUBDOMAIN_RE) {
    const langMatch = entry.re.test(haystack) || CJK_REGEX.test(haystack);
    if (!langMatch) continue;

    const topicMatches = entry.keywords.some(kw => topicLower.includes(kw));
    if (!topicMatches) {
      return `Unrelated language detected (${entry.lang}) in asset metadata/URL: "${(asset.title || asset.sourceUrl || asset.id).slice(0, 80)}"`;
    }
  }

  return null;
}

function assetIsRelevant(asset: CandidateAsset, context: VisualContext): boolean {
  const intentEntities = (context.intent?.entities || []).map(e => e.toLowerCase());
  const topic = (context.topic || "").toLowerCase();
  const assetText = [
    asset.title || "",
    asset.description || "",
    asset.tags?.join(" ") || "",
  ].join(" ").toLowerCase();

  if (intentEntities.length === 0) return true;

  const overlap = intentEntities.filter(e => assetText.includes(e)).length;
  return overlap / intentEntities.length >= 0.15;
}

export interface PolicyResult {
  action: "approve" | "reject" | "warn";
  reasons: string[];
}

export class VisualPolicyEngine {
  evaluate(asset: CandidateAsset, context: VisualContext): PolicyResult {
    const reasons: string[] = [];
    let action: "approve" | "reject" | "warn" = "approve";

    // 1. License Compliance check: Reject if license type is commercial-only or unknown
    const license = asset.license.toLowerCase();
    const disallowedLicenses = ["all rights reserved", "copyrighted", "non-commercial", "nc"];
    const isDisallowed = disallowedLicenses.some(dis => license.includes(dis));
    if (isDisallowed) {
      action = "reject";
      reasons.push(`Forbidden license type: ${asset.license}`);
    }

    // 2. Aspect Ratio restriction: Reject if extremely horizontal (panoramas)
    const ratio = asset.width / asset.height;
    if (ratio > 2.5) {
      action = "reject";
      reasons.push(`Aspect ratio ${ratio.toFixed(2)} is too wide (max 2.5)`);
    }

    // 3. Aspect Ratio warning: Warn if landscape is being used for portrait crop
    if (ratio > 1.2) {
      if (action !== "reject") {
        action = "warn";
      }
      reasons.push(`Landscape asset (${ratio.toFixed(2)}) requires portrait cropping`);
    }

    // 4. Logo/Brand Safety checks: Warn if tags match commercial brands
    const brandTags = ["apple", "google", "nike", "adidas", "mcdonalds", "microsoft"];
    const hasBrand = asset.tags?.some(tag => brandTags.includes(tag.toLowerCase()));
    if (hasBrand) {
      if (action !== "reject") {
        action = "warn";
      }
      reasons.push("Brand safety warning: potential logo or trademark detected in tags");
    }

    // 5. File format compliance: Reject vector/SVG formats as they cannot be rasterized directly
    const urlLower = (asset.sourceUrl || "").toLowerCase();
    if (urlLower.endsWith(".svg")) {
      action = "reject";
      reasons.push("Vector graphics (SVG) are not supported for background rasterization");
    }

    // 6. Semantic relevance: Reject images with unrelated languages or low topical relevance
    const unrelatedLang = detectUnrelatedLanguage(asset, context.topic);
    if (unrelatedLang) {
      action = "reject";
      reasons.push(unrelatedLang);
    } else if (!assetIsRelevant(asset, context)) {
      if (action !== "reject") {
        action = "warn";
      }
      reasons.push(`Low semantic relevance: asset metadata does not match intent entities for topic "${context.topic}"`);
    }

    return {
      action,
      reasons,
    };
  }

  async run(context: VisualContext): Promise<void> {
    const t0 = Date.now();
    const filtered: CandidateAsset[] = [];

    for (const cand of context.candidates) {
      const res = this.evaluate(cand, context);
      if (res.action === "reject") {
        console.log(`[VisualPolicyEngine] Rejected asset ${cand.id}: ${res.reasons.join(", ")}`);
        continue;
      }
      if (res.action === "warn") {
        console.log(`[VisualPolicyEngine] Policy warning for asset ${cand.id}: ${res.reasons.join(", ")}`);
      }
      filtered.push(cand);
    }

    context.candidates = filtered;
    context.metrics.policyTime = Date.now() - t0;
  }
}

import { CandidateAsset, VisualContext } from "./VisualIntelligenceTypes";

export class DiversityEngine {
  private hammingDistance(h1: string, h2: string): number {
    let dist = 0;
    const len = Math.min(h1.length, h2.length);
    for (let i = 0; i < len; i++) {
      if (h1[i] !== h2[i]) dist++;
    }
    return dist;
  }

  /**
   * Evaluates and updates candidates with color, provider, tag, and visual dHash penalties based on recent pipeline history
   */
  penalize(context: VisualContext): void {
    const history = context.history;
    if (!history) return;

    for (const cand of context.candidates) {
      let penalty = 0;

      // 0. Enforce STRICT absolute prohibition of duplicate asset selection inside the same video compilation:
      if (history.recentAssets.includes(cand.id)) {
        penalty += 10.0;
      }

      // 0.5. Enforce STRICT visual similarity check using dHash distance (Hamming Distance <= 6 means highly similar):
      if (cand.dhash && history.recentDhashes.length > 0) {
        for (const prevDhash of history.recentDhashes) {
          if (prevDhash) {
            const dist = this.hammingDistance(cand.dhash, prevDhash);
            if (dist <= 6) {
              penalty += 2.0; // massive penalty for visually similar crops/images
              break;
            }
          }
        }
      }

      // 1. Penalize if provider matches recent providers
      const providerCount = history.recentProviders.filter(p => p === cand.source).length;
      if (providerCount > 0) {
        penalty += providerCount * 0.1;
      }

      // 1.5. Penalize if photographer/source author matches recent photographers
      if (cand.author && history.recentAuthors.length > 0) {
        const authorMatch = history.recentAuthors.includes(cand.author);
        if (authorMatch) {
          penalty += 0.5; // penalize reuse of same photographer/creator
        }
      }

      // 2. Penalize if dominant colors overlap with recently used colors
      if (cand.dominantColors && history.recentColors.length > 0) {
        const colorOverlap = cand.dominantColors.filter(c => history.recentColors.includes(c)).length;
        if (colorOverlap > 0) {
          penalty += colorOverlap * 0.15;
        }
      }

      // 3. Penalize if tags match recent topics
      if (history.recentTopics.includes(context.topic)) {
        penalty += 0.05;
      }

      // 4. Penalize tags overlap to enforce category diversity (favor visual type travels)
      const recentTags = history.recentTags || [];
      if (cand.tags && recentTags.length > 0) {
        const tagOverlap = cand.tags.filter(t => recentTags.includes(t.toLowerCase())).length;
        if (tagOverlap > 0) {
          penalty += tagOverlap * 0.25;
        }
      }

      // Apply diversity penalty to qualityScore (decreases ranking probability)
      cand.qualityScore = Math.max(1.0, cand.qualityScore - penalty * 10);
    }
  }

  /**
   * Records the chosen asset attributes into the shared pipeline history to penalize future scenes
   */
  recordSelection(context: VisualContext): void {
    const selected = context.selectedAsset;
    const history = context.history;
    if (!selected || !history) return;

    // Record asset ID
    history.recentAssets.push(selected.id);
    if (history.recentAssets.length > 10) history.recentAssets.shift();

    // Record provider source
    history.recentProviders.push(selected.source);
    if (history.recentProviders.length > 10) history.recentProviders.shift();

    // Record dHash
    if (selected.dhash) {
      history.recentDhashes.push(selected.dhash);
      if (history.recentDhashes.length > 10) history.recentDhashes.shift();
    }

    // Record photographer/author
    if (selected.author) {
      history.recentAuthors.push(selected.author);
      if (history.recentAuthors.length > 10) history.recentAuthors.shift();
    }

    // Record dominant colors
    if (selected.dominantColors) {
      history.recentColors.push(...selected.dominantColors);
      if (history.recentColors.length > 15) {
        history.recentColors = history.recentColors.slice(-15);
      }
    }

    // Record tags
    if (selected.tags) {
      history.recentTags = history.recentTags || [];
      history.recentTags.push(...selected.tags.map(t => t.toLowerCase()));
      if (history.recentTags.length > 50) {
        history.recentTags = history.recentTags.slice(-50);
      }
    }

    // Record topics
    history.recentTopics.push(context.topic);
    if (history.recentTopics.length > 10) history.recentTopics.shift();
  }

  run(context: VisualContext): void {
    const t0 = Date.now();
    this.penalize(context);
    context.metrics.diversityTime = Date.now() - t0;
  }
}

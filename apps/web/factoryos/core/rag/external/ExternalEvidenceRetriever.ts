/**
 * FactoryOS ExternalEvidenceRetriever
 * 
 * Retrieves REAL EXTERNAL EVIDENCE from independent authoritative sources (e.g. Wikipedia).
 * Enforces text chunking with provenance, SHA-256 content hashing, and explicit trust levels.
 * NO fallback / fabricated documents are ever created.
 */

import { TextChunker } from "../vector/TextChunker";
import {
  AuthoritativeExternalDocument,
  EvidenceChunk,
  ExternalEvidenceValidator,
  SourceTrustLevel,
  SourceType,
} from "./ExternalEvidenceContracts";

export class ExternalEvidenceRetriever {
  private static chunker = new TextChunker({ chunkSize: 300, chunkOverlap: 60 });

  /**
   * Retrieves authoritative external reference documents for a given topic or query.
   * If external sources are offline or yield no results, returns an empty array.
   */
  static async retrieveEvidenceForTopic(topic: string): Promise<AuthoritativeExternalDocument[]> {
    const cleanTopic = topic.trim();
    if (!cleanTopic) return [];

    const documents: AuthoritativeExternalDocument[] = [];
    const retrievedAt = new Date().toISOString();

    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        cleanTopic
      )}&utf8=&format=json&origin=*`;

      const searchRes = await fetch(searchUrl, {
        headers: { "User-Agent": "FactoryOS-Bot/1.0 (admin@factoryos.app)" },
        signal: AbortSignal.timeout(10000),
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const searchResults = searchData?.query?.search || [];

        for (const item of searchResults.slice(0, 3)) {
          const title = item.title;
          const snippet = (item.snippet || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          const pageId = String(item.pageid || title.replace(/\s+/g, "_"));

          let fullSummaryFetched = false;

          // Attempt to fetch full page extract for the article
          try {
            const extractUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
            const extractRes = await fetch(extractUrl, {
              headers: { "User-Agent": "FactoryOS-Bot/1.0 (admin@factoryos.app)" },
              signal: AbortSignal.timeout(8000),
            });

            if (extractRes.ok) {
              const pageData = await extractRes.json();
              if (pageData.extract && pageData.extract.trim().length > 30) {
                const content = `${pageData.title}: ${pageData.description ? pageData.description + ". " : ""}${pageData.extract}`.trim();
                const sourceUrl = pageData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
                const contentHash = ExternalEvidenceValidator.computeContentHash(content);

                const doc: AuthoritativeExternalDocument = {
                  id: `wiki_doc_${pageId}`,
                  sourceId: `wiki_${pageId}`,
                  sourceType: "WIKIPEDIA",
                  sourceTrustLevel: "REFERENCE",
                  title: pageData.title || title,
                  sourceUrl,
                  content,
                  contentHash,
                  retrievedAt,
                  metadata: {
                    topic: cleanTopic,
                    pageId,
                  },
                };

                ExternalEvidenceValidator.validate(doc);
                documents.push(doc);
                fullSummaryFetched = true;
              }
            }
          } catch {}

          // If full summary failed, record snippet with explicit SEARCH_SNIPPET trust level
          if (!fullSummaryFetched && snippet.length > 20) {
            const sourceUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
            const content = `${title}: ${snippet}`;
            const contentHash = ExternalEvidenceValidator.computeContentHash(content);

            const doc: AuthoritativeExternalDocument = {
              id: `wiki_snippet_${pageId}`,
              sourceId: `wiki_snippet_${pageId}`,
              sourceType: "SEARCH_SNIPPET",
              sourceTrustLevel: "SEARCH_SNIPPET",
              title,
              sourceUrl,
              content,
              contentHash,
              retrievedAt,
              metadata: {
                topic: cleanTopic,
                pageId,
              },
            };

            ExternalEvidenceValidator.validate(doc);
            documents.push(doc);
          }
        }
      }
    } catch (err: any) {
      console.warn(`[ExternalEvidenceRetriever] External search error: ${err.message}`);
    }

    // 🔒 Strictly return empty array if no external documents could be fetched.
    // NEVER fabricate a fallback corpus.
    return documents;
  }

  /**
   * Splits authoritative external documents into fine-grained evidence chunks
   * while strictly preserving provenance metadata and content hashes.
   */
  static chunkExternalDocuments(
    documents: AuthoritativeExternalDocument[]
  ): EvidenceChunk[] {
    const allChunks: EvidenceChunk[] = [];

    for (const doc of documents) {
      const rawChunks = this.chunker.chunkDocument({
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata,
      });

      rawChunks.forEach((c, idx) => {
        allChunks.push({
          chunkId: c.id,
          sourceId: doc.sourceId,
          title: doc.title,
          sourceUrl: doc.sourceUrl,
          content: c.content,
          contentHash: ExternalEvidenceValidator.computeContentHash(c.content),
          sourceTrustLevel: doc.sourceTrustLevel,
          sourceType: doc.sourceType,
          chunkIndex: idx,
        });
      });
    }

    return allChunks;
  }
}

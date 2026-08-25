/**
 * GeoRotationService — per-country 5-set rotation (BASIC tier)
 *
 * Draft peeks (read-only), render advances (transaction).
 * State: Firestore `geoRotations/{userId}` { pointers: { IN: 2, US: 0 }, updatedAt }
 * Falls back to in-memory mock when Firebase not configured (tests / local).
 */
import { db } from "../firebase-admin";
import { GEO_HARDCODED_SETS, GeoSet } from "./datasets/geo-hardcoded-sets";

function normalizeCode(code: string): string {
  return code.toUpperCase().trim();
}

export async function peekNextSet(
  userId: string,
  countryCode: string
): Promise<{ set: GeoSet; index: number }> {
  const code = normalizeCode(countryCode);
  const sets = GEO_HARDCODED_SETS[code];
  if (!sets) throw new Error(`No hardcoded sets for country: ${code}`);
  const ref = db.collection("geoRotations").doc(userId);
  const snap = await ref.get();
  const pointers: Record<string, number> = snap.exists ? (snap.data()?.pointers || {}) : {};
  const cur = typeof pointers[code] === "number" ? pointers[code] : 0;
  const idx = cur % sets.length;
  return { set: sets[idx], index: idx };
}

export async function advancePointer(userId: string, countryCode: string): Promise<number> {
  const code = normalizeCode(countryCode);
  const sets = GEO_HARDCODED_SETS[code];
  if (!sets) return -1;
  const ref = db.collection("geoRotations").doc(userId);
  return await db.runTransaction(async (tx: any) => {
    const snap = await tx.get(ref);
    const pointers: Record<string, number> = snap.exists ? (snap.data()?.pointers || {}) : {};
    const cur = typeof pointers[code] === "number" ? pointers[code] : 0;
    const next = (cur + 1) % sets.length;
    tx.set(
      ref,
      { userId, pointers: { ...pointers, [code]: next }, updatedAt: new Date().toISOString() },
      { merge: true }
    );
    return next;
  });
}

export function toDraftResponse(
  set: GeoSet,
  countryCode: string,
  countryName: string,
  durationSeconds: number,
  index: number
) {
  const questions = set.questions.map((q, i) => ({
    questionId: `q${i + 1}`,
    revision: 1,
    question: q.question,
    options: [...q.options],
    answer: q.answer,
    answerIndex: q.answerIndex,
    difficulty: q.difficulty,
    explanation: q.explanation,
    topicId: countryCode.toLowerCase(),
    topicName: countryName,
    verificationStatus: "UNVERIFIED" as const,
  }));
  return {
    engineId: "quiz",
    quizMode: "geo" as const,
    countryCode: countryCode.toUpperCase(),
    title: set.title,
    topic: `${countryName} Geography & Culture Quiz`,
    hook: set.hook,
    description: set.description,
    hashtags: [...set.hashtags],
    questions,
    renderProfile: "FAST_QUIZ" as const,
    durationSeconds,
    meta: {
      source: "hardcoded" as const,
      setId: set.setId,
      setIndex: index,
      setLabel: `${index + 1}/5`,
    },
  };
}

export function hasHardcodedCountry(countryCode: string): boolean {
  return normalizeCode(countryCode) in GEO_HARDCODED_SETS;
}

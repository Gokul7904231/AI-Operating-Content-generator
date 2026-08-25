import { describe, it, expect } from "vitest";
import {
  GEO_HARDCODED_SETS,
  getTotalQuestionCount,
  getCountrySets,
} from "../../lib/quiz/datasets/geo-hardcoded-sets";
import { peekNextSet, advancePointer, toDraftResponse, hasHardcodedCountry } from "../../lib/quiz/GeoRotationService";

const EXPECTED_COUNTRIES = ["IN", "US", "JP", "GB", "FR", "DE", "CA", "AU", "BR", "IT", "ES"];

describe("geo-hardcoded-sets: dataset invariants", () => {
  it("has 11 countries, each with 5 sets of 6 questions (330 total)", () => {
    expect(Object.keys(GEO_HARDCODED_SETS).sort()).toEqual(EXPECTED_COUNTRIES.slice().sort());
    for (const code of EXPECTED_COUNTRIES) {
      const sets = GEO_HARDCODED_SETS[code];
      expect(sets, `missing country ${code}`).toBeDefined();
      expect(sets.length, `${code} sets`).toBe(5);
      for (const set of sets) {
        expect(set.questions.length, `${code} set ${set.setId} question count`).toBe(6);
      }
    }
    expect(getTotalQuestionCount()).toBe(330);
  });

  it("each question has 4 options, answer in options, answerIndex consistent", () => {
    for (const [code, sets] of Object.entries(GEO_HARDCODED_SETS)) {
      for (const set of sets) {
        for (let i = 0; i < set.questions.length; i++) {
          const q = set.questions[i];
          expect(q.options.length, `${code}/${set.setId} Q${i + 1} options`).toBe(4);
          expect(q.options.includes(q.answer), `${code}/${set.setId} Q${i + 1} answer not in options: ${q.answer}`).toBe(true);
          expect(q.options[q.answerIndex], `${code}/${set.setId} Q${i + 1} answerIndex`).toBe(q.answer);
          expect(q.answerIndex >= 0 && q.answerIndex <= 3, `${code}/${set.setId} Q${i + 1} answerIndex bounds`).toBe(true);
          expect(typeof q.question === "string" && q.question.trim().length > 0, `${code}/${set.setId} Q${i + 1} text`).toBe(true);
          expect(typeof q.explanation === "string" && q.explanation.trim().length > 0, `${code}/${set.setId} Q${i + 1} explanation`).toBe(true);
          expect(["easy", "medium", "hard"].includes(q.difficulty), `${code}/${set.setId} Q${i + 1} difficulty`).toBe(true);
        }
      }
    }
  });

  it("no duplicate question text within a country (across 30 Qs)", () => {
    for (const code of EXPECTED_COUNTRIES) {
      const all = GEO_HARDCODED_SETS[code]!.flatMap((s) => s.questions.map((q) => q.question.trim().toLowerCase()));
      const dedup = new Set(all);
      expect(all.length, `${code} total`).toBe(30);
      expect(dedup.size, `${code} duplicates found`).toBe(30);
    }
  });

  it("each set has country-specific hook/title/hashtags", () => {
    for (const [code, sets] of Object.entries(GEO_HARDCODED_SETS)) {
      for (const set of sets) {
        expect(set.hook.trim().length > 0, `${code} set ${set.setId} hook`).toBe(true);
        expect(set.title.trim().length > 0, `${code} set ${set.setId} title`).toBe(true);
        expect(set.hashtags.length >= 3, `${code} set ${set.setId} hashtags`).toBe(true);
      }
    }
  });

  it("helpers work", () => {
    expect(getCountrySets("IN")!.length).toBe(5);
    expect(getCountrySets("XX")).toBeUndefined();
    expect(hasHardcodedCountry("JP")).toBe(true);
    expect(hasHardcodedCountry("XX")).toBe(false);
  });
});

describe("GeoRotationService (mock Firestore)", () => {
  it("peek is idempotent; advance increments and wraps 5->0", async () => {
    const uid = `test_${Date.now()}_${Math.random()}`;
    const code = "IN";
    let p = await peekNextSet(uid, code);
    expect(p.index).toBe(0);
    expect(p.set.setId).toBe(1);
    // second peek without advance -> same
    let p2 = await peekNextSet(uid, code);
    expect(p2.index).toBe(0);

    // advance 1..5 then wrap
    for (let i = 0; i < 5; i++) {
      const nxt = await advancePointer(uid, code);
      expect(nxt).toBe((i + 1) % 5);
      const peek = await peekNextSet(uid, code);
      expect(peek.index).toBe((i + 1) % 5);
    }
  });

  it("per-country pointers are independent", async () => {
    const uid = `test_${Date.now()}_${Math.random()}_2`;
    await advancePointer(uid, "IN");
    await advancePointer(uid, "IN");
    const inPeek = await peekNextSet(uid, "IN");
    const usPeek = await peekNextSet(uid, "US");
    expect(inPeek.index).toBe(2);
    expect(usPeek.index).toBe(0);
  });

  it("unknown country peek throws, advance returns -1", async () => {
    await expect(peekNextSet("u", "ZZ")).rejects.toThrow();
    expect(await advancePointer("u", "ZZ")).toBe(-1);
  });

  it("toDraftResponse shapes metadata correctly", async () => {
    const uid = `test_${Date.now()}_${Math.random()}_3`;
    const { set, index } = await peekNextSet(uid, "ES");
    const d = toDraftResponse(set, "ES", "Spain", 45, index);
    expect(d.engineId).toBe("quiz");
    expect(d.quizMode).toBe("geo");
    expect(d.questions.length).toBe(6);
    expect(d.meta.source).toBe("hardcoded");
    expect(d.meta.setLabel).toBe("1/5");
  });
});

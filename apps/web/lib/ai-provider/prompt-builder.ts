/**
 * Standard Prompt Builder and Normalizer for ShortForge AI Providers
 * ==================================================================
 * Constructs structured JSON-only generation prompts and parses responses safely.
 */

import { BasicVideoGenerationRequest, BasicVideoGenerationContent } from "./types";

export function buildSystemPrompt(request: BasicVideoGenerationRequest): string {
  const isQuiz = request.contentType === "QUIZ_SHORTS";

  if (isQuiz) {
    return `You are the FactoryOS YouTube Shorts Quiz Script Generator.
Generate high-retention, viral trivia quiz content formatted strictly as valid JSON.
DO NOT wrap in markdown backticks or explanations. Output ONLY raw JSON matching the required schema.`;
  }

  return `You are the FactoryOS YouTube Shorts Viral Content Generator.
Generate high-retention short-form video scripts (30-60 seconds) with visual image prompts for each scene.
Output ONLY raw JSON matching the required schema. DO NOT output markdown code blocks or additional text.`;
}

export function buildUserPrompt(request: BasicVideoGenerationRequest): string {
  const isQuiz = request.contentType === "QUIZ_SHORTS";
  const topic = request.topic.trim();
  const tone = request.tone || "Fascinating";
  const duration = request.durationSeconds || 45;
  const count = request.questionsCount || 3;

  if (isQuiz) {
    return `Topic: "${topic}"
Duration: ~${duration} seconds
Generate a trivia quiz with exactly ${count} engaging questions.

Required JSON Schema:
{
  "hook": "Compelling 1-sentence curiosity hook (e.g. 'Can you score 3/3 on this ${topic} quiz?')",
  "title": "Short catchy title",
  "description": "Engaging 1-sentence description",
  "hashtags": ["quiz", "trivia", "shorts"],
  "questions": [
    {
      "difficulty": "medium",
      "question": "Clear trivia question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option B",
      "explanation": "Brief 1-sentence fact explaining the answer."
    }
  ]
}`;
  }

  return `Topic: "${topic}"
Tone: ${tone}
Duration: ${duration} seconds

Generate a viral, educational vertical short video script divided into 3 to 4 sequential scenes.

Required JSON Schema:
{
  "title": "Engaging YouTube Shorts Title",
  "hook": "Powerful opening sentence that stops the scroll.",
  "script": "Complete narration script combining all scene texts.",
  "scenes": [
    {
      "contactText": "Narration text spoken during scene 1 (15-25 words).",
      "imagePrompt": "Ultra detailed, photorealistic 9:16 vertical cinematography prompt describing the visual for scene 1."
    },
    {
      "contactText": "Narration text spoken during scene 2 (15-25 words).",
      "imagePrompt": "Ultra detailed, photorealistic 9:16 vertical cinematography prompt describing the visual for scene 2."
    },
    {
      "contactText": "Narration text spoken during scene 3 (15-25 words).",
      "imagePrompt": "Ultra detailed, photorealistic 9:16 vertical cinematography prompt describing the visual for scene 3."
    }
  ],
  "hashtags": ["shorts", "facts", "education"]
}`;
}

export function normalizeProviderOutput(rawText: string, request: BasicVideoGenerationRequest): BasicVideoGenerationContent {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (err: any) {
        throw new Error(`Failed to parse JSON from provider response: ${err.message}`);
      }
    } else {
      throw new Error("Provider did not return a valid JSON object.");
    }
  }

  const isQuiz = request.contentType === "QUIZ_SHORTS";

  if (isQuiz) {
    const hook = parsed.hook || `How well do you know ${request.topic}?`;
    const title = parsed.title || `${request.topic} Quiz`;
    const description = parsed.description || `Test your knowledge on ${request.topic}!`;
    const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : ["quiz", "trivia", "shorts"];
    
    let questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    if (questions.length === 0 && Array.isArray(parsed.items)) {
      questions = parsed.items;
    }

    const normalizedQuestions = questions.map((q: any) => {
      const options = Array.isArray(q.options) ? q.options.map(String) : ["Option A", "Option B", "Option C", "Option D"];
      let answer = String(q.answer || options[0]);
      let answerIndex = typeof q.answerIndex === "number" ? q.answerIndex : options.indexOf(answer);
      if (answerIndex === -1) {
        answerIndex = 0;
        answer = options[0];
      }
      return {
        difficulty: ["easy", "medium", "hard"].includes(String(q.difficulty).toLowerCase()) ? q.difficulty.toLowerCase() : "medium",
        question: String(q.question || "Question"),
        options,
        answer,
        answerIndex,
        explanation: q.explanation ? String(q.explanation) : undefined,
      };
    });

    return {
      script: hook,
      scenes: [],
      hook,
      title,
      description,
      hashtags,
      questions: normalizedQuestions,
    };
  }

  // Standard Scenes / Facts normalization
  let scenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
  if (scenes.length === 0 && Array.isArray(parsed.segments)) {
    scenes = parsed.segments;
  }

  const normalizedScenes = scenes.map((s: any, idx: number) => ({
    contactText: String(s.contactText || s.text || s.narration || `Scene ${idx + 1}`),
    imagePrompt: String(s.imagePrompt || s.visual || s.prompt || `${request.topic}, cinematic 8k vertical 9:16`),
  }));

  const fullScript = parsed.script || normalizedScenes.map((s: any) => s.contactText).join(" ");

  return {
    script: fullScript,
    scenes: normalizedScenes,
    hook: parsed.hook || (normalizedScenes[0]?.contactText ?? ""),
    title: parsed.title || `${request.topic} - Shorts`,
    description: parsed.description || fullScript.slice(0, 150),
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : ["shorts", "facts"],
  };
}

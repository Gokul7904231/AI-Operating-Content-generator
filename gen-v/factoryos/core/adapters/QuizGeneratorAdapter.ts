import { scriptAgent, ScriptAgentInput } from "../../../agents/script-agent";

export interface QuizAdapterInput {
  topic: string;
  style?: string;
  durationSeconds?: number;
  renderProfile?: string;
  provider?: any;
  negativeConstraints?: string[];
}

export interface QuizQuestionItem {
  difficulty: "easy" | "medium" | "hard";
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface GeneratedQuizOutput {
  contentType: "QUIZ_SHORTS";
  hook: string;
  questions: QuizQuestionItem[];
  title: string;
  description: string;
  hashtags: string[];
  renderProfile: string;
  estimatedDuration: number;
  rawPayload: any;
}

/**
 * QuizGeneratorAdapter
 * 
 * Non-invasive FactoryOS adapter wrapping the FROZEN existing Quiz Generator.
 * FactoryOS calls this adapter to request quiz generation without altering
 * how the underlying generator operates.
 */
export class QuizGeneratorAdapter {
  /**
   * Invokes the existing frozen quiz generator (scriptAgent).
   */
  static async generateQuiz(input: QuizAdapterInput): Promise<GeneratedQuizOutput> {
    const scriptInput: ScriptAgentInput = {
      topic: input.topic,
      durationSeconds: input.durationSeconds ?? 60,
      style: input.style ?? "medium",
      contentType: "QUIZ_SHORTS",
      renderProfile: input.renderProfile ?? "FAST_QUIZ",
      provider: input.provider,
    };

    console.log(`[QuizGeneratorAdapter] Calling frozen scriptAgent for topic="${input.topic}"...`);
    const rawResult = await scriptAgent(scriptInput);

    if (!rawResult || !Array.isArray(rawResult.questions)) {
      throw new Error(`[QuizGeneratorAdapter] Frozen scriptAgent returned invalid payload.`);
    }

    const normalizedQuestions: QuizQuestionItem[] = rawResult.questions.map((q: any) => ({
      difficulty: q.difficulty === "easy" || q.difficulty === "hard" ? q.difficulty : "medium",
      question: String(q.question ?? "").trim(),
      options: Array.isArray(q.options) ? q.options.map((o: any) => String(o).trim()) : [],
      answer: String(q.answer ?? "").trim(),
      explanation: String(q.explanation ?? "").trim(),
    }));

    return {
      contentType: "QUIZ_SHORTS",
      hook: String(rawResult.hook ?? "").trim(),
      questions: normalizedQuestions,
      title: String(rawResult.title ?? input.topic).trim(),
      description: String(rawResult.description ?? "").trim(),
      hashtags: Array.isArray(rawResult.hashtags) ? rawResult.hashtags.map(String) : [],
      renderProfile: String(rawResult.renderProfile ?? scriptInput.renderProfile),
      estimatedDuration: Number(rawResult.estimatedDuration ?? 60),
      rawPayload: rawResult,
    };
  }
}

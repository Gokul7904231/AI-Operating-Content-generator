import { MediaInspector } from "./MediaInspector";

export interface TimelineEvent {
  type: "hook" | "question" | "outro";
  start: number;
  end: number;
  questionNumber?: number;
  question?: string;
  options?: string[];
  correctAnswerIndex?: number;
  readMeta?: any;
  revealMeta?: any;
  readingEnd?: number;
  thinkingEnd?: number;
  revealEnd?: number;
  countdownSecs?: number;
}

export interface Timeline {
  profile: string;
  resolvedProfile: string;
  duration: number;
  events: TimelineEvent[];
}

export class TimelineOrchestrator {
  /**
   * Orchestrates the complete video schedule.
   * Pure planner class that receives voice durations and returns a Timeline JSON representation.
   */
  static async orchestrate(params: {
    profileId: string;
    scenes: any[];
  }): Promise<Timeline> {
    const hookScene = params.scenes.find((s: any) => s.isHook);
    const outroScene = params.scenes.find((s: any) => s.isOutro);
    if (!hookScene || !outroScene) {
      throw new Error("TimelineOrchestrator: Missing Hook or Outro scene in raw breakdown.");
    }

    const readScenes = params.scenes.filter((s: any) => s.isQuestionRead);
    const numQuestions = readScenes.length;
    if (numQuestions === 0) {
      throw new Error("TimelineOrchestrator: No question read scenes found.");
    }

    // 1. Measure all speech narration wav files
    const hookMeta = await MediaInspector.inspectAudio(hookScene.audioPath);
    const outroMeta = await MediaInspector.inspectAudio(outroScene.audioPath);

    const questionSpecs: any[] = [];
    for (let idx = 0; idx < numQuestions; idx++) {
      const readScene = readScenes[idx];
      const qNum = readScene.questionNumber;
      const revealScene = params.scenes.find((s: any) => s.isQuestionReveal && s.questionNumber === qNum);
      if (!revealScene) {
        throw new Error(`TimelineOrchestrator: Missing reveal scene for question ${qNum}`);
      }

      const readMeta = await MediaInspector.inspectAudio(readScene.audioPath);
      const revealMeta = await MediaInspector.inspectAudio(revealScene.audioPath);

      questionSpecs.push({
        readScene,
        revealScene,
        readMeta,
        revealMeta,
        readDuration: readMeta.duration + 0.33,
        revealDuration: revealMeta.duration + 0.33
      });
    }

    // 2. Solve Profile Selection if profileId is AUTO
    let resolvedProfile = params.profileId || "Shorts 60";
    if (resolvedProfile.toUpperCase() === "AUTO") {
      const hookEst = Math.max(3.0, hookMeta.duration + 0.5);
      const outroEst = Math.max(3.0, outroMeta.duration + 0.5);
      const speechEst = questionSpecs.reduce((sum, q) => sum + q.readDuration + q.revealDuration, 0);
      const countdownsEst = numQuestions * 2.0; // minimum 2s countdown
      const totalEst = hookEst + outroEst + speechEst + countdownsEst;

      if (totalEst <= 60.0) {
        resolvedProfile = "Shorts 60";
      } else {
        resolvedProfile = "Extended 120";
      }
      console.log(`[TimelineOrchestrator] Auto profile resolved to: ${resolvedProfile} (Estimated total duration: ${totalEst.toFixed(2)}s)`);
    }

    const budget = resolvedProfile.toUpperCase().includes("120") ? 120 : 60;

    // 3. Solve exact frame allocations
    const hookSpeechSec = hookMeta.duration;
    const hookTargetSec = Math.max(3.0, hookSpeechSec + 0.5);
    const hookFrames = Math.round(hookTargetSec * 30);

    const outroSpeechSec = outroMeta.duration;
    const outroTargetSec = Math.max(3.0, outroSpeechSec + 0.5);
    const outroFrames = Math.round(outroTargetSec * 30);

    // Solve available question budget
    const speechRequiredFrames = hookFrames + outroFrames + questionSpecs.reduce((sum, q) => {
      const rF = Math.round(q.readDuration * 30);
      const revF = Math.round(q.revealDuration * 30);
      return sum + rF + revF;
    }, 0);

    const speechRequiredSec = speechRequiredFrames / 30;

    // Dynamically allocate countdown seconds within the budget
    const remainingBudgetSec = budget - speechRequiredSec;
    const countdownSecsPerQ = Math.floor(remainingBudgetSec / numQuestions);
    const countdownSecs = Math.max(2, Math.min(5, countdownSecsPerQ));
    const countdownFrames = countdownSecs * 30;
    const totalCountdownFrames = numQuestions * countdownFrames;

    // Target frames is exactly the speech required plus dynamic countdown frames
    const targetFrames = speechRequiredFrames + totalCountdownFrames;
    const targetDuration = targetFrames / 30;

    // Since we don't pad to exactly 60/120s, there are no extra frames
    const extraFrames = 0;
    const extraFramesPerQ = 0;

    // 4. Construct Timeline JSON
    let currentFrame = 0;
    const events: TimelineEvent[] = [];

    // Hook
    events.push({
      type: "hook",
      start: currentFrame / 30,
      end: (currentFrame + hookFrames) / 30,
      readMeta: hookMeta
    });
    currentFrame += hookFrames;

    // Questions
    for (let idx = 0; idx < numQuestions; idx++) {
      const q = questionSpecs[idx];
      const qNum = q.readScene.questionNumber;

      let qExtraFrames = extraFramesPerQ;
      if (idx === numQuestions - 1) {
        qExtraFrames = extraFrames - (numQuestions - 1) * extraFramesPerQ;
      }

      const qReadFrames = Math.round(q.readDuration * 30);
      const qRevealFrames = Math.round(q.revealDuration * 30) + qExtraFrames;

      const qStart = currentFrame;
      const qReadingEnd = currentFrame + qReadFrames;
      const qThinkingEnd = qReadingEnd + countdownFrames;
      const qRevealEnd = qThinkingEnd + qRevealFrames;

      events.push({
        type: "question",
        questionNumber: qNum,
        start: qStart / 30,
        readingEnd: qReadingEnd / 30,
        thinkingEnd: qThinkingEnd / 30,
        revealEnd: qRevealEnd / 30,
        end: qRevealEnd / 30,
        countdownSecs,
        question: q.readScene.question,
        options: q.readScene.options,
        correctAnswerIndex: q.readScene.correctAnswerIndex,
        readMeta: q.readMeta,
        revealMeta: q.revealMeta
      });

      currentFrame = qRevealEnd;
    }

    // Outro
    events.push({
      type: "outro",
      start: currentFrame / 30,
      end: (currentFrame + outroFrames) / 30,
      revealMeta: outroMeta
    });

    console.log(`[TimelineOrchestrator] Dynamic Timeline Solved successfully! Duration: ${targetDuration}s | Resolved: ${resolvedProfile}`);

    return {
      profile: params.profileId,
      resolvedProfile,
      duration: targetDuration,
      events
    };
  }
}

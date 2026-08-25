import { Timeline, TimelineEvent } from "./TimelineOrchestrator";
import { SceneInput } from "../renderer/SceneRenderPool";
import { FFmpegService } from "./FFmpegService";
import path from "path";
import fs from "fs";

export class RenderPlanner {
  /**
   * Translates the structured Timeline JSON into media-compilable SceneInput structures.
   * Performs silent audio padding and overlays SVG frames onto background images.
   */
  static async compile(params: {
    timeline: Timeline;
    scenes: any[];
    assetsDir: string;
  }): Promise<SceneInput[]> {
    console.log(`[RenderPlanner] Commencing compilation of timeline into render scenes...`);
    const compiledScenes: SceneInput[] = [];

    const hookScene = params.scenes.find((s: any) => s.isHook);
    const outroScene = params.scenes.find((s: any) => s.isOutro);
    const readScenes = params.scenes.filter((s: any) => s.isQuestionRead);

    let sceneIndex = 0;

    for (const event of params.timeline.events) {
      if (event.type === "hook") {
        const duration = event.end - event.start;
        const voicePath = path.join(params.assetsDir, `scene_${sceneIndex}_voice.wav`);
        const rawIndex = params.scenes.indexOf(hookScene);
        
        await this.padAudio(hookScene.audioPath, duration, voicePath);
        const imagePath = await this.overlaySVG(hookScene.imagePrompt, hookScene.narrative, "hook", params.assetsDir, sceneIndex, rawIndex);

        compiledScenes.push({
          index: sceneIndex,
          narrative: hookScene.narrative,
          imagePrompt: hookScene.imagePrompt,
          imagePath,
          audioPath: voicePath,
          duration,
          transition: "fade",
          isHook: true
        });
        sceneIndex++;
      } else if (event.type === "question") {
        const qNum = event.questionNumber!;
        const readScene = readScenes.find((s: any) => s.questionNumber === qNum)!;
        const revealScene = params.scenes.find((s: any) => s.isQuestionReveal && s.questionNumber === qNum)!;

        const readRawIndex = params.scenes.indexOf(readScene);
        const revealRawIndex = params.scenes.indexOf(revealScene);

        // 1. Reading Phase Scenes (Question + 4 Options dynamically appearing)
        const readDuration = event.readingEnd! - event.start;
        
        const tQuestion = readDuration * 0.40;
        const tOption = readDuration * 0.15;

        // Sub-scene 1: Question read
        const qVoicePath = path.join(params.assetsDir, `scene_${sceneIndex}_voice.wav`);
        await this.trimAudio(readScene.audioPath, 0, tQuestion, qVoicePath);
        const qImagePath = await this.overlaySVG(
          readScene.imagePrompt,
          readScene.narrative,
          "question_read",
          params.assetsDir,
          sceneIndex,
          readRawIndex,
          {
            question: event.question,
            options: event.options,
            correctAnswerIndex: event.correctAnswerIndex,
            countdownSecs: event.countdownSecs,
            currentCountdown: event.countdownSecs,
            numOptionsToShow: 0,
            questionNumber: qNum
          }
        );
        compiledScenes.push({
          index: sceneIndex,
          narrative: readScene.narrative,
          imagePrompt: readScene.imagePrompt,
          imagePath: qImagePath,
          audioPath: qVoicePath,
          duration: tQuestion,
          transition: "fade",
          isQuestionRead: true,
          isQuestion: true,
          questionNumber: qNum
        } as any);
        sceneIndex++;

        // Sub-scenes for each option A, B, C, D
        for (let oIdx = 0; oIdx < 4; oIdx++) {
          const optStart = tQuestion + oIdx * tOption;
          const optDur = (oIdx === 3) ? (readDuration - optStart) : tOption;
          
          const optVoicePath = path.join(params.assetsDir, `scene_${sceneIndex}_voice.wav`);
          await this.trimAudio(readScene.audioPath, optStart, optDur, optVoicePath);
          
          const optImagePath = await this.overlaySVG(
            readScene.imagePrompt,
            readScene.narrative,
            "question_read",
            params.assetsDir,
            sceneIndex,
            readRawIndex,
            {
              question: event.question,
              options: event.options,
              correctAnswerIndex: event.correctAnswerIndex,
              countdownSecs: event.countdownSecs,
              currentCountdown: event.countdownSecs,
              numOptionsToShow: oIdx + 1,
              questionNumber: qNum
            }
          );
          
          compiledScenes.push({
            index: sceneIndex,
            narrative: "",
            imagePrompt: readScene.imagePrompt,
            imagePath: optImagePath,
            audioPath: optVoicePath,
            duration: optDur,
            transition: "fade",
            isQuestionRead: true,
            isQuestion: true,
            questionNumber: qNum
          } as any);
          sceneIndex++;
        }

        // 2. Thinking Countdown Phase Scenes (each 1.0s)
        const countdownSecs = event.countdownSecs!;
        for (let c = countdownSecs; c >= 1; c--) {
          const silentVoicePath = path.join(params.assetsDir, `scene_${sceneIndex}_voice.wav`);
          const silentBuf = this.generateTrueSilentWavBuffer(1.0);
          fs.writeFileSync(silentVoicePath, silentBuf);

          const countImagePath = await this.overlaySVG(
            readScene.imagePrompt,
            "",
            "question_countdown",
            params.assetsDir,
            sceneIndex,
            readRawIndex,
            {
              question: event.question,
              options: event.options,
              correctAnswerIndex: event.correctAnswerIndex,
              countdownSecs,
              currentCountdown: c,
              questionNumber: qNum
            }
          );

          compiledScenes.push({
            index: sceneIndex,
            narrative: "",
            imagePrompt: readScene.imagePrompt,
            imagePath: countImagePath,
            audioPath: silentVoicePath,
            duration: 1.0,
            transition: "fade",
            isQuestionCountdown: true,
            isQuestion: true,
            countdownNumber: c,
            maxCountdown: countdownSecs,
            questionNumber: qNum
          } as any);
          sceneIndex++;
        }

        // 3. Reveal Phase Scene
        const revealDuration = event.revealEnd! - event.readingEnd! - (countdownSecs * 1.0);
        const revealVoicePath = path.join(params.assetsDir, `scene_${sceneIndex}_voice.wav`);
        await this.padAudio(revealScene.audioPath, revealDuration, revealVoicePath);

        const revealImagePath = await this.overlaySVG(
          revealScene.imagePrompt,
          revealScene.narrative,
          "question_reveal",
          params.assetsDir,
          sceneIndex,
          revealRawIndex,
          {
            question: event.question,
            options: event.options,
            correctAnswerIndex: event.correctAnswerIndex,
            countdownSecs,
            questionNumber: qNum
          }
        );

        compiledScenes.push({
          index: sceneIndex,
          narrative: revealScene.narrative,
          imagePrompt: revealScene.imagePrompt,
          imagePath: revealImagePath,
          audioPath: revealVoicePath,
          duration: revealDuration,
          transition: "fade",
          isQuestionReveal: true,
          isQuestion: true,
          questionNumber: qNum
        } as any);
        sceneIndex++;
      } else if (event.type === "outro") {
        const duration = event.end - event.start;
        const voicePath = path.join(params.assetsDir, `scene_${sceneIndex}_voice.wav`);
        const rawIndex = params.scenes.indexOf(outroScene);
        
        await this.padAudio(outroScene.audioPath, duration, voicePath);
        const imagePath = await this.overlaySVG(outroScene.imagePrompt, outroScene.narrative, "outro", params.assetsDir, sceneIndex, rawIndex);

        compiledScenes.push({
          index: sceneIndex,
          narrative: outroScene.narrative,
          imagePrompt: outroScene.imagePrompt,
          imagePath,
          audioPath: voicePath,
          duration,
          transition: "fade",
          isOutro: true
        });
        sceneIndex++;
      }
    }

    // Write scenes manifest for validation tests
    fs.writeFileSync(path.join(params.assetsDir, "scenes_manifest.json"), JSON.stringify(compiledScenes, null, 2), "utf8");

    console.log(`[RenderPlanner] Completed. Compiled ${compiledScenes.length} scenes.`);
    return compiledScenes;
  }

  private static async padAudio(wavPath: string, durationSec: number, outputPath: string) {
    const sampleRate = 44100;
    const totalSamples = Math.round(durationSec * sampleRate);

    const ffmpegArgs = [
      "-y",
      "-i", wavPath,
      "-filter_complex", `[0:a]atrim=end=${durationSec.toFixed(3)},apad=whole_len=${totalSamples}[aout]`,
      "-map", "[aout]",
      outputPath
    ];

    try {
      await FFmpegService.runFFmpeg(ffmpegArgs, { timeoutMs: 30000 });
    } catch (err: any) {
      console.error(`[RenderPlanner] padAudio failed for ${wavPath}:`, err.message);
      fs.copyFileSync(wavPath, outputPath); // fallback
    }
  }

  private static async trimAudio(wavPath: string, startSec: number, durationSec: number, outputPath: string) {
    const sampleRate = 44100;
    const totalSamples = Math.round(durationSec * sampleRate);

    const ffmpegArgs = [
      "-y",
      "-ss", startSec.toFixed(3),
      "-t", durationSec.toFixed(3),
      "-i", wavPath,
      "-filter_complex", `[0:a]apad=whole_len=${totalSamples}[aout]`,
      "-map", "[aout]",
      outputPath
    ];

    try {
      await FFmpegService.runFFmpeg(ffmpegArgs, { timeoutMs: 30000 });
    } catch (err: any) {
      console.error(`[RenderPlanner] trimAudio failed for ${wavPath}:`, err.message);
      fs.copyFileSync(wavPath, outputPath); // fallback
    }
  }

  private static generateTrueSilentWavBuffer(durationSeconds: number, sampleRate = 44100): Buffer {
    const numChannels = 1;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataSize = Math.ceil(durationSeconds * sampleRate) * blockAlign;
    const headerSize = 44;
    const buffer = Buffer.alloc(headerSize + dataSize);

    buffer.write("RIFF", 0, 4, "ascii");
    buffer.writeUInt32LE(headerSize + dataSize - 8, 4);
    buffer.write("WAVE", 8, 4, "ascii");
    buffer.write("fmt ", 12, 4, "ascii");
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * blockAlign, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write("data", 36, 4, "ascii");
    buffer.writeUInt32LE(dataSize, 40);

    return buffer;
  }

  private static async overlaySVG(
    imagePrompt: string,
    narrative: string,
    type: "hook" | "outro" | "question_read" | "question_countdown" | "question_reveal",
    assetsDir: string,
    sceneIndex: number,
    rawBackgroundIndex: number,
    qData?: any
  ): Promise<string> {
    const imgPath = path.join(assetsDir, `scene_${sceneIndex}.jpg`);
    
    // Resolve background path with 4 unique images mapping
    let backgroundPath = "";
    if (type === "hook") {
      backgroundPath = path.join(assetsDir, `scene_0_bg.jpg`);
    } else if (type === "outro") {
      backgroundPath = path.join(assetsDir, `outro_bg.jpg`);
    } else {
      const qNum = qData ? (qData.questionNumber || 1) : 1;
      let imgSubIdx = 0;
      if (type === "question_read") {
        if (qData && qData.numOptionsToShow > 0) {
          imgSubIdx = 1; // Options display
        } else {
          imgSubIdx = 0; // Question read
        }
      } else if (type === "question_countdown") {
        imgSubIdx = 2; // Countdown
      } else if (type === "question_reveal") {
        imgSubIdx = 3; // Answer Reveal
      }
      backgroundPath = path.join(assetsDir, `q_${qNum}_bg_${imgSubIdx}.jpg`);
    }

    if (!fs.existsSync(backgroundPath)) {
      // Fallback
      backgroundPath = path.join(assetsDir, `scene_${rawBackgroundIndex}_bg.jpg`);
      if (!fs.existsSync(backgroundPath)) {
        try {
          const pkg = "sharp";
          const sharpMod = require(pkg);
          await sharpMod({
            create: {
              width: 1080,
              height: 1920,
              channels: 3,
              background: { r: 15, g: 23, b: 42 }
            }
          })
          .jpeg()
          .toFile(backgroundPath);
        } catch {
          fs.writeFileSync(backgroundPath, Buffer.from(""));
        }
      }
    }

    const wrapText = (text: string, maxCharsPerLine: number): string[] => {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let currentLine = "";
      for (const word of words) {
        if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
          currentLine = (currentLine + " " + word).trim();
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines;
    };

    let svgContent = "";

    if (type === "hook") {
      const lines = wrapText(narrative, 26);
      const textElements = lines.map((line: string, idx: number) => {
        const startY = 850 - (lines.length - 1) * 35;
        const escapedLine = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<text x="540" y="${startY + idx * 70}" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="bold" fill="#ffffff" text-anchor="middle">${escapedLine}</text>`;
      }).join("\n");

      let topicHeader = "GEOGRAPHY QUIZ";
      if (narrative.toLowerCase().includes("india")) topicHeader = "🧠 INDIA GEOGRAPHY QUIZ";
      else if (narrative.toLowerCase().includes("japan")) topicHeader = "🧠 JAPAN GEOGRAPHY QUIZ";

      svgContent = `
        <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="rgba(8,18,40,0.0)"/>
              <stop offset="40%" stop-color="rgba(8,18,40,0.3)"/>
              <stop offset="100%" stop-color="rgba(8,18,40,0.65)"/>
            </linearGradient>
          </defs>
          <rect width="1080" height="1920" fill="url(#bgGrad)" />

          <!-- Glassmorphism Card -->
          <rect x="90" y="500" width="900" height="900" rx="26" ry="26" fill="rgba(8,18,40,0.45)" stroke="rgba(0,170,255,0.6)" stroke-width="2.5" />
          
          <text x="540" y="630" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="bold" fill="#00aaff" letter-spacing="4" text-anchor="middle">${topicHeader}</text>
          <line x1="160" y1="670" x2="920" y2="670" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" />
          ${textElements}
        </svg>
      `;
    } else if (type === "outro") {
      let outroHeader = "QUIZ COMPLETED";
      if (narrative.toLowerCase().includes("india") || imagePrompt.toLowerCase().includes("india")) outroHeader = "🧠 INDIA QUIZ COMPLETE";
      svgContent = `
        <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="rgba(8,18,40,0.0)"/>
              <stop offset="40%" stop-color="rgba(8,18,40,0.3)"/>
              <stop offset="100%" stop-color="rgba(8,18,40,0.65)"/>
            </linearGradient>
          </defs>
          <rect width="1080" height="1920" fill="url(#bgGrad)" />

          <!-- Glassmorphism Card -->
          <rect x="90" y="500" width="900" height="900" rx="26" ry="26" fill="rgba(8,18,40,0.45)" stroke="rgba(0,170,255,0.6)" stroke-width="2.5" />
          
          <text x="540" y="630" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="bold" fill="#00aaff" letter-spacing="4" text-anchor="middle">${outroHeader}</text>
          <line x1="160" y1="670" x2="920" y2="670" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" />
          <text x="540" y="780" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="bold" fill="#ffffff" text-anchor="middle">HOW MANY DID YOU GET RIGHT?</text>
          
          <rect x="150" y="880" width="780" height="110" rx="22" ry="22" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" />
          <text x="540" y="946" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="bold" fill="#00aaff" text-anchor="middle">💬 Comment your score below!</text>
          
          <rect x="150" y="1020" width="780" height="110" rx="22" ry="22" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" />
          <text x="540" y="1086" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="bold" fill="#ffffff" text-anchor="middle">➕ Follow for more daily quizzes!</text>
        </svg>
      `;
    } else {
      const questionLines = wrapText(qData.question || "", 26);
      const questionTextElements = questionLines.map((line: string, idx: number) => {
        const escapedLine = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<text x="540" y="${580 + idx * 64}" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700" fill="#ffffff" text-anchor="middle">${escapedLine}</text>`;
      }).join("\n");

      const letters = ["A", "B", "C", "D"];
      const isReveal = type === "question_reveal";

      const optionCards = (qData.options || []).map((opt: string, idx: number) => {
        if (qData.numOptionsToShow !== undefined && idx >= qData.numOptionsToShow) {
          return "";
        }
        const startY = 880 + idx * 140;
        const escapedOpt = opt.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        const isCorrect = idx === qData.correctAnswerIndex;
        
        let cardFill = "rgba(255,255,255,0.06)";
        let cardStroke = "rgba(255,255,255,0.12)";
        let strokeWidth = "1.5";
        let badgeFill = "rgba(0,170,255,0.2)";
        let badgeStroke = "rgba(0,170,255,0.6)";
        let textFill = "#e2e8f0";
        let badgeText = letters[idx];

        if (isReveal) {
          if (isCorrect) {
            cardFill = "rgba(34, 197, 94, 0.22)";
            cardStroke = "#22c55e";
            strokeWidth = "3.5";
            badgeFill = "#22c55e";
            badgeStroke = "#22c55e";
            textFill = "#22c55e";
            badgeText = "✓";
          } else {
            cardFill = "rgba(255,255,255,0.02)";
            cardStroke = "rgba(255,255,255,0.05)";
            textFill = "#64748b";
            badgeFill = "rgba(255,255,255,0.04)";
            badgeStroke = "rgba(255,255,255,0.1)";
          }
        }

        return `
          <!-- Option Card ${letters[idx]} -->
          <g transform="translate(120, ${startY})">
            <rect x="0" y="0" width="840" height="110" rx="22" ry="22" fill="${cardFill}" stroke="${cardStroke}" stroke-width="${strokeWidth}" />
            <circle cx="60" cy="55" r="28" fill="${badgeFill}" stroke="${badgeStroke}" stroke-width="1.5" />
            <text x="60" y="64" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="bold" fill="${isReveal && isCorrect ? '#0f172a' : '#ffffff'}" text-anchor="middle">${badgeText}</text>
            <text x="120" y="66" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="600" fill="${textFill}">${escapedOpt}</text>
          </g>
        `;
      }).join("\n");

      // Top-right Educational Overlay Widget — REMOVED per polishing pass.
      // Decorative icons are no longer rendered on the question card.

      let timerText = "";
      let timerColor = "#00aaff";
      if (type === "question_read") {
        timerText = `${qData.countdownSecs}s`;
      } else if (type === "question_countdown") {
        timerText = `${qData.currentCountdown}s`;
      } else if (type === "question_reveal") {
        timerText = "✓";
        timerColor = "#22c55e";
      }

      let topicHeader = "GEOGRAPHY QUIZ";
      const qLower = (qData.question || "").toLowerCase();
      if (qLower.includes("india")) topicHeader = "🧠 INDIA GEOGRAPHY QUIZ";
      else if (qLower.includes("japan")) topicHeader = "🧠 JAPAN GEOGRAPHY QUIZ";

      svgContent = `
        <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="rgba(8,18,40,0.0)"/>
              <stop offset="40%" stop-color="rgba(8,18,40,0.3)"/>
              <stop offset="100%" stop-color="rgba(8,18,40,0.65)"/>
            </linearGradient>
          </defs>
          <rect width="1080" height="1920" fill="url(#bgGrad)" />
          <rect x="90" y="450" width="900" height="1060" rx="26" ry="26" fill="rgba(8,18,40,0.45)" stroke="rgba(0,170,255,0.6)" stroke-width="2.5" />
          <rect x="490" y="340" width="100" height="60" rx="30" fill="rgba(8,18,40,0.6)" stroke="${timerColor}" stroke-width="2.5" />
          <text x="540" y="384" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="bold" fill="${timerColor}" text-anchor="middle">${timerText}</text>
          <text x="540" y="520" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="bold" fill="#00aaff" letter-spacing="4" text-anchor="middle">${topicHeader}</text>
          <line x1="160" y1="545" x2="920" y2="545" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" />
          ${questionTextElements}
          <line x1="160" y1="840" x2="920" y2="840" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" />
          ${optionCards}
        </svg>
      `;
    }

    try {
      const pkg = "sharp";
      const sharpMod = require(pkg);
      await sharpMod(backgroundPath)
        .blur(8)
        .modulate({ brightness: 0.6 })
        .composite([{ input: Buffer.from(svgContent), top: 0, left: 0 }])
        .jpeg()
        .toFile(imgPath);
    } catch {
      fs.writeFileSync(imgPath, Buffer.from(svgContent));
    }

    return imgPath;
  }
}

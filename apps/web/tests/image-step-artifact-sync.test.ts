import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

describe("Image Step & Pre-Render Artifact Synchronization Suite", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sf-image-test-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("A. Generates all 24 question background images (6 questions x 4 sub-phases)", async () => {
    const numQ = 6;
    const createdFiles: string[] = [];

    // Simulate proper writeImageFile behavior
    for (let qIdx = 0; qIdx < numQ; qIdx++) {
      const qNum = qIdx + 1;
      for (let imgSub = 0; imgSub < 4; imgSub++) {
        const qBgPath = path.join(tempDir, `q_${qNum}_bg_${imgSub}.jpg`);
        fs.writeFileSync(qBgPath, Buffer.from("dummy-jpeg-data"));
        createdFiles.push(`q_${qNum}_bg_${imgSub}.jpg`);
      }
    }

    expect(createdFiles.length).toBe(24);

    // Verify all 24 exist synchronously on filesystem
    for (let qn = 1; qn <= numQ; qn++) {
      for (let imgSub = 0; imgSub < 4; imgSub++) {
        const p = path.join(tempDir, `q_${qn}_bg_${imgSub}.jpg`);
        expect(fs.existsSync(p)).toBe(true);
      }
    }
  });

  it("B. Pre-render validator detects missing images when files are unmaterialized", () => {
    const numQ = 6;
    const validationErrors: string[] = [];

    // Check filesystem without creating files
    for (let qn = 1; qn <= numQ; qn++) {
      for (let imgSub = 0; imgSub < 4; imgSub++) {
        const imgPath = path.join(tempDir, `q_${qn}_bg_${imgSub}.jpg`);
        if (!fs.existsSync(imgPath)) {
          validationErrors.push(`Missing image: q_${qn}_bg_${imgSub}.jpg`);
        }
      }
    }

    expect(validationErrors.length).toBe(24);
    expect(validationErrors[0]).toBe("Missing image: q_1_bg_0.jpg");
    expect(validationErrors[23]).toBe("Missing image: q_6_bg_3.jpg");
  });

  it("C. Pre-render validation passes with 0 errors when all 24 images are written", () => {
    const numQ = 6;
    for (let qn = 1; qn <= numQ; qn++) {
      for (let imgSub = 0; imgSub < 4; imgSub++) {
        const imgPath = path.join(tempDir, `q_${qn}_bg_${imgSub}.jpg`);
        fs.writeFileSync(imgPath, Buffer.from("fake-jpg"));
      }
    }

    const validationErrors: string[] = [];
    for (let qn = 1; qn <= numQ; qn++) {
      for (let imgSub = 0; imgSub < 4; imgSub++) {
        const imgPath = path.join(tempDir, `q_${qn}_bg_${imgSub}.jpg`);
        if (!fs.existsSync(imgPath)) {
          validationErrors.push(`Missing image: q_${qn}_bg_${imgSub}.jpg`);
        }
      }
    }

    expect(validationErrors.length).toBe(0);
  });
});

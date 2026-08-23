export type CreatorErrorAction = {
  title: string;
  why: string;
  actionLabel: string;
};

export type MappedError = CreatorErrorAction & {
  code: string;
  raw?: string;
};

function norm(s: string) {
  return s.toLowerCase();
}

export function mapValidationError(codeOrMessage: string, details?: string): MappedError {
  const raw = [codeOrMessage, details].filter(Boolean).join(" — ");
  const msg = norm(`${codeOrMessage} ${details ?? ""}`);

  // Keep mapping conservative — unknown errors fall through to generic actionable card
  const patterns: Array<{ test: (m: string) => boolean; mapped: Omit<MappedError, "code" | "raw">; code: string }> = [
    {
      code: "HOOK_MISSING",
      test: (m) => m.includes("missing hook") || m.includes("hook is required"),
      mapped: {
        title: "Opening hook needs a revision",
        why: "Your opening line is missing or could not be read. The video needs a hook to start.",
        actionLabel: "Edit hook",
      },
    },
    {
      code: "HOOK_SCORE_LOW",
      test: (m) => m.includes("hook score"),
      mapped: {
        title: "Hook needs revision",
        why: "Your opening claim could not be verified as a strong hook. Try a more specific or provocative line.",
        actionLabel: "Edit hook",
      },
    },
    {
      code: "SCENE_QUALITY_LOW",
      test: (m) => m.includes("scene quality"),
      mapped: {
        title: "A scene needs a stronger visual",
        why: "One of your scenes was scored too generic. Make the visual prompt more specific.",
        actionLabel: "Edit scene",
      },
    },
    {
      code: "HASHTAGS_INVALID",
      test: (m) => m.includes("hashtags"),
      mapped: {
        title: "Hashtags need attention",
        why: "Hashtags are missing or too few. Add 5–10 relevant tags.",
        actionLabel: "Edit tags",
      },
    },
    {
      code: "TITLE_GENERIC",
      test: (m) => m.includes("title too generic") || m.includes("generic title"),
      mapped: {
        title: "Title is too generic",
        why: "Pick a more specific title so viewers (and validation) can tell what the video is about.",
        actionLabel: "Edit title",
      },
    },
    {
      code: "TOPIC_DUPLICATE",
      test: (m) => m.includes("duplicate") && m.includes("topic"),
      mapped: {
        title: "Topic looks duplicated",
        why: "This topic is too close to something you already generated. Try a more distinct angle.",
        actionLabel: "Change topic",
      },
    },
    {
      code: "QUESTION_DUPLICATE",
      test: (m) => m.includes("duplicate question"),
      mapped: {
        title: "Duplicate question found",
        why: "Two questions are essentially the same. Rewrite one to be distinct.",
        actionLabel: "Edit questions",
      },
    },
    {
      code: "QUESTION_INVALID",
      test: (m) => m.includes("question") && (m.includes("missing") || m.includes("invalid") || m.includes("at least")),
      mapped: {
        title: "A question needs fixing",
        why: "One of your questions is missing text, options, or a valid answer.",
        actionLabel: "Edit questions",
      },
    },
    {
      code: "THUMBNAIL_NOT_READY",
      test: (m) => m.includes("thumbnail"),
      mapped: {
        title: "Thumbnail not ready",
        why: "The thumbnail proposal is missing its prompt or headline. Regenerate or adjust the topic.",
        actionLabel: "Regenerate",
      },
    },
    {
      code: "QUOTA_EXCEEDED",
      test: (m) => m.includes("quota"),
      mapped: {
        title: "Generation quota reached",
        why: "You've used your free render slots. Upgrade or clear old jobs to continue.",
        actionLabel: "View library",
      },
    },
  ];

  for (const p of patterns) {
    if (p.test(msg)) {
      return { code: p.code, raw, ...p.mapped };
    }
  }

  // Generic fallback — still actionable, never raw
  return {
    code: "VALIDATION_FAILED",
    raw,
    title: "Something needs your attention",
    why: codeOrMessage || "Validation did not pass. Review the draft and try again.",
    actionLabel: "Review draft",
  };
}

export function mapValidationErrors(errors: string[]): MappedError[] {
  return errors.map((e) => mapValidationError(e));
}

import { NextResponse } from "next/server";
import { EngineDiscovery } from "@/lib/core/EngineDiscovery";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

const INITIAL_TEMPLATES = [
  { id: "quiz-fast", name: "Quick Quiz (Fast)", category: "Interactive", description: "Rapid quiz generation optimized for speed. Best for bulk creation.", tags: ["fast", "quiz"], stepCount: 8, renderProfile: "FAST_QUIZ", version: "1.0", prompt: "Generate trivia questions on {topic}...", variables: "topic, difficulty", isOfficial: true },
  { id: "story-cinematic", name: "Cinematic Story", category: "Narrative", description: "High-quality narrative story with longer scenes and cinematic pacing.", tags: ["quality", "story"], stepCount: 8, renderProfile: "CINEMATIC", version: "1.0", prompt: "Create a narrative about {character}...", variables: "character, setting", isOfficial: true },
  { id: "motivation-viral", name: "Viral Motivation", category: "Aesthetic", description: "Hook-optimized motivational content targeting high engagement.", tags: ["viral", "fast"], stepCount: 8, renderProfile: "VIRAL_SHORT", version: "1.0", prompt: "Generate high impact quotes on {theme}...", variables: "theme, backgroundStyle", isOfficial: true },
  { id: "gk-educational", name: "Educational GK", category: "Trivia", description: "General knowledge content with educational tone and clear explanations.", tags: ["quality"], stepCount: 8, renderProfile: "EDUCATIONAL", version: "1.0", prompt: "Teach us 3 facts about {subject}...", variables: "subject", isOfficial: true },
  { id: "science-deep", name: "Deep Space Mystery", category: "Community", description: "Fascinating space phenomena facts with dramatic narration.", tags: ["viral", "community"], stepCount: 8, renderProfile: "CINEMATIC", version: "1.2", prompt: "Explore the secrets of {phenomenon}...", variables: "phenomenon", isCommunity: true },
];

export async function GET() {
  try {
    // Make sure we scan custom ones
    await EngineDiscovery.discoverAll();

    const dataDir = path.resolve(process.cwd(), "data");
    const filePath = path.join(dataDir, "custom-templates.json");
    let customTemplates = [];
    if (fs.existsSync(filePath)) {
      customTemplates = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }

    return NextResponse.json({
      success: true,
      templates: [...INITIAL_TEMPLATES, ...customTemplates]
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, category, description, prompt, variables, version } = body;
    if (!name) {
      return NextResponse.json({ success: false, error: "Template name is required" }, { status: 400 });
    }

    const id = `custom_${Math.random().toString(36).substring(2, 9)}`;
    const newTemplate = {
      id,
      name,
      category,
      description,
      tags: ["custom"],
      stepCount: 8,
      renderProfile: "CUSTOM_PROFILE",
      version: version || "1.0",
      prompt,
      variables,
    };

    EngineDiscovery.registerDynamicTemplate(newTemplate);

    return NextResponse.json({ success: true, template: newTemplate });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }
    EngineDiscovery.deleteDynamicTemplate(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

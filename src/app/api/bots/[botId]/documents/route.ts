import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { extractFile, extractUrl } from "@/lib/ai/extract";
import { ingestDocument } from "@/lib/ai/ingest";
import { formatBytes } from "@/lib/utils";

export const runtime = "nodejs";
// Embedding a large PDF takes a while; the default 15s would cut it off.
export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ botId: string }> },
) {
  const { botId } = await params;
  const { plan } = await requireSession();
  const supabase = await createClient();

  // RLS scopes this to the caller's bots, so a miss means "not yours".
  const { data: bot } = await supabase
    .from("bots")
    .select("id")
    .eq("id", botId)
    .maybeSingle();

  if (!bot) {
    return NextResponse.json({ error: "Assistant not found." }, { status: 404 });
  }

  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("bot_id", botId);

  if ((count ?? 0) >= plan.limits.documentsPerBot) {
    return NextResponse.json(
      {
        error: `Your ${plan.name} plan holds ${plan.limits.documentsPerBot} documents per assistant. Upgrade to add more.`,
        upgrade: true,
      },
      { status: 402 },
    );
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      if (!plan.features.websiteCrawl) {
        return NextResponse.json(
          {
            error: "Importing from a URL is a Business feature.",
            upgrade: true,
          },
          { status: 402 },
        );
      }

      const { url } = (await request.json()) as { url?: string };
      if (!url?.trim()) {
        return NextResponse.json({ error: "Enter a URL." }, { status: 400 });
      }

      const extracted = await extractUrl(url.trim());
      const result = await ingestDocument(supabase, botId, extracted, url.trim());
      return NextResponse.json(result);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file received." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "That file is empty." }, { status: 400 });
    }
    if (file.size > plan.limits.maxFileBytes) {
      return NextResponse.json(
        {
          error: `Files are capped at ${formatBytes(plan.limits.maxFileBytes)} on the ${plan.name} plan.`,
          upgrade: true,
        },
        { status: 402 },
      );
    }

    const extracted = await extractFile(file);
    const result = await ingestDocument(supabase, botId, extracted, file.name);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not process that document.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

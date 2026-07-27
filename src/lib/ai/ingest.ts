import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkText } from "./chunk";
import { embedDocuments } from "./embed";
import type { Extracted } from "./extract";

/**
 * Turn extracted text into a searchable document: create the row, chunk,
 * embed, store. The document row is written first with status `processing`
 * so a failure part-way through is visible in the UI instead of silent.
 *
 * `supabase` is the caller's RLS-scoped client — ownership of `botId` is
 * enforced by the policy, not by this function.
 */
export async function ingestDocument(
  supabase: SupabaseClient,
  botId: string,
  extracted: Extracted,
  source: string,
): Promise<{ documentId: string; chunks: number }> {
  const { data: doc, error: insertError } = await supabase
    .from("documents")
    .insert({
      bot_id: botId,
      title: extracted.title.slice(0, 200),
      source: source.slice(0, 500),
      kind: extracted.kind,
      status: "processing",
      char_count: extracted.text.length,
    })
    .select("id")
    .single();

  if (insertError || !doc) {
    throw new Error(insertError?.message ?? "Could not create the document.");
  }

  try {
    const chunks = chunkText(extracted.text);
    if (chunks.length === 0) {
      throw new Error(
        "No readable text found. Scanned PDFs without a text layer aren't supported yet.",
      );
    }

    const embeddings = await embedDocuments(chunks);

    const rows = chunks.map((content, i) => ({
      document_id: doc.id,
      bot_id: botId,
      content,
      // pgvector's text input format — safer than relying on array coercion.
      embedding: JSON.stringify(embeddings[i]),
    }));

    // Insert in batches so a large document doesn't blow the request size cap.
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from("chunks").insert(rows.slice(i, i + 200));
      if (error) throw new Error(error.message);
    }

    await supabase.from("documents").update({ status: "ready" }).eq("id", doc.id);

    return { documentId: doc.id, chunks: chunks.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed.";
    await supabase
      .from("documents")
      .update({ status: "failed", error: message.slice(0, 500) })
      .eq("id", doc.id);
    throw error;
  }
}

import { geminiPost, geminiUrl } from "./gemini";

/**
 * Embeddings via Gemini.
 *
 * `gemini-embedding-2` is asked for 1536 dimensions to match `vector(1536)` in
 * the schema. It returns truncated vectors already L2-normalized, so cosine
 * distance in pgvector is directly meaningful — the older
 * `gemini-embedding-001` returns un-normalized vectors at this size and would
 * need normalizing by hand.
 */
const MODEL = "gemini-embedding-2";
const DIMENSIONS = 1536;

/**
 * Batches stay small: the free tier rejects large batches outright, and a
 * failed batch costs more time in retries than a few extra requests.
 */
const BATCH_SIZE = 25;

/**
 * Documents and questions are embedded with different task types. Gemini maps
 * them into a shared space tuned for asymmetric retrieval — a short question
 * lands near the long passage that answers it, rather than near other short
 * questions. Using one task type for both measurably degrades retrieval.
 */
type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

/** Embed a visitor's question for lookup. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedBatch([text], "RETRIEVAL_QUERY");
  return vector;
}

/** Embed document chunks for storage. */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    vectors.push(...(await embedBatch(batch, "RETRIEVAL_DOCUMENT")));
  }

  return vectors;
}

async function embedBatch(texts: string[], taskType: TaskType): Promise<number[][]> {
  const response = await geminiPost(geminiUrl(MODEL, "batchEmbedContents"), {
    requests: texts.map((text) => ({
      model: `models/${MODEL}`,
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: DIMENSIONS,
    })),
  });

  const { embeddings } = (await response.json()) as {
    embeddings: { values: number[] }[];
  };

  if (!embeddings || embeddings.length !== texts.length) {
    throw new Error("The embedding service returned an unexpected response.");
  }

  return embeddings.map((embedding) => embedding.values);
}

/**
 * Split a document into overlapping chunks for embedding.
 *
 * Chunks are built from paragraphs so a chunk rarely cuts a sentence in half,
 * which keeps retrieved context readable when it lands in the prompt.
 *
 * The target is deliberately small (~300 tokens). These documents are price
 * lists, opening hours and policies — a page where every paragraph is a
 * different topic. A large chunk covering prices *and* hours *and* booking
 * averages into a vector that matches no single question well, so a visitor
 * asking about hours gets no hit even though the text is right there. Smaller,
 * single-topic chunks retrieve far more reliably, and we send up to six of them
 * so the model still sees plenty of context.
 */

const TARGET_CHARS = 1200;
const OVERLAP_CHARS = 200;
const MIN_CHARS = 60;

export function chunkText(input: string): string[] {
  const text = normalize(input);
  if (text.length <= TARGET_CHARS) {
    return text.length >= MIN_CHARS ? [text] : [];
  }

  const paragraphs = text.split(/\n{2,}/).flatMap(splitOversizedParagraph);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > TARGET_CHARS) {
      chunks.push(current);
      current = tail(current, OVERLAP_CHARS);
    }
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  if (current.trim().length >= MIN_CHARS) chunks.push(current);

  return chunks.map((c) => c.trim()).filter((c) => c.length >= MIN_CHARS);
}

function normalize(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** A single paragraph longer than the target is split on sentence boundaries. */
function splitOversizedParagraph(paragraph: string): string[] {
  if (paragraph.length <= TARGET_CHARS) return [paragraph];

  const sentences = paragraph.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) ?? [paragraph];
  const parts: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current && current.length + sentence.length > TARGET_CHARS) {
      parts.push(current.trim());
      current = "";
    }
    // A single sentence over the limit (tables, minified text) is hard-cut.
    if (sentence.length > TARGET_CHARS) {
      for (let i = 0; i < sentence.length; i += TARGET_CHARS) {
        parts.push(sentence.slice(i, i + TARGET_CHARS).trim());
      }
      continue;
    }
    current += sentence;
  }
  if (current.trim()) parts.push(current.trim());

  return parts;
}

/** Last N characters, snapped forward to a word boundary. */
function tail(text: string, chars: number) {
  const slice = text.slice(-chars);
  const space = slice.indexOf(" ");
  return space === -1 ? slice : slice.slice(space + 1);
}

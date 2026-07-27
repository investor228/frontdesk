import * as cheerio from "cheerio";

export type Extracted = {
  text: string;
  kind: "pdf" | "docx" | "text" | "url";
  title: string;
};

const TEXT_EXTENSIONS = [".txt", ".md", ".markdown", ".csv", ".json"];

/** Pull plain text out of an uploaded file. */
export async function extractFile(file: File): Promise<Extracted> {
  const name = file.name;
  const lower = name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (lower.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return { text: String(text), kind: "pdf", title: name };
  }

  if (lower.endsWith(".docx")) {
    const mammoth = (await import("mammoth")).default;
    const { value } = await mammoth.extractRawText({ buffer });
    return { text: value, kind: "docx", title: name };
  }

  if (TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return { text: buffer.toString("utf8"), kind: "text", title: name };
  }

  throw new Error(
    "Unsupported file type. Upload a PDF, DOCX, TXT, MD, CSV or JSON file.",
  );
}

/** Fetch a public page and reduce it to readable text. */
export async function extractUrl(rawUrl: string): Promise<Extracted> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http and https URLs can be imported.");
  }

  const response = await fetch(url, {
    headers: { "user-agent": "FrontdeskBot/1.0 (+https://frontdesk.app)" },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`The page returned ${response.status}.`);
  }
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) {
    throw new Error("That URL is not an HTML page.");
  }

  const $ = cheerio.load(await response.text());
  $("script, style, noscript, svg, nav, header, footer, form, iframe").remove();

  const title = $("title").first().text().trim() || url.hostname;
  const body = $("main").length ? $("main") : $("body");

  // Keep block-level breaks so chunking still sees paragraph boundaries.
  const text = body
    .find("h1, h2, h3, h4, h5, h6, p, li, td, th, dd, dt, blockquote, pre")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .join("\n\n");

  return { text: text || body.text(), kind: "url", title };
}

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

/**
 * Hosts that must never be fetched. Without this the importer is a
 * server-side request forgery primitive: a user supplies a URL and our server
 * fetches it from inside the deployment's network, where it may reach cloud
 * metadata endpoints or internal services a browser could not.
 */
function assertPublicHost(url: URL) {
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  const blocked =
    host === "localhost" ||
    host === "metadata.google.internal" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    // IPv4 loopback, private and link-local ranges (169.254.169.254 is the
    // cloud metadata address on most providers).
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^0\./.test(host) ||
    // IPv6 loopback, unique-local and link-local.
    host === "::1" ||
    /^f[cd][0-9a-f]{2}:/i.test(host) ||
    /^fe80:/i.test(host);

  if (blocked) {
    throw new Error("That address isn't publicly reachable.");
  }
}

/** Fetch a public page and reduce it to readable text. */
export async function extractUrl(rawUrl: string): Promise<Extracted> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http and https URLs can be imported.");
  }
  assertPublicHost(url);

  // Redirects are followed by hand so each hop is checked too — otherwise a
  // public URL could bounce us to an internal one.
  let current = url;
  let response: Response | undefined;

  for (let hop = 0; hop < 4; hop++) {
    response = await fetch(current, {
      headers: { "user-agent": "FrontdeskBot/1.0 (+https://frontdesk.app)" },
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });

    if (response.status < 300 || response.status >= 400) break;

    const location = response.headers.get("location");
    if (!location) break;

    current = new URL(location, current);
    if (current.protocol !== "https:" && current.protocol !== "http:") {
      throw new Error("That page redirects somewhere we can't follow.");
    }
    assertPublicHost(current);
    response = undefined;
  }

  if (!response) {
    throw new Error("That page redirects too many times.");
  }
  if (!response.ok) {
    throw new Error(`The page returned ${response.status}.`);
  }
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) {
    throw new Error("That URL is not an HTML page.");
  }

  const $ = cheerio.load(await response.text());
  $("script, style, noscript, svg, nav, header, footer, form, iframe").remove();

  const title = $("title").first().text().trim() || current.hostname;
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

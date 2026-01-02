import type { SourceRow, OpportunityUpsertInput } from "../../_shared/types.ts";
import { normalizeText, safeStr } from "../../_shared/text.ts";
import { XMLParser } from "npm:fast-xml-parser@4.5.3";

/* -----------------------------
   Utils
----------------------------- */
function parseDate(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function textOf(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v).trim();

  // fast-xml-parser can return objects like { "#text": "..." }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const t = o["#text"];
    if (typeof t === "string") return t.trim();
  }
  return "";
}

function arrify<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function makeFingerprint(sourceKey: string, externalId: string, title: string, link: string): string {
  const base = externalId
    ? `${sourceKey}::${externalId}`
    : `${sourceKey}::${normalizeText(title)}::${normalizeText(link)}`;

  // FNV-1a 32-bit
  let h = 2166136261;
  for (let i = 0; i < base.length; i++) {
    h ^= base.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${sourceKey}-${(h >>> 0).toString(16)}`;
}

function pickLink(entry: any): string {
  // RSS: <link>https://...</link>
  const rssLink = textOf(entry?.link);
  if (rssLink) return rssLink;

  // Atom: <link href="..."/> OR multiple links
  // fast-xml-parser keeps attributes under "@_"
  const linkNode = entry?.link;

  // If multiple <link>, can be array
  const links = arrify(linkNode);
  for (const ln of links) {
    const href = ln && typeof ln === "object" ? String((ln as any)["@_href"] ?? "").trim() : "";
    if (href) return href;
    const maybeText = textOf(ln);
    if (maybeText) return maybeText;
  }

  return "";
}

function pickTitle(entry: any): string {
  return textOf(entry?.title);
}

function pickGuid(entry: any): string {
  // RSS: <guid>...</guid> ; Atom: <id>...</id>
  return textOf(entry?.guid) || textOf(entry?.id);
}

function pickPublished(entry: any): string | null {
  // RSS: pubDate ; Atom: published/updated
  return (
    parseDate(entry?.pubDate) ||
    parseDate(entry?.published) ||
    parseDate(entry?.updated) ||
    null
  );
}

function pickSummary(entry: any): string {
  // RSS: description ; Atom: summary/content (content may be object)
  const d = textOf(entry?.description);
  if (d) return d;

  const s = textOf(entry?.summary);
  if (s) return s;

  const c = textOf(entry?.content);
  if (c) return c;

  // Atom content sometimes: { "#text": "...", "@_type": "html" }
  if (entry?.content && typeof entry.content === "object") {
    const t = textOf((entry.content as any)["#text"]);
    if (t) return t;
  }

  return "";
}

/* -----------------------------
   Main
----------------------------- */
export async function rssFetch(source: SourceRow) {
  const res = await fetch(source.url, {
    headers: {
      "User-Agent": "radarpulse/1.0 (rss-ingestor)",
      "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
    },
  });

  if (!res.ok) {
    throw new Error(`RSS fetch failed: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();
  if (!xml?.trim()) throw new Error("RSS parse failed: empty xml");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    trimValues: true,
    // On laisse les entités/CDATA telles quelles (résolution simple)
    processEntities: true,
  });

  let parsed: any;
  try {
    parsed = parser.parse(xml);
  } catch (e) {
    throw new Error(`RSS parse failed: ${(e as any)?.message ?? String(e)}`);
  }

  // RSS 2.0: { rss: { channel: { item: [...] } } }
  const rssItems = arrify(parsed?.rss?.channel?.item);

  // Atom: { feed: { entry: [...] } }
  const atomEntries = arrify(parsed?.feed?.entry);

  // Fallbacks possibles (certains feeds non standard)
  const entries = rssItems.length ? rssItems : atomEntries;

  const out: OpportunityUpsertInput[] = [];

  for (const it of entries) {
    const title = pickTitle(it);
    const link = pickLink(it);
    if (!title || !link) continue;

    const guid = pickGuid(it);
    const published = pickPublished(it);
    const summary = pickSummary(it);

    const fingerprint = makeFingerprint(source.key, guid, title, link);

    out.push({
      source_id: source.id,
      external_id: guid || null,
      fingerprint,
      type: (source.meta?.["default_type"] as any) === "grant" ? "grant" : "tender",
      status: "active",
      is_public: true,
      country_code: source.country_code,
      buyer_name: safeStr(source.meta?.["default_buyer"] ?? ""),
      title,
      summary: summary ? summary.slice(0, 1200) : null,
      published_at: published,
      deadline_at: null,
      deadline_tz: source.meta?.["default_tz"] ? String(source.meta["default_tz"]) : null,
      source_url: link,
      language: source.meta?.["default_lang"] ? String(source.meta["default_lang"]) : null,
      raw: {
        source_key: source.key,
        // utile pour debug: garder un min de matière
        feed_kind: rssItems.length ? "rss" : atomEntries.length ? "atom" : "unknown",
      },
    });
  }

  return { opportunities: out, fetched_at: new Date().toISOString() };
}

// supabase/functions/_shared/rp_ai_utils.ts
// Small deterministic utilities: canonical URL, hashing, safe extraction.

export function normalizeText(v: string): string {
  return String(v || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function canonicalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    // strip common tracking params
    const drop = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "mc_cid",
      "mc_eid",
    ]);
    [...u.searchParams.keys()].forEach((k) => {
      if (drop.has(k.toLowerCase())) u.searchParams.delete(k);
    });
    // normalize: remove trailing slash (except root)
    u.hash = "";
    const s = u.toString();
    return s.endsWith("/") && u.pathname !== "/" ? s.slice(0, -1) : s;
  } catch {
    return String(raw || "").trim();
  }
}

export async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const bytes = new Uint8Array(buf);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Extract the text payload from an OpenAI Responses API JSON response
 * without relying on SDK helpers.
 */
export function extractResponseText(respJson: any): string {
  // Prefer output_text if present
  if (typeof respJson?.output_text === "string" && respJson.output_text.trim()) {
    return respJson.output_text;
  }

  const out = respJson?.output;
  if (Array.isArray(out)) {
    for (const item of out) {
      if (item?.type === "message" && Array.isArray(item?.content)) {
        for (const c of item.content) {
          if (c?.type === "output_text" && typeof c?.text === "string" && c.text.trim()) {
            return c.text;
          }
          // defensive: some formats may expose json directly
          if (c?.type === "output_json" && c?.json) {
            return JSON.stringify(c.json);
          }
        }
      }
    }
  }

  throw new Error("OpenAI response missing output_text/message.content");
}

export function extractJsonObject(raw: unknown): Record<string, unknown> {
  const content = normalizeContent(raw).trim();
  if (!content) {
    throw new Error("AI_EMPTY_RESPONSE");
  }

  const direct = tryParseObject(content);
  if (direct) return direct;

  const withoutFences = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const fenced = tryParseObject(withoutFences);
  if (fenced) return fenced;

  const firstBrace = withoutFences.indexOf("{");
  const lastBrace = withoutFences.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const sliced = withoutFences.slice(firstBrace, lastBrace + 1);
    const slicedParsed = tryParseObject(sliced);
    if (slicedParsed) return slicedParsed;
  }

  throw new Error("AI_INVALID_JSON");
}

function normalizeContent(raw: unknown): string {
  if (typeof raw === "string") return raw;

  if (Array.isArray(raw)) {
    return raw
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("\n");
  }

  return "";
}

function tryParseObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

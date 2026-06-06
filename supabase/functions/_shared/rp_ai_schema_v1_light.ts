// supabase/functions/_shared/rp_ai_schema_v1_light.ts
// RadarPulse — Structured Outputs schema (V1.light)
//
// Uses OpenAI Responses API "text.format" with JSON Schema strict mode.
// Docs: Structured Outputs guide. :contentReference[oaicite:0]{index=0}

export const RP_AI_SCHEMA_NAME_V1_LIGHT = "radarpulse_extraction_v1_light";

export const RP_SECTORS = [
  "construction",
  "engineering",
  "energy",
  "renewables",
  "water_sanitation",
  "health",
  "education",
  "it_digital",
  "telecom",
  "transport_logistics",
  "agriculture_food",
  "environment_climate",
  "security",
  "finance",
  "consulting",
  "research_innovation",
  "humanitarian",
  "governance",
  "manufacturing",
  "other",
] as const;

export type RpSector = (typeof RP_SECTORS)[number];

export const RP_AI_SCHEMA_V1_LIGHT: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
 required: [
  "content_type",
  "buyer_type",
  "buyer_name",
  "sector",
  "geo",
  "language",
  "deadline",
  "summary_10s",
  "fingerprint",
  "risks",
  "evidence",
  "quality",
],


  properties: {
    content_type: {
      type: "string",
      enum: ["tender", "grant", "news", "other"],
    },
    buyer_type: {
      type: "string",
      enum: ["un", "ifi", "gov", "private", "foundation", "ngo", "unknown"],
    },
    buyer_name: { type: ["string", "null"], maxLength: 200 },

    sector: { type: ["string", "null"], enum: [...RP_SECTORS, null] },

    geo: {
      type: "object",
      additionalProperties: false,
      required: ["country_code", "region", "locality"],
      properties: {
        country_code: { type: ["string", "null"], minLength: 2, maxLength: 2 },
        region: { type: ["string", "null"], maxLength: 80 },
        locality: { type: ["string", "null"], maxLength: 120 },
      },
    },

    language: { type: "string", maxLength: 12 },

    deadline: {
      type: "object",
      additionalProperties: false,
      required: ["deadline_at", "timezone", "confidence"],
      properties: {
        deadline_at: { type: ["string", "null"], maxLength: 40 }, // ISO datetime if known
        timezone: { type: ["string", "null"], maxLength: 64 }, // IANA when possible
        confidence: { type: "string", enum: ["exact", "approx", "unknown"] },
      },
    },

    summary_10s: {
      type: "string",
      maxLength: 600,
      description: "Canon: Quoi / Qui / Deadline / Docs / Risque",
    },

    fingerprint: { type: "string", maxLength: 200 },

    risks: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["code", "severity", "note"],
        properties: {
          code: {
            type: "string",
            enum: [
              "deadline_short",
              "missing_docs",
              "unclear_scope",
              "eligibility_unclear",
              "submission_unclear",
              "language_barrier",
              "duplicate_suspected",
              "low_info",
              "other",
            ],
          },
          severity: { type: "string", enum: ["low", "med", "high"] },
          note: { type: "string", maxLength: 200 },
        },
      },
    },

    evidence: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "quote", "confidence", "source", "locator"],
        properties: {
          field: { type: "string", maxLength: 120 },
          quote: { type: "string", maxLength: 320 },
          confidence: { type: "string", enum: ["high", "med", "low"] },
          source: { type: "string", enum: ["content_raw", "metadata", "attachment"] },
         locator: {
  type: "object",
  additionalProperties: false,
  required: ["url", "page", "section", "selector", "line", "char_start", "char_end", "note"],
  properties: {
    url: { type: ["string", "null"], maxLength: 600 },
    page: { type: ["integer", "null"], minimum: 0 },
    section: { type: ["string", "null"], maxLength: 160 },
    selector: { type: ["string", "null"], maxLength: 260 },
    line: { type: ["integer", "null"], minimum: 0 },
    char_start: { type: ["integer", "null"], minimum: 0 },
    char_end: { type: ["integer", "null"], minimum: 0 },
    note: { type: ["string", "null"], maxLength: 220 },
  },
},
        },
      },
    },

    quality: {
      type: "object",
      additionalProperties: false,
      required: ["extraction_quality", "needs_review", "missing_fields", "richness_score", "is_opportunity"],
      properties: {
        extraction_quality: { type: "string", enum: ["high", "med", "low"] },
        needs_review: { type: "boolean" },
        missing_fields: {
          type: "array",
          items: { type: "string", maxLength: 64 },
          maxItems: 20,
        },
        richness_score: { type: "number", minimum: 0, maximum: 1 },
        is_opportunity: { type: "boolean" },
      },
    },
  },
};

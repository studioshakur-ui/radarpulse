export type SourceKind = "rss" | "api" | "html" | "pdf";

export type OpportunityType = "tender" | "grant";
export type OpportunityStatus = "active" | "expired" | "archived";

export type EventType =
  | "NEW"
  | "UPDATED"
  | "DEADLINE_CHANGED"
  | "NEW_DOC"
  | "AWARDED"
  | "EXPIRED";

export type NotifyChannel = "email" | "telegram" | "whatsapp";

export type SourceRow = {
  id: string;
  key: string;
  name: string;
  kind: SourceKind;
  url: string;
  country_code: string | null;
  is_active: boolean;
  schedule_minutes: number;
  last_run_at: string | null;
  meta: Record<string, unknown>;
};

export type IngestionJobRow = {
  id: number;
  source_id: string;
  status: "queued" | "running" | "success" | "error";
  attempts: number;
  run_at: string;
  payload: Record<string, unknown>;
};

export type OpportunityUpsertInput = {
  source_id: string;
  external_id?: string | null;
  fingerprint: string;
  type: OpportunityType;
  status?: OpportunityStatus;
  is_public?: boolean;
  country_code?: string | null;
  buyer_name?: string | null;
  title: string;
  summary?: string | null;
  published_at?: string | null;
  deadline_at?: string | null;
  deadline_tz?: string | null;
  source_url: string;
  language?: string | null;
  raw?: Record<string, unknown>;
};

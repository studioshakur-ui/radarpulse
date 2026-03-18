export type Uuid = string;

export type OpportunityType = string; // enum côté DB
export type OpportunityStatus = string; // enum côté DB
export type OpportunityEventType = string; // enum côté DB
export type IngestionJobStatus = string; // enum côté DB
export type SourceKind = string; // enum côté DB

export type BuyerRow = {
  id: Uuid;
  country_code: string | null;
  name: string;
  normalized_name: string;
  created_at: string;
};

export type SourceRow = {
  id: Uuid;
  key: string;
  name: string;
  kind: SourceKind;
  url: string;
  country_code: string | null;
  is_active: boolean;
  schedule_minutes: number;
  last_run_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  meta: any;
  created_at: string;
  updated_at: string;
};

export type OpportunityRow = {
  id: Uuid;
  source_id: Uuid;
  external_id: string | null;
  fingerprint: string;
  type: OpportunityType;
  status: OpportunityStatus;
  is_public: boolean;
  country_code: string | null;
  buyer_id: Uuid | null;
  buyer_name: string | null;
  title: string;
  summary: string | null;
  published_at: string | null;
  deadline_at: string | null;
  deadline_tz: string | null;
  source_url: string;
  language: string | null;
  raw: any;
  created_at: string;
  updated_at: string;
};

export type OpportunityEventRow = {
  id: Uuid;
  opportunity_id: Uuid;
  type: OpportunityEventType;
  occurred_at: string;
  data: any;
};

export type OpportunityDocumentRow = {
  id: Uuid;
  opportunity_id: Uuid;
  doc_title: string | null;
  doc_url: string;
  doc_hash: string | null;
  doc_type: string | null;
  storage_path: string | null;
  created_at: string;
};

export type IngestionJobRow = {
  id: number;
  source_id: Uuid;
  status: IngestionJobStatus;
  attempts: number;
  run_at: string;
  started_at: string | null;
  finished_at: string | null;
  payload: any;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type Decision = "GO" | "NO_GO" | "HOLD";

export type WorkflowStatus =
  | "NEW"
  | "REVIEWED"
  | "GO"
  | "PREPARATION"
  | "READY"
  | "SUBMITTED"
  | "EXPIRED";

export type DecisionRecord = {
  opportunityId: Uuid;
  decision: Decision;
  reason?: string | null;
  decidedAt: string; // ISO
};

export type WorkspaceRecord = {
  id: string; // local id
  opportunityId: Uuid;
  createdAt: string;
};

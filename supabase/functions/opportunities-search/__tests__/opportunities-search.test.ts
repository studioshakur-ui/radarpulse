import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createHandler, type OpportunitiesSearchDeps } from "../index.ts";

type AnyObj = Record<string, unknown>;
type Cursor = { published_at: string; id: string };
type CapturedQuery = { country_code?: string; cursor?: Cursor; [k: string]: unknown };

function requireCaptured(value: CapturedQuery | null): CapturedQuery {
  assert(value !== null);
  return value;
}

function makeReq(body: AnyObj = {}, authHeader?: string): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (authHeader !== undefined) headers.set("Authorization", authHeader);
  return new Request("http://local/functions/v1/opportunities-search", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function makeDeps(overrides: Partial<OpportunitiesSearchDeps> = {}): OpportunitiesSearchDeps {
  return {
    verifyBearer: async (authHeader: string | null) => {
      if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
        return { user: null, error: "unauthorized" as const };
      }
      if (authHeader.includes("invalid")) return { user: null, error: "unauthorized" as const };
      return { user: { id: "user-1" }, error: null };
    },
    listSubscriptions: async () => [{ is_active: true }],
    searchOpportunities: async () => [],
    getEnv: () => undefined,
    now: () => new Date("2026-03-01T00:00:00.000Z"),
    ...overrides,
  };
}

async function readJson(res: Response): Promise<AnyObj> {
  return (await res.json()) as AnyObj;
}

Deno.test("401 when Authorization missing", async () => {
  const handler = createHandler(makeDeps());
  const res = await handler(makeReq({ q: "x" }));
  const body = await readJson(res);
  assertEquals(res.status, 401);
  assertEquals(body.ok, false);
  assertEquals(body.error, "UNAUTHORIZED");
});

Deno.test("401 when Authorization is not Bearer", async () => {
  const handler = createHandler(makeDeps());
  const res = await handler(makeReq({}, "Basic abc"));
  const body = await readJson(res);
  assertEquals(res.status, 401);
  assertEquals(body.ok, false);
  assertEquals(body.error, "UNAUTHORIZED");
});

Deno.test("401 when token invalid", async () => {
  const handler = createHandler(makeDeps());
  const res = await handler(makeReq({}, "Bearer invalid-token"));
  const body = await readJson(res);
  assertEquals(res.status, 401);
  assertEquals(body.ok, false);
  assertEquals(body.error, "UNAUTHORIZED");
});

Deno.test("402 when subscription inactive", async () => {
  const handler = createHandler(
    makeDeps({
      listSubscriptions: async () => [{ is_active: false }],
    }),
  );
  const res = await handler(makeReq({}, "Bearer ok"));
  const body = await readJson(res);
  assertEquals(res.status, 402);
  assertEquals(body.ok, false);
  assertEquals(body.error, "SUBSCRIPTION_REQUIRED");
});

Deno.test("200 success enforces country_code IT regardless of input", async () => {
  let captured: CapturedQuery | null = null;
  const handler = createHandler(
    makeDeps({
      searchOpportunities: async (input) => {
        captured = input as unknown as CapturedQuery;
        return [];
      },
    }),
  );

  const res = await handler(makeReq({ country_code: "EU", q: "train" }, "Bearer ok"));
  const body = await readJson(res);
  const capturedQuery = requireCaptured(captured);

  assertEquals(res.status, 200);
  assertEquals(body.ok, true);
  assertEquals(capturedQuery.country_code, "IT");
});

Deno.test("200 success returns nextCursor only when items length equals limit", async () => {
  const handlerA = createHandler(
    makeDeps({
      searchOpportunities: async () => [
        {
          id: "a",
          title: "A",
          buyer_name: null,
          region: null,
          budget_amount: null,
          budget_currency: null,
          deadline_at: null,
          published_at: "2026-02-10T00:00:00.000Z",
          source_key: "it_anac_ocds",
          status: "active",
          is_public: true,
          country_code: "IT",
          quality_score: null,
          completeness_score: null,
          origin_type: "IT_NATIVE",
        },
      ],
    }),
  );
  const resA = await handlerA(makeReq({ limit: 1 }, "Bearer ok"));
  const bodyA = await readJson(resA);
  assertEquals(resA.status, 200);
  assertEquals(bodyA.ok, true);
  assertEquals((bodyA.nextCursor as AnyObj).id, "a");

  const handlerB = createHandler(
    makeDeps({
      searchOpportunities: async () => [],
    }),
  );
  const resB = await handlerB(makeReq({ limit: 2 }, "Bearer ok"));
  const bodyB = await readJson(resB);
  assertEquals(resB.status, 200);
  assertEquals(bodyB.ok, true);
  assertEquals(bodyB.nextCursor, null);
});

Deno.test("200 success passes cursor predicate input to query layer", async () => {
  let captured: CapturedQuery | null = null;
  const handler = createHandler(
    makeDeps({
      searchOpportunities: async (input) => {
        captured = input as unknown as CapturedQuery;
        return [];
      },
    }),
  );

  const cursor = { published_at: "2026-02-20T10:00:00.000Z", id: "00000000-0000-0000-0000-000000000001" };
  const res = await handler(makeReq({ cursor, limit: 10 }, "Bearer ok"));
  const body = await readJson(res);
  const capturedQuery = requireCaptured(captured);

  assertEquals(res.status, 200);
  assertEquals(body.ok, true);
  assert(capturedQuery.cursor);
  assertEquals(capturedQuery.cursor.published_at, cursor.published_at);
  assertEquals(capturedQuery.cursor.id, cursor.id);
});

Deno.test("400 for invalid limit", async () => {
  const handler = createHandler(makeDeps());
  const resA = await handler(makeReq({ limit: 0 }, "Bearer ok"));
  const bodyA = await readJson(resA);
  assertEquals(resA.status, 400);
  assertEquals(bodyA.error, "INVALID_LIMIT");

  const resB = await handler(makeReq({ limit: 101 }, "Bearer ok"));
  const bodyB = await readJson(resB);
  assertEquals(resB.status, 400);
  assertEquals(bodyB.error, "INVALID_LIMIT");
});

Deno.test("400 for invalid cursor shape", async () => {
  const handler = createHandler(makeDeps());
  const res = await handler(
    makeReq({ cursor: { published_at: "2026-02-20T10:00:00.000Z" } }, "Bearer ok"),
  );
  const body = await readJson(res);
  assertEquals(res.status, 400);
  assertEquals(body.error, "INVALID_CURSOR");
});

Deno.test("500 when db query throws and error is sanitized", async () => {
  const handler = createHandler(
    makeDeps({
      searchOpportunities: async () => {
        throw new Error("db exploded");
      },
    }),
  );
  const res = await handler(makeReq({ q: "x" }, "Bearer ok"));
  const body = await readJson(res);
  assertEquals(res.status, 500);
  assertEquals(body.ok, false);
  assertEquals(body.error, "INTERNAL_ERROR");
  assertEquals(body.message, "Unexpected server error");
  assert(!("details" in body));
});

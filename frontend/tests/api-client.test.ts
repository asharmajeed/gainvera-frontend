import test from "node:test";
import assert from "node:assert/strict";
import {
  ApiClientError,
  createDevelopmentFixtureSource,
  createGainveraHttpClient,
  createHttpClient,
  FixtureDataError,
} from "../src/lib/api";
import type { GainveraReadSource } from "../src/lib/api";

const baseUrl = "http://127.0.0.1:8000";
const requestId = "ce5d45af-fd7d-47ed-af84-d410385ebc31";
const syntheticToken = "synthetic-test-access-token";
function json(body: unknown, status = 200, id = requestId) {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json", "X-Request-ID": id },
  });
}
function stub(handler: (url: string, init: RequestInit) => Response | Promise<Response>): typeof fetch {
  return async (input, init) => handler(String(input), init ?? {});
}
function errorEnvelope(code: string, retryable = false) {
  return { error: { code, message: "Safe server message.", request_id: requestId, details: [], retryable } };
}
function clientFailure(kind: ApiClientError["kind"], code: string) {
  return (error: unknown) => {
    assert.ok(error instanceof ApiClientError);
    assert.equal(error.kind, kind);
    assert.equal(error.code, code);
    return true;
  };
}

test("HTTP configuration confines credentials to its API base and rejects redirects", async () => {
  for (const invalid of ["file:///tmp", "https://user:password@example.com", `${baseUrl}?token=x`, `${baseUrl}#fragment`])
    assert.throws(() => createHttpClient({ baseUrl: invalid }), ApiClientError);
  let calls = 0;
  const http = createHttpClient({ baseUrl: `${baseUrl}/api`, getAccessToken: () => syntheticToken, fetch: stub(() => { calls++; return json({}); }) });
  for (const path of ["https://example.com", "//example.com", "/../outside", "/%2e%2e/outside", "/\\outside", "/health#fragment"])
    await assert.rejects(http.requestJson(path), clientFailure("input", "invalid_path"));
  assert.equal(calls, 0);
});

test("business requests obtain a fresh token, send correlation headers and whitelist create bodies", async () => {
  let tokens = 0;
  const fixture = createDevelopmentFixtureSource({ mode: "development_fixture" }).getSnapshot();
  const calls: { url: string; init: RequestInit }[] = [];
  const api = createGainveraHttpClient({
    baseUrl: `${baseUrl}/`, getAccessToken: () => `${syntheticToken}-${++tokens}`,
    fetch: stub((url, init) => { calls.push({ url, init }); return json(fixture.workflows[0], 201); }),
  });
  const first = await api.createWorkflow(fixture.workflows[0], { requestId: requestId.toUpperCase() });
  await api.getWorkflow(fixture.workflows[0].id);
  assert.equal(tokens, 2);
  assert.equal(first.requestId, requestId);
  assert.equal(first.status, 201);
  assert.deepEqual(first.body, fixture.workflows[0]);
  const headers = new Headers(calls[0].init.headers);
  assert.equal(headers.get("Authorization"), `Bearer ${syntheticToken}-1`);
  assert.equal(new Headers(calls[1].init.headers).get("Authorization"), `Bearer ${syntheticToken}-2`);
  assert.equal(headers.get("X-Request-ID"), requestId);
  assert.equal(headers.get("Content-Type"), "application/json");
  assert.equal(calls[0].url, `${baseUrl}/workflows`);
  assert.equal(calls[0].init.credentials, "omit");
  assert.equal(calls[0].init.redirect, "error");
  assert.equal(calls[0].init.cache, "no-store");
  const body = JSON.parse(calls[0].init.body as string);
  for (const field of ["id", "owner_id", "created_at", "updated_at", "baseline_version", "analysis_status"])
    assert.equal(field in body, false);
});

test("public health skips token lookup and does not claim dependency readiness", async () => {
  const health = { status: "ok", service: "gainvera-api", version: "test", dependencies: {
    database: { status: "not_implemented", checked: false }, authentication: { status: "not_implemented", checked: false },
    ml: { status: "not_implemented", checked: false }, ai: { status: "not_implemented", checked: false },
  } };
  const api = createGainveraHttpClient({ baseUrl, getAccessToken: () => { throw Error("must not request a token"); }, fetch: stub((url, init) => {
    assert.equal(url, `${baseUrl}/health`);
    assert.equal(new Headers(init.headers).has("Authorization"), false);
    return json(health);
  }) });
  assert.deepEqual((await api.getHealth()).body, health);
});

test("missing tokens and failing token suppliers stop before HTTP and suppress raw exception text", async () => {
  let calls = 0;
  for (const getAccessToken of [undefined, () => null, () => ""])
    await assert.rejects(createGainveraHttpClient({ baseUrl, getAccessToken, fetch: stub(() => { calls++; return json({}); }) }).getWorkflow("id"), clientFailure("auth", "unauthenticated"));
  for (const getAccessToken of [() => { throw Error(syntheticToken); }, () => "invalid\r\ntoken", () => "invalid-\u{1f600}-token"])
    await assert.rejects(createGainveraHttpClient({ baseUrl, getAccessToken }).getWorkflow("id"), (error: unknown) => {
      assert.ok(error instanceof ApiClientError);
      assert.equal(error.code, "token_unavailable");
      assert.equal(String(error).includes(syntheticToken), false);
      assert.equal("cause" in error, false);
      return true;
    });
  assert.equal(calls, 0);
});

test("validation errors retain status, stable codes, field details, retryability and request IDs", async () => {
  const envelope = errorEnvelope("validation_error");
  const details = [{ field: "body.hours_per_occurrence", code: "greater_than_equal", message: "The number is below the allowed minimum." }];
  const http = createHttpClient({ baseUrl, fetch: stub(() => json({ error: { ...envelope.error, details } }, 422)) });
  await assert.rejects(http.requestJson("/health", { auth: "none" }), (error: unknown) => {
    assert.ok(error instanceof ApiClientError);
    assert.equal(error.status, 422);
    assert.equal(error.code, "validation_error");
    assert.equal(error.requestId, requestId);
    assert.equal(error.bodyRequestId, requestId);
    assert.deepEqual(error.details, details);
    assert.equal(error.retryable, false);
    return true;
  });
});

test("planned routes remain real HTTP errors; status/retry metadata never triggers fixture fallback", async () => {
  const cases = [[401, "unauthenticated"], [403, "forbidden"], [404, "not_found"], [409, "conflict"], [429, "rate_limited"], [503, "dependency_unavailable"]] as const;
  let calls = 0;
  for (const [status, code] of cases) {
    const retryable = status === 429 || status === 503;
    const api = createGainveraHttpClient({ baseUrl, getAccessToken: () => syntheticToken, fetch: stub(() => { calls++; return json(errorEnvelope(code, retryable), status); }) });
    await assert.rejects(api.getWorkflow("missing"), (error: unknown) => {
      assert.ok(error instanceof ApiClientError);
      assert.equal(error.kind, "http");
      assert.equal(error.status, status);
      assert.equal(error.code, code);
      assert.equal(error.retryable, retryable);
      return true;
    });
  }
  assert.equal(calls, cases.length, "no automatic retries");
});

test("malformed HTTP errors use safe messages and preserve available correlation metadata", async () => {
  const raw = `<html>internal details ${syntheticToken}</html>`;
  const http = createHttpClient({ baseUrl, fetch: stub(() => new Response(raw, { status: 503, headers: { "X-Request-ID": requestId } })) });
  await assert.rejects(http.requestJson("/health", { auth: "none" }), (error: unknown) => {
    assert.ok(error instanceof ApiClientError);
    assert.equal(error.status, 503);
    assert.equal(error.requestId, requestId);
    assert.equal(error.retryable, true);
    assert.equal(String(error).includes(raw), false);
    assert.deepEqual(error.details, []);
    return true;
  });
  const noHeader = createHttpClient({ baseUrl, fetch: stub(() => {
    const response = json(errorEnvelope("not_found"), 404);
    response.headers.delete("X-Request-ID");
    return response;
  }) });
  await assert.rejects(noHeader.requestJson("/health", { auth: "none" }), (error: unknown) => error instanceof ApiClientError && error.requestId === requestId);
});

test("empty, invalid and non-object JSON successes are protocol errors rather than empty records", async () => {
  for (const response of [new Response(null, { status: 204 }), json(null), json([]), new Response(""), new Response("{broken", { headers: { "Content-Type": "application/json" } }), new Response("<html>oops</html>")]) {
    const http = createHttpClient({ baseUrl, fetch: stub(() => response) });
    await assert.rejects(http.requestJson("/health", { auth: "none" }), clientFailure("protocol", "invalid_json_response"));
  }
});

test("delete accepts an empty 204 and rejects success-shaped bodies", async () => {
  const api = createGainveraHttpClient({ baseUrl, getAccessToken: () => syntheticToken, fetch: stub((_url, init) => {
    assert.equal(init.method, "DELETE");
    return new Response(null, { status: 204, headers: { "X-Request-ID": requestId } });
  }) });
  assert.deepEqual(await api.deleteWorkflow("id"), { body: undefined, status: 204, requestId });
  const wrong = createGainveraHttpClient({ baseUrl, getAccessToken: () => syntheticToken, fetch: stub(() => json({ deleted: true })) });
  await assert.rejects(wrong.deleteWorkflow("id"), clientFailure("protocol", "invalid_empty_response"));
});

test("network/read failures and cancellation stay distinct and never expose raw errors", async () => {
  const network = createHttpClient({ baseUrl, fetch: async () => { throw new Error(syntheticToken); } });
  await assert.rejects(network.requestJson("/health", { auth: "none" }), (error: unknown) => error instanceof ApiClientError && error.kind === "network" && error.retryable && !String(error).includes(syntheticToken));
  const read = createHttpClient({ baseUrl, fetch: stub(() => new Response(new ReadableStream({ start(controller) { controller.error(new Error(syntheticToken)); } }), { headers: { "X-Request-ID": requestId } })) });
  await assert.rejects(read.requestJson("/health", { auth: "none" }), (error: unknown) => error instanceof ApiClientError && error.code === "response_read_failed" && error.requestId === requestId && !String(error).includes(syntheticToken));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(network.requestJson("/health", { auth: "none", signal: controller.signal }), clientFailure("aborted", "request_aborted"));
});

test("invalid request IDs and nonfinite JSON are rejected before HTTP", async () => {
  let calls = 0;
  const http = createHttpClient({ baseUrl, fetch: stub(() => { calls++; return json({}); }) });
  await assert.rejects(http.requestJson("/health", { auth: "none", requestId: "personal-data" }), clientFailure("input", "invalid_request_id"));
  await assert.rejects(http.requestJson("/health", { auth: "none", method: "POST", body: { hours: NaN } }), clientFailure("input", "invalid_json_body"));
  assert.equal(calls, 0);
});

test("network failures retain the sent correlation ID and token lookup cancellation sends nothing", async () => {
  const http = createHttpClient({ baseUrl, fetch: async () => { throw Error("network failed"); } });
  await assert.rejects(http.requestJson("/health", { auth: "none", requestId }), (error: unknown) =>
    error instanceof ApiClientError && error.kind === "network" && error.requestId === requestId);
  const controller = new AbortController();
  let calls = 0;
  const api = createGainveraHttpClient({
    baseUrl,
    getAccessToken: async () => { controller.abort(); return syntheticToken; },
    fetch: stub(() => { calls++; return json({}); }),
  });
  await assert.rejects(api.getWorkflow("id", { signal: controller.signal }), clientFailure("aborted", "request_aborted"));
  assert.equal(calls, 0);
});

test("development fixtures require explicit mode, are labelled and clone isolated snapshots", async () => {
  // @ts-expect-error Callers must explicitly choose fixture mode.
  assert.throws(() => createDevelopmentFixtureSource(), /explicit/);
  const fixture = createDevelopmentFixtureSource({ mode: "development_fixture" });
  const reader: GainveraReadSource = fixture;
  assert.equal(reader.mode, "development_fixture");
  assert.match(reader.label, /fictional/);
  const snapshot = fixture.getSnapshot();
  assert.equal(snapshot.measurements.length, 0, "no invented outcomes");
  assert.equal(snapshot.scenarios.length, 0, "no invented reductions");
  const result = await reader.getWorkflow(snapshot.workflows[0].id);
  assert.equal(result.status, null);
  assert.equal(result.requestId, null);
  result.body.name = "consumer mutation";
  snapshot.workflows[0].name = "snapshot mutation";
  assert.notEqual((await reader.getWorkflow(snapshot.workflows[0].id)).body.name, "consumer mutation");
  assert.notEqual(fixture.getSnapshot().workflows[0].name, "snapshot mutation");
  const second = createDevelopmentFixtureSource({ mode: "development_fixture" });
  assert.notEqual(second.getSnapshot().workflows[0].name, "consumer mutation");
});

test("fixture absence is explicit; unavailable analysis has null confidence/provenance", async () => {
  const fixture = createDevelopmentFixtureSource({ mode: "development_fixture" });
  const snapshot = fixture.getSnapshot();
  await assert.rejects(fixture.getWorkflow("unknown"), (error: unknown) => error instanceof FixtureDataError && error.code === "fixture_not_found");
  await assert.rejects(fixture.getAnalysis(snapshot.workflows[0].id), (error: unknown) => error instanceof FixtureDataError && error.code === "fixture_analysis_absent");
  const analysis = (await fixture.getAnalysis(snapshot.workflows[1].id)).body;
  assert.equal(analysis.ml_status, "unavailable");
  assert.equal(analysis.ml_confidence, null);
  assert.equal(analysis.model_version, null);
  assert.equal(analysis.task_family, null);
  assert.equal(analysis.provider_model, null);
});

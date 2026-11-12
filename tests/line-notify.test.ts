import assert from "node:assert/strict";
import test from "node:test";

test("a failed notification group does not block failure alerts to the test group", async () => {
  process.env.SKIP_ENV_VALIDATION = "true";
  process.env.LINE_NOTIFY_ENDPOINT = "https://example.invalid/notify";
  process.env.LINE_NOTIFY_RENT_IPT_STAFF_CLIENT_KEY = "staff";
  process.env.LINE_NOTIFY_RENT_IPT_STAFF_SECRET_KEY = "staff-secret";
  process.env.LINE_NOTIFY_TEST_CLIENT_KEY = "test";
  process.env.LINE_NOTIFY_TEST_SECRET_KEY = "test-secret";
  const { LineNotifyService } = await import("../src/services/line-notify.service");
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (_input, init) => {
    const key = (init?.headers as Record<string, string>)["client-key"]!;
    calls.push(key);
    return new Response(null, { status: key === "test" ? 200 : 503 });
  };
  try {
    for (let i = 0; i < 5; i++) {
      assert.equal(await LineNotifyService.sendToRentIptStaff("report", 1), false);
    }
    assert.equal(await LineNotifyService.sendToRentIptStaff("report", 1), false);
    assert.equal(await LineNotifyService.sendToTest("alert", 1), true);
    assert.deepEqual(calls, ["staff", "staff", "staff", "staff", "staff", "test"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

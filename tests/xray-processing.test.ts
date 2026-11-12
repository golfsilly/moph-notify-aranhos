import assert from "node:assert/strict";
import test from "node:test";
import { processXrayCases } from "../src/services/xray-portable/process-xray-cases";
import type { XrayCase } from "../src/types/xray-portable.type";

function xray(key: string): XrayCase {
  return {
    notify_key: key, xn: 1, vn: "v", hn: "h", order_date: "2026-11-06",
    order_date_time: "2026-11-06 12:00:00", age: 1, department_name: "ward",
    xray_list: "portable", bedno: null, an: null, patient_name: null,
  };
}

test("failed cases retry, successful cases are recorded once, then checkpoint advances", async () => {
  const sentKeys = new Set<string>();
  const attempts: string[] = [];
  const checkpoints: Date[] = [];
  let firstRun = true;
  const dependencies = {
    findExisting: async (keys: string[]) => keys.filter((key) => sentKeys.has(key)),
    send: async (item: XrayCase) => {
      attempts.push(item.notify_key);
      return !(firstRun && item.notify_key === "failed");
    },
    recordSent: async (item: XrayCase) => { sentKeys.add(item.notify_key); },
    saveCheckpoint: async (date: Date) => { checkpoints.push(date); },
  };
  const cases = [xray("sent"), xray("sent"), xray("failed")];
  const first = await processXrayCases(cases, new Date("2026-11-06T00:00:00Z"), dependencies);
  assert.equal(first.notificationsSent, 1);
  assert.equal(first.failedNotifications, 1);
  assert.deepEqual([...sentKeys], ["sent"]);
  assert.equal(checkpoints.length, 0);

  firstRun = false;
  const nextCheckpoint = new Date("2026-11-06T00:01:00Z");
  const second = await processXrayCases(cases, nextCheckpoint, dependencies);
  assert.equal(second.notificationsSent, 1);
  assert.equal(second.failedNotifications, 0);
  assert.deepEqual(attempts, ["sent", "failed", "failed"]);
  assert.deepEqual(checkpoints, [nextCheckpoint]);
});

test("a log write failure stops processing and does not advance the checkpoint", async () => {
  let advanced = false;
  await assert.rejects(processXrayCases([xray("a"), xray("b")], new Date(), {
    findExisting: async () => [],
    send: async () => true,
    recordSent: async () => { throw new Error("database unavailable"); },
    saveCheckpoint: async () => { advanced = true; },
  }), /database unavailable/);
  assert.equal(advanced, false);
});

test("an empty successful query advances the checkpoint", async () => {
  let saved: Date | undefined;
  const start = new Date("2026-11-06T00:00:00Z");
  await processXrayCases([], start, {
    findExisting: async () => [],
    send: async () => { throw new Error("unexpected send"); },
    recordSent: async () => { throw new Error("unexpected write"); },
    saveCheckpoint: async (date) => { saved = date; },
  });
  assert.equal(saved, start);
});

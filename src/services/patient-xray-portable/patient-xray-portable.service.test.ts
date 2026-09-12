import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPatientXrayPortableMessage,
  formatPortableOrderDateTime,
  getXrayPortableRetryDelayMs,
} from "./patient-xray-portable.service";

test("formats a complete Chest Portable notification", () => {
  const message = buildPatientXrayPortableMessage({
    sourceXn: "600485338",
    patientName: "นายทดสอบ ระบบ",
    hn: "123456789",
    an: "987654321",
    wardName: "ICU ชั้น 3",
    itemName: "08Chest.[Portable]",
    requestDate: "2026-09-12",
    requestTime: "10:30:35",
  });

  assert.equal(
    message,
    [
      "🩻 แจ้ง X-ray Portable",
      "ชื่อ: นายทดสอบ ระบบ",
      "HN: 123456789",
      "AN: 987654321",
      "หอผู้ป่วย: ICU ชั้น 3",
      "รายการ: 08Chest.[Portable]",
      "เวลาสั่ง: 12 ก.ย. 2569 10:30 น.",
    ].join("\n"),
  );
});

test("uses safe fallbacks without dropping an incomplete order", () => {
  const message = buildPatientXrayPortableMessage({
    sourceXn: "1",
    patientName: null,
    hn: " ",
    an: null,
    wardName: null,
    itemName: "08Chest.[Portable]",
    requestDate: null,
    requestTime: null,
  });

  assert.match(message, /ชื่อ: ไม่ระบุ/);
  assert.match(message, /HN: ไม่ระบุ/);
  assert.match(message, /AN: ไม่ระบุ/);
  assert.match(message, /หอผู้ป่วย: ไม่ระบุ/);
  assert.match(message, /เวลาสั่ง: ไม่ระบุ/);
});

test("formats Thai Buddhist year without timezone conversion", () => {
  assert.equal(
    formatPortableOrderDateTime("2026-01-02", "03:04:59"),
    "2 ม.ค. 2569 03:04 น.",
  );
  assert.equal(formatPortableOrderDateTime("invalid", "03:04:59"), "ไม่ระบุ");
});

test("backs off exponentially and caps retries at 30 minutes", () => {
  assert.equal(getXrayPortableRetryDelayMs(1), 60_000);
  assert.equal(getXrayPortableRetryDelayMs(2), 120_000);
  assert.equal(getXrayPortableRetryDelayMs(5), 960_000);
  assert.equal(getXrayPortableRetryDelayMs(6), 1_800_000);
  assert.equal(getXrayPortableRetryDelayMs(100), 1_800_000);
});

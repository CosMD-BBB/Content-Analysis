import { expect, test } from "vitest";
import { addDaysKey, bangkokDayKey, formatThai, fromBangkokInput } from "@/src/lib/time";

test("19:00 Bangkok is 12:00 UTC", () => {
  expect(fromBangkokInput("2026-11-13", "19:00").toISOString()).toBe("2026-11-13T12:00:00.000Z");
});
test("00:30 Bangkok stays on its own day", () => {
  expect(bangkokDayKey(fromBangkokInput("2026-11-14", "00:30"))).toBe("2026-11-14");
});
test("thai format", () => {
  expect(formatThai(new Date("2026-11-13T12:00:00Z"), "datetime")).toBe("13 พ.ย. 2569 · 19:00 น.");
  expect(formatThai(new Date("2026-11-13T12:00:00Z"), "short")).toBe("13 พ.ย.");
});
test("invalid input throws", () => {
  expect(() => fromBangkokInput("13/11/2026", "19:00")).toThrow();
});
test("addDaysKey crosses months", () => {
  expect(addDaysKey("2026-11-30", 1)).toBe("2026-12-01");
});

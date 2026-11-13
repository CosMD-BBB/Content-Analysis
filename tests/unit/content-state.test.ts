import { expect, test } from "vitest";
import { nextStatus } from "@/src/content/state";
import { captionWarnings } from "@/src/content/validation";

test("lifecycle transitions by role", () => {
  expect(nextStatus("idea", "start", "creator", true)).toBe("draft");
  expect(nextStatus("draft", "submit", "creator", true)).toBe("review");
  expect(nextStatus("draft", "submit", "creator", false)).toBeNull();
  expect(nextStatus("changes", "submit", "creator", true)).toBe("review");
  expect(nextStatus("review", "approve", "creator", true)).toBeNull();
  expect(nextStatus("review", "approve", "manager", false)).toBe("approved");
  expect(nextStatus("review", "requestChanges", "manager", false)).toBe("changes");
  expect(nextStatus("review", "withdraw", "creator", true)).toBe("draft");
  expect(nextStatus("approved", "schedule", "manager", false)).toBe("scheduled");
  expect(nextStatus("approved", "schedule", "creator", true)).toBeNull();
  expect(nextStatus("scheduled", "unschedule", "admin", false)).toBe("approved");
  expect(nextStatus("draft", "publish", "admin", false)).toBeNull();
  expect(nextStatus("scheduled", "publish", "manager", false)).toBe("published");
  expect(nextStatus("published", "submit", "admin", false)).toBeNull();
  expect(nextStatus("draft", "submit", "analyst", true)).toBeNull();
});

test("caption warnings", () => {
  const long = "ก".repeat(281);
  expect(captionWarnings(long, {}, ["x", "facebook"])).toEqual(["X: เกิน 280 ตัวอักษร (281)"]);
  expect(captionWarnings(long, { x: "สั้น" }, ["x"])).toEqual([]);
  expect(captionWarnings(Array.from({ length: 31 }, (_, i) => `#t${i}`).join(" "), {}, ["instagram"])).toEqual(["Instagram: แฮชแท็กเกิน 30 อัน (31)"]);
});

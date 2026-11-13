import { expect, test } from "vitest";
import { checkUpload } from "@/src/media/service";

const MB = 1024 * 1024;
test("heic is rejected with Thai message", () => {
  expect(checkUpload("image/heic", 2 * MB)).toEqual({ ok: false, message: "รองรับเฉพาะรูป JPG, PNG, WebP และวิดีโอ MP4, MOV" });
});
test("size limits", () => {
  expect(checkUpload("image/jpeg", 21 * MB)).toEqual({ ok: false, message: "รูปต้องไม่เกิน 20 MB" });
  expect(checkUpload("video/mp4", 501 * MB)).toEqual({ ok: false, message: "วิดีโอต้องไม่เกิน 500 MB" });
  expect(checkUpload("IMAGE/PNG", 5 * MB)).toEqual({ ok: true, kind: "image" });
  expect(checkUpload("video/quicktime", 400 * MB)).toEqual({ ok: true, kind: "video" });
});

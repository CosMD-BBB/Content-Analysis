import { expect, test } from "vitest";
import { publishMode } from "@/src/channels/catalog";
import { previewFrame } from "@/src/content/preview";

test("preview frames", () => {
  for (const p of ["tiktok", "instagram", "facebook", "youtube"] as const) expect(previewFrame(p, "reel")).toEqual({ ratio: "9:16", layout: "vertical" });
  expect(previewFrame("instagram", "image")).toEqual({ ratio: "4:5", layout: "feed" });
  expect(previewFrame("instagram", "carousel")).toEqual({ ratio: "4:5", layout: "feed" });
  expect(previewFrame("facebook", "image")).toEqual({ ratio: "1:1", layout: "feed" });
  expect(previewFrame("x", "image")).toEqual({ ratio: "1:1", layout: "feed" });
  expect(previewFrame("youtube", "video")).toEqual({ ratio: "16:9", layout: "youtube" });
  expect(previewFrame("line", "video")).toEqual({ ratio: "1:1", layout: "line_card" });
  expect(previewFrame("web", "article")).toEqual({ ratio: "16:9", layout: "article" });
});

test("publish mode reasons in priority order", () => {
  const fb = { platform: "facebook" as const, status: "connected" as const };
  expect(publishMode(fb, "image", { manualOnly: true }).reason).toBe("งานประเภทนี้ต้องทำในระบบของแพลตฟอร์มเอง");
  expect(publishMode({ platform: "lemon8", status: "not_connected" }, "image", null)).toEqual({ mode: "manual", reason: "แพลตฟอร์มไม่มี API สำหรับโพสต์" });
  expect(publishMode({ platform: "facebook", status: "coming_soon" }, "image", null).reason).toBe("ยังไม่ได้เชื่อมต่อบัญชี");
  expect(publishMode({ platform: "youtube", status: "connected" }, "image", null).reason).toBe("API ไม่รองรับรูปแบบนี้");
  expect(publishMode(fb, "image", { manualOnly: false })).toEqual({ mode: "auto", reason: "โพสต์อัตโนมัติผ่าน API" });
});

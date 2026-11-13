import type { Format, Platform } from "../db/constants";

export type Frame = { ratio: "9:16" | "4:5" | "1:1" | "16:9"; layout: "vertical" | "feed" | "youtube" | "line_card" | "article" };

/** กรอบตัวอย่างโพสต์ตามแพลตฟอร์มและรูปแบบงาน */
export function previewFrame(platform: Platform, format: Format): Frame {
  if (platform === "line") return { ratio: "1:1", layout: "line_card" };
  if (format === "article") return { ratio: "16:9", layout: "article" };
  if (format === "reel" && ["tiktok", "instagram", "facebook", "youtube", "lemon8"].includes(platform)) return { ratio: "9:16", layout: "vertical" };
  if (platform === "tiktok") return { ratio: "9:16", layout: "vertical" };
  if (platform === "youtube") return { ratio: "16:9", layout: "youtube" };
  if (platform === "instagram" || platform === "lemon8") return { ratio: "4:5", layout: "feed" };
  if (format === "video") return { ratio: "16:9", layout: "feed" };
  if (platform === "web") return { ratio: "16:9", layout: "article" };
  return { ratio: "1:1", layout: "feed" };
}

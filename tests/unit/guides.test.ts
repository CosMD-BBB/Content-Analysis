import { expect, test } from "vitest";
import { CATALOG } from "@/src/channels/catalog";
import { GUIDES } from "@/src/channels/guides";
import { PLATFORMS } from "@/src/db/constants";

test("every platform has a complete guide", () => {
  for (const p of PLATFORMS) {
    const g = GUIDES[p];
    expect(g, p).toBeDefined();
    expect(g.steps, p).toHaveLength(5);
    expect(g.troubleshooting.length, p).toBeGreaterThanOrEqual(2);
    expect(g.settingsUrl.startsWith("https://"), p).toBe(true);
    if (g.availability === "coming_soon") {
      expect(g.prepare.length, p).toBeGreaterThanOrEqual(2);
      expect(g.waitingFor, p).toBeTruthy();
    }
  }
});

test("lemon8 is manual only and matches the catalog", () => {
  expect(GUIDES.lemon8.availability).toBe("manual_only");
  expect(CATALOG.lemon8.post).toBe("no");
});

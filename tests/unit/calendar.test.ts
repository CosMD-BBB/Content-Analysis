import { expect, test } from "vitest";
import { groupByDay, monthGrid, weekGrid } from "@/src/content/calendar";

test("month grid starts Monday and ends Sunday", () => {
  const g = monthGrid(2026, 10);
  expect(g[0]).toBe("2026-10-26");
  expect(g.at(-1)).toBe("2026-12-06");
  expect(g.length % 7).toBe(0);
});
test("week grid", () => {
  expect(weekGrid("2026-11-13")).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
});
test("00:30 Bangkok on the 14th groups into the 14th even though UTC is the 13th", () => {
  const g = groupByDay([{ scheduledAt: new Date("2026-11-13T17:30:00Z") }]);
  expect(Object.keys(g)).toEqual(["2026-11-14"]);
});

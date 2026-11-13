import { expect, test } from "vitest";
import { can, canEditContent } from "@/src/access/permissions";

test("permission matrix matches README", () => {
  const yes: Record<string, string[]> = {
    admin: ["create", "editAny", "assign", "approve", "publish", "manual", "metrics", "reports", "channels", "team"],
    manager: ["create", "editAny", "assign", "approve", "publish", "manual", "metrics", "reports"],
    creator: ["create", "manual", "reports"],
    analyst: ["metrics", "reports"],
  };
  const all = ["create", "editAny", "assign", "approve", "publish", "manual", "metrics", "reports", "channels", "team"] as const;
  for (const [role, list] of Object.entries(yes))
    for (const p of all) expect(can(role as never, p), `${role} ${p}`).toBe(list.includes(p));
});

test("content edit rules", () => {
  expect(canEditContent("creator", false, "draft")).toBe(false);
  expect(canEditContent("creator", true, "draft")).toBe(true);
  expect(canEditContent("creator", true, "changes")).toBe(true);
  expect(canEditContent("creator", true, "review")).toBe(false);
  expect(canEditContent("manager", false, "approved")).toBe(true);
  expect(canEditContent("manager", false, "published")).toBe(false);
  expect(canEditContent("analyst", true, "draft")).toBe(false);
});

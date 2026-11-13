"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/src/db/client";
import { enterMetrics, METRIC_KEYS } from "@/src/reports/aggregate";
import { act, type ActionResult } from "@/src/server/act";

export async function metricsAction(_: ActionResult, f: FormData): Promise<ActionResult> {
  return act(async (u) => {
    const vals = Object.fromEntries(METRIC_KEYS.map((k) => {
      const v = String(f.get(k) ?? "").replace(/,/g, "").trim();
      return [k, v === "" ? null : Number(v)];
    }));
    await enterMetrics(getDb(), u.id, String(f.get("ccId")), vals);
    revalidatePath(`/p/${String(f.get("projectId"))}`, "layout");
    return { ok: true, message: "บันทึกตัวเลขแล้ว" };
  });
}

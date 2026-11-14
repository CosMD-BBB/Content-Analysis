import { CONTENT_STATUSES, PLATFORMS, type ContentStatus, type Platform } from "../db/constants";
import type { ContentFilters } from "../content/service";

export type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const UUID = /^[0-9a-f-]{36}$/;

export function readFilters(sp: SP): ContentFilters {
  const status = one(sp.status), platform = one(sp.platform), wt = one(sp.workType), owner = one(sp.owner);
  return {
    q: one(sp.q).trim() || undefined,
    status: (CONTENT_STATUSES as readonly string[]).includes(status) ? (status as ContentStatus) : undefined,
    platform: (PLATFORMS as readonly string[]).includes(platform) ? (platform as Platform) : undefined,
    workTypeId: UUID.test(wt) ? wt : undefined,
    ownerId: UUID.test(owner) ? owner : undefined,
  };
}

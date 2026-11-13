import { CATALOG } from "@/src/channels/catalog";
import type { ContentStatus, Platform } from "@/src/db/constants";
import { STATUS_LABEL, STATUS_TONE } from "@/src/i18n/th";

export function ChannelBadge({ p, lg }: { p: Platform; lg?: boolean }) {
  const c = CATALOG[p];
  return <span className={`chb${lg ? " lg" : ""}`} style={{ background: c.bg, color: c.fg }} title={c.name}>{c.badge}</span>;
}

export function ChannelBadges({ list }: { list: Platform[] }) {
  return <span className="chs">{list.map((p) => <ChannelBadge key={p} p={p} />)}</span>;
}

export function StatusPill({ s }: { s: ContentStatus }) {
  return <span className={`pill t-${STATUS_TONE[s]}`}>{STATUS_LABEL[s]}</span>;
}

export function WorkTypeChip({ name }: { name?: string | null }) {
  if (!name) return null;
  return <span className="wt-chip">{name}</span>;
}

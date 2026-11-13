"use client";

import Link from "next/link";
import { useState } from "react";
import { markAllReadAction } from "@/app/(app)/account/notify-actions";
import { Icon } from "./icon";

type Item = { id: string; text: string; title: string | null; projectId: string; contentId: string | null; when: string; read: boolean };

export function Bell({ unread, items }: { unread: number; items: Item[] }) {
  const [count, setCount] = useState(unread);
  return (
    <details className="user-menu bell" onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open && count) { setCount(0); markAllReadAction(); } }}>
      <summary className="btn icon ghost" aria-label={`การแจ้งเตือน${count ? ` ${count} รายการใหม่` : ""}`}>
        <Icon name="bell" />
        {count > 0 && <span className="bell-n">{count > 9 ? "9+" : count}</span>}
      </summary>
      <div className="sw-menu bell-menu">
        <div className="nav-label">การแจ้งเตือน</div>
        {items.length ? items.map((n) => (
          <Link key={n.id} href={n.contentId ? `/p/${n.projectId}/content/${n.contentId}` : `/p/${n.projectId}`} className={n.read ? "" : "unread"}>
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span>{n.text}{n.title ? `: ${n.title}` : ""}</span>
              <span className="small faint">{n.when}</span>
            </span>
          </Link>
        )) : <span className="small muted" style={{ padding: 10 }}>ยังไม่มีการแจ้งเตือน</span>}
        <Link href="/account" className="sw-all"><Icon name="settings" size="sm" />ตั้งค่าการแจ้งเตือน</Link>
      </div>
    </details>
  );
}

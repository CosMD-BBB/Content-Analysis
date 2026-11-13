"use client";

import { useState } from "react";
import { CATALOG } from "@/src/channels/catalog";
import { previewFrame } from "@/src/content/preview";
import type { Format, Platform } from "@/src/db/constants";
import { ChannelBadge } from "./badges";
import { Cover } from "./cover";
import { Icon } from "./icon";

type M = { id: string; kind: "image" | "video"; storageKey: string; thumbKey: string | null };

/** ตัวอย่างโพสต์ตามหน้าตาของแต่ละแพลตฟอร์ม */
export function PlatformPreview(props: {
  title: string;
  format: Format;
  pillarColor?: string | null;
  caption: string;
  overrides: Partial<Record<Platform, string>>;
  platforms: Platform[];
  media: M[];
  account: string;
}) {
  const [tab, setTab] = useState<Platform | undefined>(props.platforms[0]);
  const [idx, setIdx] = useState(0);
  if (!tab) return <div className="empty">ยังไม่ได้เลือกช่องทาง</div>;
  const frame = previewFrame(tab, props.format);
  const caption = props.overrides[tab]?.trim() ? props.overrides[tab]! : props.caption;
  const m = props.media[idx];
  const ratio = frame.ratio.replace(":", " / ");
  const visual = m ? (
    m.kind === "video" ? (
      frame.layout === "vertical" ? (
        <video className="pv-media" style={{ aspectRatio: ratio }} src={`/files/${m.storageKey}`} poster={m.thumbKey ? `/files/${m.thumbKey}` : undefined} autoPlay muted loop playsInline preload="metadata" />
      ) : (
        <video className="pv-media" style={{ aspectRatio: ratio }} src={`/files/${m.storageKey}`} poster={m.thumbKey ? `/files/${m.thumbKey}` : undefined} controls playsInline preload="none" />
      )
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="pv-media" style={{ aspectRatio: ratio }} src={`/files/${m.storageKey}`} alt="" />
    )
  ) : (
    <Cover c={{ title: props.title, format: props.format, pillarColor: props.pillarColor }} size="lg" ratio={ratio} />
  );
  const dots = props.media.length > 1 && (
    <div className="pv-dots">
      {props.media.map((x, i) => <button key={x.id} type="button" aria-label={`ไฟล์ที่ ${i + 1}`} className={i === idx ? "on" : ""} onClick={() => setIdx(i)} />)}
    </div>
  );
  const name = props.account || "บัญชีแบรนด์";
  return (
    <div className="pv">
      <div className="tabs" role="tablist">
        {props.platforms.map((p) => (
          <button key={p} type="button" role="tab" aria-selected={tab === p} onClick={() => { setTab(p); setIdx(0); }}>
            <ChannelBadge p={p} />{CATALOG[p].name}
          </button>
        ))}
      </div>
      <div className={`pv-stage pv-${frame.layout}`}>
        {frame.layout === "vertical" && (
          <div className="pv-phone">
            {visual}
            <div className="pv-overlay">
              <b>@{name}</b>
              <p>{caption || props.title}</p>
            </div>
            <div className="pv-side"><Icon name="star" /><Icon name="send" /><Icon name="copy" /></div>
            {dots}
          </div>
        )}
        {frame.layout === "feed" && (
          <div className="pv-feed">
            <div className="pv-head"><ChannelBadge p={tab} /><b>{name}</b><span className="faint small">· ตัวอย่าง</span></div>
            {visual}
            {dots}
            <p className="pv-cap">{caption || <span className="faint">ยังไม่มีแคปชัน</span>}</p>
          </div>
        )}
        {frame.layout === "youtube" && (
          <div className="pv-yt">
            {visual}
            {dots}
            <b className="pv-yt-title">{props.title}</b>
            <span className="small muted">{name}</span>
            <p className="pv-cap small">{caption}</p>
          </div>
        )}
        {frame.layout === "line_card" && (
          <div className="pv-line">
            <div className="pv-line-bubble">
              {visual}
              <div style={{ padding: "10px 12px" }}>
                <b>{props.title}</b>
                <p className="pv-cap small">{caption}</p>
              </div>
              <div className="pv-line-btn">ดูรายละเอียด</div>
            </div>
          </div>
        )}
        {frame.layout === "article" && (
          <div className="pv-article">
            {visual}
            <h3 style={{ fontSize: 20 }}>{props.title}</h3>
            <p className="pv-cap">{caption}</p>
          </div>
        )}
      </div>
      <p className="small faint" style={{ textAlign: "center" }}>
        ตัวอย่างโดยประมาณ · {frame.ratio === "9:16" ? "แนวตั้ง 9:16" : frame.ratio === "4:5" ? "4:5" : frame.ratio === "16:9" ? "แนวนอน 16:9" : "สี่เหลี่ยมจัตุรัส 1:1"}
      </p>
    </div>
  );
}

import { FORMAT_LABEL } from "@/src/i18n/th";
import { Icon } from "./icon";

const FORMAT_ICON = { reel: "video", video: "video", image: "image", carousel: "layers", article: "pen" } as const;

export type CoverInput = {
  title: string;
  format: keyof typeof FORMAT_LABEL;
  pillarColor?: string | null;
  thumbKey?: string | null;
  kind?: "image" | "video" | null;
};

/** รูปย่อของคอนเทนต์: ใช้รูปจริงถ้ามี ไม่มีก็วาดปกจากหมวดและรูปแบบงาน */
export function Cover({ c, size = "md", ratio }: { c: CoverInput; size?: "xs" | "sm" | "md" | "lg"; ratio?: string }) {
  const style: React.CSSProperties = ratio ? { aspectRatio: ratio } : {};
  if (c.thumbKey)
    return (
      <span className={`cover cover-${size}`} style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/files/${c.thumbKey}`} alt="" loading="lazy" />
        {c.kind === "video" && <span className="cover-play"><Icon name="video" size="sm" /></span>}
      </span>
    );
  const color = c.pillarColor || "#5A6077";
  return (
    <span className={`cover cover-${size} cover-gen`} style={{ ...style, ["--cv" as string]: color }} title={c.title}>
      <Icon name={FORMAT_ICON[c.format]} size="sm" />
      {(size === "md" || size === "lg") && <span className="cover-title">{c.title}</span>}
      {(size === "md" || size === "lg") && <span className="cover-fmt">{FORMAT_LABEL[c.format]}</span>}
    </span>
  );
}

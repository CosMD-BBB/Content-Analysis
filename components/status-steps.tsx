import type { ContentStatus } from "@/src/db/constants";
import { STATUS_LABEL } from "@/src/i18n/th";

const ORDER: ContentStatus[] = ["idea", "draft", "review", "approved", "published"];

export function StatusSteps({ status }: { status: ContentStatus }) {
  const cur = status === "changes" ? 2 : status === "scheduled" ? 3 : ORDER.indexOf(status);
  return (
    <div className="steps">
      {ORDER.map((s, i) => {
        const alert = status === "changes" && i === 2;
        const label = alert ? "ขอแก้ไข" : s === "approved" && status === "scheduled" ? "ตั้งเวลาแล้ว" : STATUS_LABEL[s];
        return <div key={s} className={`step ${alert ? "alert" : i < cur ? "done" : i === cur ? "cur" : ""}`}><div className="bar" />{label}</div>;
      })}
    </div>
  );
}

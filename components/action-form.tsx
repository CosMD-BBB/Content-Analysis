"use client";

import { useActionState, useRef } from "react";
import { errText } from "@/src/i18n/th";
import type { ActionResult } from "@/src/server/act";
import { toast } from "./toast";

/** ฟอร์มที่เรียก server action แล้วแสดงข้อความผิดพลาด/สำเร็จ */
export function ActionForm({
  action, children, className, style, success, resetOnSuccess, id,
}: {
  action: (s: ActionResult, f: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  success?: string;
  resetOnSuccess?: boolean;
  id?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  // แสดงข้อความทันทีที่ action เสร็จ (ฟอร์มอาจหายไปหลังหน้ารีเฟรช เช่น งานย้ายไปแท็บอื่น)
  const [state, formAction, pending] = useActionState(async (s: ActionResult, f: FormData) => {
    const r = await action(s, f);
    if (r?.ok) {
      if (r.message || success) toast(r.message ?? success!);
      if (resetOnSuccess) ref.current?.reset();
    }
    return r;
  }, undefined);
  return (
    <form ref={ref} action={formAction} className={className} style={style} id={id} aria-busy={pending}>
      {children}
      {state?.error && (
        <p className="small form-error" role="alert" style={{ color: "var(--bad)", width: "100%" }}>
          {errText(state.error)}
        </p>
      )}
    </form>
  );
}

"use client";

import { useActionState, useEffect, useRef } from "react";
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
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      if (success || state.message) toast(state.message ?? success!);
      if (resetOnSuccess) ref.current?.reset();
    }
  }, [state, success, resetOnSuccess]);
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

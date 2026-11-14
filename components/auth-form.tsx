"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/(auth)/actions";
import { errText } from "@/src/i18n/th";

type Field = { name: string; label: string; type?: string; autoComplete?: string; hint?: string };

export function AuthForm(props: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  fields: Field[];
  submit: string;
  hidden?: Record<string, string>;
  successText?: string;
}) {
  const [state, action, pending] = useActionState(props.action, undefined);
  if (state?.ok && props.successText) return <div className="banner">{props.successText}</div>;
  return (
    <form action={action} className="m-body" style={{ padding: 0 }}>
      {Object.entries(props.hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {props.fields.map((f) => (
        <div className="field" key={f.name}>
          <label htmlFor={`f-${f.name}`}>{f.label}</label>
          <input className="input" id={`f-${f.name}`} name={f.name} type={f.type ?? "text"} autoComplete={f.autoComplete} defaultValue={state?.values?.[f.name]} required />
          {f.hint && <span className="hint">{f.hint}</span>}
        </div>
      ))}
      {state?.error && (
        <p className="small" role="alert" style={{ color: "var(--bad)" }}>
          {errText(state.error)}
        </p>
      )}
      <button className="btn primary" type="submit" disabled={pending}>
        {pending ? "กำลังดำเนินการ…" : props.submit}
      </button>
    </form>
  );
}

export function AuthShell({ title, sub, children, foot }: { title: string; sub?: string; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <div className="login">
      <div className="login-box" style={{ width: "min(420px, 100%)" }}>
        <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="brand-mark">C</div>
          <div>
            <div className="brand-name">Content Studio</div>
            <div className="brand-sub">ระบบจัดการคอนเทนต์</div>
          </div>
        </Link>
        <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h1 style={{ fontSize: 24 }}>{title}</h1>
            {sub && <p className="muted">{sub}</p>}
          </div>
          {children}
        </section>
        {foot && <div className="small muted" style={{ textAlign: "center" }}>{foot}</div>}
      </div>
    </div>
  );
}

"use client";

import { useFormStatus } from "react-dom";

export function Submit({ children, className = "btn primary", name, value, disabled }: { children: React.ReactNode; className?: string; name?: string; value?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} name={name} value={value} disabled={pending || disabled}>
      {children}
    </button>
  );
}

"use client";

export function toast(msg: string) {
  const wrap = document.getElementById("toasts");
  if (!wrap) return;
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3600);
}

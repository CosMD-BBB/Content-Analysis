"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/(auth)/actions";
import { ROLE_LABEL } from "@/src/i18n/th";
import { Icon } from "./icon";

type Nav = { href: string; label: string; icon: string; count?: number };
type ProjectLite = { id: string; name: string; color: string };

const initial = (s: string) => s.trim().slice(0, 1).toUpperCase();

export function Shell(props: {
  user: { name: string; isSuperAdmin: boolean };
  role: keyof typeof ROLE_LABEL;
  project: ProjectLite;
  projects: ProjectLite[];
  nav: Nav[];
  settingsNav: Nav[];
  bell?: React.ReactNode;
  canCreate: boolean;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(false);
  useEffect(() => setMenu(false), [path]);
  useEffect(() => {
    const saved = (() => { try { return localStorage.getItem("cs-theme"); } catch { return null; } })();
    if (saved) document.documentElement.dataset.theme = saved;
    setDark((document.documentElement.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark");
  }, []);
  const toggleTheme = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("cs-theme", next); } catch {}
    setDark(!dark);
  };
  const base = `/p/${props.project.id}`;
  const active = (href: string) => (href === base ? path === base : path.startsWith(href));
  const link = (n: Nav) => (
    <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}>
      <Icon name={n.icon} />
      <span>{n.label}</span>
      {!!n.count && <span className="count">{n.count}</span>}
    </Link>
  );
  return (
    <>
      <div className="shell">
        <aside className={`side${menu ? " open" : ""}`}>
          <details className="switcher">
            <summary>
              <span className="brand-mark" style={{ background: props.project.color }}>{initial(props.project.name)}</span>
              <span className="sw-name"><b>{props.project.name}</b><small>{ROLE_LABEL[props.role]}</small></span>
              <Icon name="right" size="sm" className="sw-chev" />
            </summary>
            <div className="sw-menu">
              <div className="nav-label">สลับโปรเจกต์</div>
              {props.projects.map((p) => (
                <Link key={p.id} href={`/p/${p.id}`} className={p.id === props.project.id ? "on" : ""}>
                  <span className="dot" style={{ background: p.color }} />{p.name}
                </Link>
              ))}
              <Link href="/projects" className="sw-all"><Icon name="folder" size="sm" />ทุกโปรเจกต์</Link>
            </div>
          </details>
          <nav className="nav nav-group"><div className="nav-label">Workspace</div>{props.nav.map(link)}</nav>
          <nav className="nav nav-group"><div className="nav-label">ตั้งค่า</div>{props.settingsNav.map(link)}</nav>
          <div className="side-foot">
            <div className="brand" style={{ padding: "0 6px" }}>
              <div className="brand-name" style={{ fontSize: 14 }}>Content Studio</div>
            </div>
          </div>
        </aside>
        <main className="main">
          <header className="topbar">
            <button className="btn icon ghost menu-btn" onClick={() => setMenu(!menu)} aria-label="เปิดเมนู"><Icon name="menu" /></button>
            <div className="crumb"><span className="hide-sm">{props.project.name}</span></div>
            <div className="top-actions">
              {props.canCreate && (
                <Link className="btn primary sm" href={`${base}/content/new`}><Icon name="plus" size="sm" /><span className="hide-sm">สร้างคอนเทนต์</span></Link>
              )}
              {props.bell}
              <button className="btn icon ghost" onClick={toggleTheme} aria-label="สลับธีม"><Icon name={dark ? "sun" : "moon"} /></button>
              <details className="user-menu">
                <summary className="me-chip">
                  <span className="av" style={{ background: "var(--accent)" }}>{initial(props.user.name)}</span>
                  <span className="who"><b>{props.user.name}</b><small>{ROLE_LABEL[props.role]}</small></span>
                </summary>
                <div className="sw-menu" style={{ right: 0, left: "auto" }}>
                  <Link href="/account"><Icon name="settings" size="sm" />บัญชีของฉัน</Link>
                  <form action={logoutAction}><button className="menu-item" type="submit"><Icon name="logout" size="sm" />ออกจากระบบ</button></form>
                </div>
              </details>
            </div>
          </header>
          <div className="page">{props.children}</div>
        </main>
      </div>
      {menu && <div className="scrim" style={{ zIndex: 44 }} onClick={() => setMenu(false)} />}
    </>
  );
}

/** สร้าง prototype/content-studio.html (ไฟล์เดียว ใช้ CSS ไอคอน และคู่มือเชื่อมต่อชุดเดียวกับระบบจริง) */
import { readFileSync, writeFileSync } from "node:fs";
import { ICON_PATHS } from "../components/icon-paths";
import { GUIDES } from "../src/channels/guides";

const css = readFileSync("app/globals.css", "utf8").replace('@import "tailwindcss";', "") + `
.sw-btn { display: flex; align-items: center; gap: 10px; padding: 6px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); width: 100%; cursor: pointer; text-align: left; }
.sw-btn:hover { background: var(--surface-2); }
.sw-btn[aria-expanded="true"] .sw-chev { transform: rotate(90deg); }
.cal .cell.over { background: var(--accent-soft); }
.chip[draggable="true"] .grip { cursor: grab; }
`;
const js = readFileSync("prototype/src/app.js", "utf8")
  .replace("__ICONS__", JSON.stringify(ICON_PATHS))
  .replace("__GUIDES__", JSON.stringify(GUIDES));
const head = `<title>Content Studio</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anuphan:wght@500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap">
<style>${css}</style>
<div id="app"></div>
<div class="toasts" id="toasts" aria-live="polite"></div>
<script>${js}</script>
`;
writeFileSync("prototype/content-studio.html", head);
writeFileSync("prototype/index.html", `<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>[hidden]{display:none!important}body{margin:0}</style>\n</head>\n<body>\n${head}</body>\n</html>\n`);
console.log("prototype built", Math.round(head.length / 1024), "KB");

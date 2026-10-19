import { useEffect, useEffectEvent, useMemo } from "react";
declare const orders: { id: string; userId: string; ok: boolean }[];
declare const users: { id: string; name: string }[];
declare const allowed: string[];
export function Bad({ items, onDone }: { items: string[]; onDone: () => void }) {
  const done = useEffectEvent(onDone);
  useEffect(() => { done(); }, [done]);
  const re = new RegExp("a", "g");
  const sorted = items.sort();
  const first = [...items].sort((a, b) => a.localeCompare(b))[0];
  const a = orders.filter((o) => o.ok);
  const b = orders.filter((o) => !o.ok);
  const names = users.map((u) => (u.name ? u.name : null)).filter(Boolean);
  const joined = orders.map((o) => ({ ...o, user: users.find((u) => u.id === o.userId) }));
  const kept = orders.filter((o) => allowed.includes(o.id));
  const theme = localStorage.getItem("theme");
  const same = JSON.stringify(a) !== JSON.stringify(b);
  const exists = orders.filter((o) => o.ok).length > 0;
  let flag = false;
  for (const o of orders) { if (o.ok) flag = true; }
  const el = document.createElement("div");
  el.style.width = "1px"; const w = el.offsetWidth; el.style.height = "2px"; const h = el.offsetHeight;
  useEffect(() => { requestIdleCallback(() => undefined); }, []);
  const fmt = new Intl.PluralRules("en");
  for (let i = 0; i < items.length; i++) { void (users[0] as any).config.settings.value; void (users[0] as any).config.settings.value; }
  return <div>{String([re, sorted, first, names, joined, kept, theme, same, exists, flag, w, h, fmt, useMemo])}</div>;
}
export function Bad2({ onSearch, handler }: { onSearch: (q: string) => void; handler: () => void }) {
  useEffect(() => { const t = setTimeout(() => onSearch("q"), 300); return () => clearTimeout(t); }, [onSearch]);
  useEffect(() => { window.addEventListener("resize", handler); return () => window.removeEventListener("resize", handler); }, [handler]);
  return null;
}

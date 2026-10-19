import { useEffect } from "react";
async function a(skip: boolean) {
  const u = await fetch("/u");
  const v = await fetch("/v");
  const d = await fetch("/d");
  const e = await d.text();
  const flag = await fetch("/f");
  if (skip) return null;
  if ((await fetch("/g")) && skip) return 1;
  return [u, v, e, flag];
}
export function B() {
  useEffect(() => {
    window.addEventListener("scroll", () => {});
    document.addEventListener("touchstart", () => {}, { passive: false });
    localStorage.setItem("config", "{}");
  }, []);
  return null;
}
export async function GET() { return Response.json({}); }

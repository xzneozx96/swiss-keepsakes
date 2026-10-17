import { useEffect, useRef } from "react";

import "./blog-home.css";

export type Effect = "off" | "snow" | "lights" | "snowLights" | "fullSnow";

/** The window the live site would show the effect: Lucerne's Christmas market season. */
export function isFestiveSeason(date: Date) {
  const month = date.getMonth();
  const day = date.getDate();

  return (
    (month === 10 && day >= 24) || month === 11 || (month === 0 && day <= 6)
  );
}

interface Flake {
  x: number;
  y: number;
  r: number;
  speed: number;
  drift: number;
  phase: number;
  sway: number;
  alpha: number;
}

/**
 * Light snowfall on a canvas filling its positioned parent. It pauses off screen and is
 * not drawn at all when the guest asks for reduced motion.
 */
export function Snowfall({ count = 36 }: { count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    const spawn = (fromTop: boolean): Flake => ({
      x: Math.random() * width,
      y: fromTop ? -6 : Math.random() * height,
      r: 1 + Math.random() * 2.2,
      speed: 0.3 + Math.random() * 0.55,
      drift: 6 + Math.random() * 14,
      phase: Math.random() * Math.PI * 2,
      sway: 0.008 + Math.random() * 0.012,
      alpha: 0.55 + Math.random() * 0.4,
    });
    const flakes = Array.from({ length: count }, () => spawn(false));

    let frame = 0;
    let last = 0;
    let running = false;

    const tick = (now: number) => {
      const step = Math.min((now - last) / 16.7, 3);

      last = now;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(30, 50, 80, 0.35)";
      ctx.shadowBlur = 3;

      for (const f of flakes) {
        f.y += f.speed * step;
        f.phase += f.sway * step;
        if (f.y - f.r > height) Object.assign(f, spawn(true));

        ctx.globalAlpha = f.alpha;
        ctx.beginPath();
        ctx.arc(f.x + Math.sin(f.phase) * f.drift, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }

      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const visibility = new IntersectionObserver(([entry]) =>
      entry?.isIntersecting ? start() : stop(),
    );
    const size = new ResizeObserver(resize);

    visibility.observe(canvas);
    size.observe(canvas);

    return () => {
      stop();
      visibility.disconnect();
      size.disconnect();
    };
  }, [count]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 size-full"
    />
  );
}

const BULBS = 15;
const SWAGS = 2;
const SAG = 14;

/** A warm-white garland hanging across its positioned parent, along the top edge by default. */
export function StringLights({ className = "top-0" }: { className?: string }) {
  const points = Array.from({ length: BULBS }, (_, i) => {
    const t = (i + 0.5) / BULBS;
    const local = (t * SWAGS) % 1;

    return { left: t * 100, top: 4 + SAG * 4 * local * (1 - local) };
  });
  const wire = Array.from({ length: SWAGS }, (_, i) => {
    const x0 = (i * 100) / SWAGS;
    const x1 = ((i + 1) * 100) / SWAGS;

    return `M${x0} 4 Q${(x0 + x1) / 2} ${4 + SAG * 2} ${x1} 4`;
  }).join(" ");

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 z-10 h-10 ${className}`}
    >
      <svg
        className="absolute inset-0 size-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 40"
      >
        <path
          d={wire}
          fill="none"
          stroke="rgba(40, 32, 24, 0.55)"
          strokeWidth="0.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {points.map((p, i) => (
        <span
          key={i}
          className="blog-bulb"
          style={{
            left: `${p.left}%`,
            top: `${p.top * 2.5}%`,
            animationDelay: `${(i * 0.37) % 2.4}s`,
          }}
        />
      ))}
    </div>
  );
}

/** The effect layer for a cover photo: none, snow, lights or both. */
export function CoverEffects({
  effect,
  lightsClassName,
}: {
  effect: Effect;
  lightsClassName?: string;
}) {
  return (
    <>
      {(effect === "lights" || effect === "snowLights") && (
        <StringLights className={lightsClassName} />
      )}
      {(effect === "snow" || effect === "snowLights") && <Snowfall />}
    </>
  );
}

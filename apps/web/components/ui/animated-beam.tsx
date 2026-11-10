"use client";

import { useEffect, useId, useState, type RefObject } from "react";

/**
 * Connecteur de schéma : trait orthogonal (droit ou en équerre) entre deux blocs,
 * prise à chaque extrémité, flèche à l'arrivée et impulsion qui circule.
 */
export function Wire({
  container,
  from,
  to,
  dir = "h",
  duration = 2.8,
  delay = 0,
}: {
  container: RefObject<HTMLElement | null>;
  from: RefObject<HTMLElement | null>;
  to: RefObject<HTMLElement | null>;
  dir?: "h" | "v";
  duration?: number;
  delay?: number;
}) {
  const id = useId().replace(/:/g, "");
  const [geo, setGeo] = useState<{ d: string; w: number; h: number; s: [number, number]; e: [number, number] } | null>(null);

  useEffect(() => {
    const update = () => {
      const c = container.current?.getBoundingClientRect();
      const ra = from.current?.getBoundingClientRect();
      const rb = to.current?.getBoundingClientRect();
      if (!c || !ra || !rb) return;
      const a = { l: ra.left - c.left, r: ra.right - c.left, t: ra.top - c.top, b: ra.bottom - c.top };
      const b = { l: rb.left - c.left, r: rb.right - c.left, t: rb.top - c.top, b: rb.bottom - c.top };
      const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
      const R = 8;
      let d: string;
      let s: [number, number];
      let e: [number, number];

      if (dir === "h") {
        const ltr = a.r <= b.l;
        const x1 = ltr ? a.r : a.l;
        const x2 = ltr ? b.l : b.r;
        // On aligne sur le centre du bloc le plus petit, ramené dans la hauteur de l'autre.
        const aSmall = a.b - a.t <= b.b - b.t;
        let y1 = (a.t + a.b) / 2;
        let y2 = (b.t + b.b) / 2;
        if (aSmall) y2 = clamp(y1, b.t + 16, b.b - 16);
        else y1 = clamp(y2, a.t + 16, a.b - 16);
        s = [x1, y1];
        e = [x2, y2];
        if (Math.abs(y1 - y2) < 1) {
          d = `M ${x1} ${y1} H ${x2}`;
        } else {
          const xm = (x1 + x2) / 2;
          const sx = Math.sign(x2 - x1);
          const sy = Math.sign(y2 - y1);
          d = `M ${x1} ${y1} H ${xm - sx * R} Q ${xm} ${y1} ${xm} ${y1 + sy * R} V ${y2 - sy * R} Q ${xm} ${y2} ${xm + sx * R} ${y2} H ${x2}`;
        }
      } else {
        const ttb = a.b <= b.t;
        const y1 = ttb ? a.b : a.t;
        const y2 = ttb ? b.t : b.b;
        const aSmall = a.r - a.l <= b.r - b.l;
        let x1 = (a.l + a.r) / 2;
        let x2 = (b.l + b.r) / 2;
        if (aSmall) x2 = clamp(x1, b.l + 16, b.r - 16);
        else x1 = clamp(x2, a.l + 16, a.r - 16);
        s = [x1, y1];
        e = [x2, y2];
        d = `M ${x1} ${y1} V ${y2}`;
      }
      setGeo({ d, w: c.width, h: c.height, s, e });
    };
    update();
    const ro = new ResizeObserver(update);
    if (container.current) ro.observe(container.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [container, from, to, dir]);

  if (!geo) return null;
  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 z-20 hidden overflow-visible lg:block"
      width={geo.w}
      height={geo.h}
      viewBox={`0 0 ${geo.w} ${geo.h}`}
      fill="none"
      aria-hidden
    >
      <defs>
        <marker id={`m-${id}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M1 1 7 4 1 7" stroke="#8a8a8a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </marker>
      </defs>
      <path d={geo.d} stroke="#3a3a3a" strokeWidth="1" markerEnd={`url(#m-${id})`} />
      <path
        d={geo.d}
        pathLength={1}
        stroke="#fafafa"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="0.14 1"
        className="animate-beam"
        style={{ ["--beam-duration" as string]: `${duration}s`, animationDelay: `${delay}s` }}
      />
      <circle cx={geo.s[0]} cy={geo.s[1]} r="3" fill="#0a0a0a" stroke="#8a8a8a" strokeWidth="1" />
    </svg>
  );
}

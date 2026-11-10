"use client";

import { AnimatePresence, motion, useInView } from "motion/react";
import {
  BrainCircuit,
  Check,
  CloudDownload,
  Fingerprint,
  MousePointer2,
  Puzzle,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/logo";
import { Reveal } from "@/components/ui/blur-text";
import { Container, SectionHeading, SpotlightCard } from "@/components/ui/primitives";
import { useDict } from "@/lib/i18n/provider";
import { OtaVisual } from "./ota-visual";

/* ---------------- Preuve Rocq qui s'écrit ---------------- */
const PROOF: { k: string; r: string; dim?: boolean }[] = [
  { k: "Theorem", r: " deadline_ok :" },
  { k: "  forall", r: " f, In f flows ->" },
  { k: "  wcl", r: " cfg f <= D f." },
  { k: "Proof.", r: "" },
  { k: "  intros", r: " f Hf; apply tas_bound." },
  { k: "  -", r: " exact (gcl_window_ok p).", dim: true },
  { k: "  -", r: " lia.", dim: true },
  { k: "Qed.", r: "" },
];

function ProofVisual() {
  const v = useDict().features.visuals;
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-80px" });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setN((v) => (v >= PROOF.length + 5 ? 0 : v + 1)), 420);
    return () => clearInterval(id);
  }, [inView]);
  const done = n >= PROOF.length;
  return (
    <div ref={ref} className="card-inset relative mt-6 flex flex-1 flex-col overflow-hidden rounded-lg font-mono">
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
        <span className="size-2 rounded-full bg-line-2" />
        <span className="size-2 rounded-full bg-line-2" />
        <span className="size-2 rounded-full bg-line-2" />
        <span className="ml-3 text-[11px] text-subtle">certisen_core/tas.v</span>
      </div>
      <div className="min-h-[230px] flex-1 px-4 py-3 text-[13px] leading-7">
        {PROOF.slice(0, n).map((l, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="whitespace-pre">
            <span className="mr-4 select-none text-[#444]">{String(i + 1).padStart(2, " ")}</span>
            <span className={l.dim ? "text-subtle" : "text-fg"}>{l.k}</span>
            <span className="text-muted">{l.r}</span>
          </motion.div>
        ))}
        {!done ? <span className="ml-8 inline-block h-4 w-[7px] translate-y-0.5 animate-pulse bg-fg" /> : null}
      </div>
      <AnimatePresence>
        {done ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 border-t border-line bg-fg px-4 py-2.5 text-[12px] text-ink"
          >
            <Check className="size-4" /> {v.verified}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Liste de portes TAS (802.1Qbv) ---------------- */
const GCL: number[][] = [
  [0, 18],
  [18, 30],
  [30, 55],
  [55, 70],
  [70, 100],
  [0, 10, 70, 80],
  [10, 18, 80, 90],
  [90, 100],
];
function GclVisual() {
  const v = useDict().features.visuals;
  return (
    <div className="card-inset relative mt-6 rounded-lg p-4">
      <div className="mb-3 flex justify-between font-mono text-[10px] uppercase tracking-wider text-subtle">
        <span>{v.gcl}</span>
        <span>{v.cycle}</span>
      </div>
      <div className="relative space-y-1.5">
        {GCL.map((w, q) => (
          <div key={q} className="flex items-center gap-2">
            <span className="w-5 font-mono text-[10px] text-subtle">q{7 - q}</span>
            <div className="relative h-2.5 flex-1 rounded-sm bg-[#1a1a1a]">
              {Array.from({ length: w.length / 2 }).map((_, k) => (
                <span
                  key={k}
                  className={`absolute inset-y-0 rounded-sm ${q < 2 ? "bg-fg" : q < 5 ? "bg-[#8a8a8a]" : "bg-[#4a4a4a]"}`}
                  style={{ left: `${w[k * 2]}%`, width: `${w[k * 2 + 1]! - w[k * 2]!}%` }}
                />
              ))}
            </div>
          </div>
        ))}
        <span className="absolute -inset-y-1 left-7 right-0">
          <span className="absolute inset-y-0 w-px animate-sweep bg-fg" />
        </span>
      </div>
    </div>
  );
}

/* ---------------- Éditeur visuel de topologie ---------------- */
function DesignVisual() {
  const v = useDict().features.visuals;
  return (
    <div className="card-inset bg-dots relative mt-6 h-40 overflow-hidden rounded-lg">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 160" fill="none">
        <motion.path
          d="M60 80 L150 45 L240 80 L150 120 Z M150 45 L150 120"
          stroke="#6e6e6e"
          strokeWidth="1"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          transition={{ duration: 1.6 }}
        />
        {[[60, 80], [150, 45], [240, 80], [150, 120]].map(([x, y], i) => (
          <motion.rect
            key={i}
            x={x! - 8}
            y={y! - 8}
            width="16"
            height="16"
            rx="3"
            fill="#0a0a0a"
            stroke="#fafafa"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ delay: 0.15 * i, type: "spring", stiffness: 300, damping: 20 }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          />
        ))}
      </svg>
      <motion.div
        className="absolute"
        animate={{ left: ["22%", "48%", "74%", "48%", "22%"], top: ["42%", "22%", "44%", "68%", "42%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <MousePointer2 className="size-4 fill-fg text-fg" />
        <span className="ml-4 rounded bg-fg px-1.5 py-0.5 text-[10px] font-medium text-ink">{v.precertified}</span>
      </motion.div>
    </div>
  );
}

/* ---------------- Cybersécurité ---------------- */
function CyberVisual() {
  return (
    <div className="card-inset relative mt-6 grid h-32 place-items-center overflow-hidden rounded-lg">
      <div className="grid grid-cols-8 gap-x-2 gap-y-1 opacity-50">
        {Array.from({ length: 32 }).map((_, i) => (
          <span key={i} className="font-mono text-[10px] text-subtle">
            {((i * 7919) % 16).toString(16)}
            {((i * 104729) % 16).toString(16)}
          </span>
        ))}
      </div>
      <span className="absolute grid size-12 place-items-center rounded-lg border border-line-2 bg-card text-fg">
        <Fingerprint className="size-6" strokeWidth={1.5} />
      </span>
      <span className="absolute inset-x-0 h-px animate-scan bg-fg/60" />
    </div>
  );
}

/* ---------------- Écosystème ---------------- */
function EcosystemVisual() {
  const tools = useDict().features.visuals.eco;
  return (
    <div className="relative mt-6 grid h-40 place-items-center">
      <div className="absolute size-36 animate-[spin_30s_linear_infinite] rounded-full border border-dashed border-line-2">
        {tools.map((t, i) => (
          <span
            key={t}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ transform: `rotate(${i * 90}deg) translate(72px) rotate(${-i * 90}deg)` }}
          >
            <span className="block animate-[spin_30s_linear_infinite_reverse] whitespace-nowrap rounded-md border border-line-2 bg-card px-2 py-1 text-[10px] text-muted">
              {t}
            </span>
          </span>
        ))}
      </div>
      <span className="grid size-14 place-items-center rounded-xl bg-fg text-ink">
        <LogoMark size={30} animate={false} cutout="#fafafa" />
      </span>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
  children,
  className,
  delay = 0,
  depth = 16,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Amplitude du parallaxe (px) : varie d'une carte à l'autre pour donner de la profondeur. */
  depth?: number;
}) {
  return (
    <Reveal delay={delay} className={className} parallax={depth}>
      <SpotlightCard className="flex h-full flex-col p-6">
        <Icon className="size-5 text-fg" strokeWidth={1.5} />
        <h3 className="mt-5 text-lg font-medium tracking-tight text-fg">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
        <div className="mt-auto flex flex-1 flex-col justify-end">{children}</div>
      </SpotlightCard>
    </Reveal>
  );
}

export function Features() {
  const t = useDict().features;
  const it = t.items;
  return (
    <section id="plateforme" className="bg-fade relative py-28 sm:py-36">
      <Container>
        <SectionHeading index="04" eyebrow={t.eyebrow} title={t.title} accent={t.accent} description={t.description} />

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Feature depth={10} className="lg:col-span-3 lg:row-span-2" icon={ShieldCheck} title={it.proof.title} text={it.proof.text}>
            <ProofVisual />
          </Feature>
          <Feature depth={22} className="lg:col-span-3" delay={0.06} icon={BrainCircuit} title={it.ai.title} text={it.ai.text}>
            <GclVisual />
          </Feature>
          <Feature depth={16} className="lg:col-span-3" delay={0.1} icon={CloudDownload} title={it.ota.title} text={it.ota.text}>
            <OtaVisual />
          </Feature>
          <Feature depth={14} className="lg:col-span-2" delay={0.04} icon={Workflow} title={it.design.title} text={it.design.text}>
            <DesignVisual />
          </Feature>
          <Feature depth={24} className="lg:col-span-2" delay={0.08} icon={Puzzle} title={it.eco.title} text={it.eco.text}>
            <EcosystemVisual />
          </Feature>
          <Feature depth={18} className="md:col-span-2 lg:col-span-2" delay={0.12} icon={Fingerprint} title={it.cyber.title} text={it.cyber.text}>
            <CyberVisual />
          </Feature>
        </div>
      </Container>
    </section>
  );
}

"use client";

import {
  BadgeCheck,
  BrainCircuit,
  ChevronDown,
  CloudDownload,
  FileCode2,
  Layers,
  RadioTower,
  Route,
  Timer,
  type LucideIcon,
} from "lucide-react";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { useRef, type PointerEvent, type RefObject } from "react";
import { LogoMark } from "@/components/logo";
import { Wire } from "@/components/ui/animated-beam";
import { Reveal } from "@/components/ui/blur-text";
import { Container, SectionHeading } from "@/components/ui/primitives";
import { useDict } from "@/lib/i18n/provider";

function Node({
  nodeRef,
  icon: Icon,
  title,
  lines,
}: {
  nodeRef: RefObject<HTMLDivElement | null>;
  icon: LucideIcon;
  title: string;
  lines: string[];
}) {
  return (
    // Contenu centré dans la carte : icône et titre sur une ligne, détail en dessous.
    <div ref={nodeRef} className="card relative z-10 rounded-lg px-3 py-3 text-center transition-colors hover:border-line-2 sm:p-4">
      <div className="flex items-center justify-center gap-3">
        <span className="card-inset grid size-8 shrink-0 place-items-center rounded-md text-fg">
          <Icon className="size-4" strokeWidth={1.6} />
        </span>
        <p className="text-sm font-medium text-fg">{title}</p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted sm:mt-2.5">{lines.join(" · ")}</p>
    </div>
  );
}

/** Connecteur vertical (tablette et mobile) : trait, impulsion qui descend, flèche. */
function FlowConnector({ className }: { className?: string }) {
  return (
    <div aria-hidden className={`flex flex-col items-center py-1 lg:hidden ${className ?? ""}`}>
      <span className="relative h-7 w-px overflow-hidden bg-line-2">
        <span className="absolute inset-x-0 h-3 animate-drop bg-fg" />
      </span>
      <ChevronDown className="-mt-1.5 size-4 text-muted" />
    </div>
  );
}

/**
 * Carte « CertiSen Core » en 3D : inclinaison qui suit la souris (ressort), couches à
 * différentes profondeurs, tranche visible, reflet lumineux et légère oscillation au repos.
 * L'enveloppe extérieure (coreRef) ne bouge pas : les liaisons du schéma s'y accrochent.
 */
function CoreCard3D({
  coreRef,
  label,
  desc,
}: {
  coreRef: RefObject<HTMLDivElement | null>;
  label: string;
  desc: string;
}) {
  const reduce = useReducedMotion();
  const hovering = useRef(false);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const gx = useMotionValue(50);
  const gy = useMotionValue(30);
  const srx = useSpring(rx, { stiffness: 140, damping: 16, mass: 0.6 });
  const sry = useSpring(ry, { stiffness: 140, damping: 16, mass: 0.6 });
  const glare = useMotionTemplate`radial-gradient(420px circle at ${gx}% ${gy}%, rgb(255 255 255 / 0.9), transparent 55%)`;

  // Oscillation au repos, pour qu'on devine le volume sans interaction.
  useAnimationFrame((time) => {
    if (reduce || hovering.current) return;
    rx.set(Math.sin(time / 2200) * 3);
    ry.set(Math.cos(time / 2600) * 6);
  });

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 24);
    rx.set((0.5 - py) * 24);
    gx.set(px * 100);
    gy.set(py * 100);
  };

  const layer = (z: number) => ({ transform: `translateZ(${z}px)` });

  return (
    <div
      ref={coreRef}
      className="relative z-10 order-4 w-full sm:col-span-2 lg:order-2"
      style={{ perspective: 900 }}
      onPointerEnter={() => (hovering.current = true)}
      onPointerLeave={() => {
        hovering.current = false;
        gx.set(50);
        gy.set(30);
      }}
      onPointerMove={onMove}
    >
      <motion.div style={{ rotateX: srx, rotateY: sry, transformStyle: "preserve-3d" }} className="relative">
        {/* Tranche : couches décalées en profondeur, visibles quand la carte s'incline */}
        {[4, 8, 12].map((d, i) => (
          <div
            key={d}
            aria-hidden
            className="absolute inset-0 rounded-xl"
            style={{ transform: `translateZ(-${d}px)`, background: ["#d6d6d6", "#b8b8b8", "#8f8f8f"][i] }}
          />
        ))}
        <div
          aria-hidden
          className="absolute inset-0 rounded-xl shadow-[0_40px_80px_-24px_rgb(0_0_0/0.95)]"
          style={{ transform: "translateZ(-14px)" }}
        />

        {/* Face */}
        <div className="relative overflow-hidden rounded-xl bg-fg p-6 text-center text-ink" style={{ transformStyle: "preserve-3d" }}>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-25 mix-blend-soft-light"
            style={{ background: glare }}
          />
          <div style={layer(45)}>
            <LogoMark size={44} className="mx-auto text-ink drop-shadow-[0_8px_10px_rgb(0_0_0/0.25)]" animate={false} cutout="#fafafa" />
          </div>
          <div style={layer(28)}>
            <p className="mt-3 text-lg font-semibold tracking-tight">CertiSen Core</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/60">{label}</p>
          </div>
          <p className="mt-4 text-sm text-ink/75" style={layer(14)}>
            {desc}
          </p>
          <div
            className="mt-5 rounded-md bg-ink px-3 py-2.5 font-mono text-[12px] text-fg shadow-[0_12px_20px_-8px_rgb(0_0_0/0.6)]"
            style={layer(36)}
          >
            AcceptedByAI(x) ⇒ CertifiedByCore(x)
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function Solution() {
  const t = useDict().solution;
  const n = t.nodes;
  const box = useRef<HTMLDivElement>(null);
  const model = useRef<HTMLDivElement>(null);
  const reqs = useRef<HTMLDivElement>(null);
  const tools = useRef<HTMLDivElement>(null);
  const ai = useRef<HTMLDivElement>(null);
  const core = useRef<HTMLDivElement>(null);
  const ota = useRef<HTMLDivElement>(null);
  const cert = useRef<HTMLDivElement>(null);
  const conf = useRef<HTMLDivElement>(null);
  const mon = useRef<HTMLDivElement>(null);

  return (
    <section id="solution" className="relative py-20 sm:py-28 lg:py-36">
      <Container>
        <SectionHeading index="03" eyebrow={t.eyebrow} title={t.title} accent={t.accent} description={t.description} />

        <Reveal className="mt-10 sm:mt-16">
          <div
            ref={box}
            className="bg-dots relative grid grid-cols-1 gap-3 rounded-xl border border-line bg-ink-2 p-4 sm:p-8 lg:grid-cols-[1fr_1.1fr_1fr] lg:gap-16 lg:p-10"
          >
            {/* Entrées : 3 colonnes compactes sur tablette, pile verticale sur grand écran */}
            <div className="relative grid gap-3 sm:grid-cols-3 lg:flex lg:flex-col lg:justify-center lg:gap-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-subtle sm:col-span-3">{t.inputs}</p>
              <Node nodeRef={model} icon={Route} title={n.model.title} lines={n.model.lines} />
              <Node nodeRef={reqs} icon={Timer} title={n.reqs.title} lines={n.reqs.lines} />
              <Node nodeRef={tools} icon={Layers} title={n.tools.title} lines={n.tools.lines} />
            </div>

            <FlowConnector />

            {/* Cœur : IA et OTA côte à côte au-dessus du Core sur tablette, en colonne sur grand écran */}
            <div className="relative grid gap-3 sm:grid-cols-2 lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-12">
              <div className="order-1 w-full">
                <Node nodeRef={ai} icon={BrainCircuit} title={n.ai.title} lines={n.ai.lines} />
              </div>

              <FlowConnector className="order-3 sm:col-span-2" />

              <CoreCard3D coreRef={core} label={t.core.label} desc={t.core.desc} />

              <div className="order-2 w-full lg:order-3">
                <Node nodeRef={ota} icon={CloudDownload} title={n.ota.title} lines={n.ota.lines} />
              </div>
            </div>

            <FlowConnector />

            {/* Sorties */}
            <div className="relative grid gap-3 sm:grid-cols-3 lg:flex lg:flex-col lg:justify-center lg:gap-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-subtle sm:col-span-3">{t.outputs}</p>
              <Node nodeRef={cert} icon={BadgeCheck} title={n.cert.title} lines={n.cert.lines} />
              <Node nodeRef={conf} icon={FileCode2} title={n.conf.title} lines={n.conf.lines} />
              <Node nodeRef={mon} icon={RadioTower} title={n.mon.title} lines={n.mon.lines} />
            </div>

            <Wire container={box} from={model} to={core} />
            <Wire container={box} from={reqs} to={core} delay={0.6} />
            <Wire container={box} from={tools} to={core} delay={1.2} />
            <Wire container={box} from={ai} to={core} dir="v" duration={1.6} />
            <Wire container={box} from={ota} to={core} dir="v" duration={1.6} delay={0.8} />
            <Wire container={box} from={core} to={cert} delay={0.3} />
            <Wire container={box} from={core} to={conf} delay={0.9} />
            <Wire container={box} from={core} to={mon} delay={1.5} />
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-5 text-sm text-muted">
          {t.footnote[0]}
          <span className="text-fg">{t.footnote[1]}</span>
        </Reveal>
      </Container>
    </section>
  );
}

"use client";

import dynamic from "next/dynamic";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useRef } from "react";
import { BlurText } from "@/components/ui/blur-text";
import { PrimaryButton, SecondaryButton, StatusDot } from "@/components/ui/primitives";
import { useDict } from "@/lib/i18n/provider";
import { useLoaderSignal, useReady } from "@/components/loader";
import { WebGLGuard } from "@/components/three/webgl-guard";

const NetworkCanvas = dynamic(() => import("@/components/three/network-canvas"), { ssr: false });

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const t = useDict().hero;
  // Les entrées démarrent quand l'écran de chargement se lève (délais réduits d'autant).
  const ready = useReady();
  const onSceneReady = useLoaderSignal("heroScene");
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section ref={ref} id="top" className="relative isolate min-h-[100svh] overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 2, delay: 0.2 }}
        className="absolute inset-0 -z-10"
      >
        {/* Sans WebGL : simple trame de points, le texte du héros reste intact. */}
        <WebGLGuard onFallback={onSceneReady} fallback={<div className="h-full w-full bg-dots opacity-60" />}>
          <NetworkCanvas className="h-full w-full" onReady={onSceneReady} />
        </WebGLGuard>
      </motion.div>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,#0a0a0a_0%,rgb(10_10_10/0.92)_32%,rgb(10_10_10/0.2)_70%,transparent)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-ink/50 lg:hidden" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-ink" />

      <motion.div
        style={{ y, opacity }}
        className="mx-auto flex min-h-[100svh] max-w-[1200px] flex-col justify-center px-6 pb-20 pt-32"
      >
        <motion.a
          href="#feuille-de-route"
          initial={{ opacity: 0, y: 10 }}
          animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ delay: 0.35, duration: 0.7, ease: EASE }}
          className="group mb-10 inline-flex w-fit items-center gap-3 rounded-full border border-line-2 bg-card py-1 pl-1 pr-3.5 text-xs text-muted transition-colors hover:border-subtle hover:text-fg"
        >
          <span className="rounded-full bg-fg px-2.5 py-0.5 font-medium text-ink">2026</span>
          {t.badge}
          <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
        </motion.a>

        <h1 className="max-w-4xl text-[clamp(2.75rem,6.6vw,5.25rem)] font-medium leading-[1] tracking-[-0.045em] text-fg">
          <BlurText text={t.title1} delay={0.45} play={ready} />
          <br />
          <BlurText text={t.title2} delay={0.65} wordClassName="text-subtle" play={ready} />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ delay: 0.95, duration: 0.8, ease: EASE }}
          className="mt-8 max-w-[34rem] text-pretty text-lg leading-relaxed text-muted"
        >
          {t.lead}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ delay: 1.1, duration: 0.8, ease: EASE }}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <PrimaryButton href="#contact">
            {t.cta}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </PrimaryButton>
          <SecondaryButton href="#solution">
            <StatusDot /> {t.secondary}
          </SecondaryButton>
        </motion.div>

        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: ready ? 1 : 0 }}
          transition={{ delay: 1.35, duration: 1 }}
          className="mt-20 grid max-w-3xl grid-cols-1 border-t border-line sm:grid-cols-3"
        >
          {t.facts.map((f, i) => (
            <div
              key={f.k}
              className={`py-5 sm:pr-6 ${i > 0 ? "border-t border-line sm:border-l sm:border-t-0 sm:pl-6" : ""}`}
            >
              <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">{f.k}</dt>
              <dd className="mt-1.5 text-[15px] text-fg">{f.v}</dd>
            </div>
          ))}
        </motion.dl>
      </motion.div>
    </section>
  );
}

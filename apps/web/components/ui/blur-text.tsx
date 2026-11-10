"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Révélation mot à mot, sobre : montée courte et fondu. */
export function BlurText({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.045,
  as = "span",
  play,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
  as?: "span" | "h1" | "h2" | "p";
  /** Si fourni, l'animation suit ce drapeau (ex. fin du chargement) au lieu de l'entrée à l'écran. */
  play?: boolean;
}) {
  // Chinois/japonais : pas d'espaces, on anime caractère par caractère (et le texte peut revenir à la ligne).
  const cjk = !/\s/.test(text) && /[　-鿿＀-￯]/.test(text);
  const words = cjk ? Array.from(text) : text.split(" ");
  const sep = cjk ? "" : " ";
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial="hidden"
      {...(play === undefined
        ? { whileInView: "show", viewport: { once: true, margin: "-60px" } }
        : { animate: play ? "show" : "hidden" })}
      transition={{ staggerChildren: cjk ? stagger / 2 : stagger, delayChildren: delay }}
    >
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className={`inline-block ${wordClassName ?? ""}`}
            variants={{
              hidden: { y: "105%" },
              show: { y: 0, transition: { duration: 0.75, ease: EASE } },
            }}
          >
            {w}
            {i < words.length - 1 ? sep : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/**
 * Parallaxe léger : le contenu glisse de +offset à −offset px pendant qu'il traverse
 * l'écran. Désactivé si l'utilisateur demande moins d'animations.
 */
export function Parallax({ children, offset = 16, className }: { children: ReactNode; offset?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [offset, -offset]);
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

/** Apparition douce au défilement, avec parallaxe léger en option (valeur en px). */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  parallax,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  parallax?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {parallax ? (
        <Parallax offset={parallax} className="h-full">
          {children}
        </Parallax>
      ) : (
        children
      )}
    </motion.div>
  );
}

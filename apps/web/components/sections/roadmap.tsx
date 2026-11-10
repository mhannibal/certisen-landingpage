"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Container, SectionHeading } from "@/components/ui/primitives";
import { useDict } from "@/lib/i18n/provider";



export function Roadmap() {
  const t = useDict().roadmap;
  const STEPS = t.steps;
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="feuille-de-route" className="bg-fade relative py-20 sm:py-28 lg:py-36">
      <Container>
        <SectionHeading index="07" eyebrow={t.eyebrow} title={t.title} accent={t.accent} />

        <ol ref={ref} className="relative mt-10 sm:mt-16">
          <span className="absolute bottom-0 left-[7px] top-0 w-px bg-line md:left-[calc(25%+7px)]" />
          <motion.span
            style={{ scaleY }}
            className="absolute bottom-0 left-[7px] top-0 w-px origin-top bg-fg md:left-[calc(25%+7px)]"
          />
          {STEPS.map((s, i) => (
            <motion.li
              key={s.date}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15% 0px" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative grid gap-1.5 pb-8 pl-9 last:pb-0 sm:gap-2 sm:pb-12 sm:pl-10 md:grid-cols-[25%_1fr] md:gap-0 md:pl-0"
            >
              <p className="font-mono text-[13px] text-muted sm:text-sm md:pr-10 md:text-right">{s.date}</p>
              <span
                className={`absolute left-0 top-1 size-[15px] rounded-full border md:left-[25%] ${
                  i === STEPS.length - 1 ? "border-fg bg-ink" : "border-fg bg-fg"
                }`}
              />
              <div className="md:pl-12">
                <h3 className="text-lg font-medium tracking-tight text-fg sm:text-xl">{s.title}</h3>
                <p className="mt-1 max-w-lg text-[15px] leading-relaxed text-muted sm:mt-1.5 sm:text-base">{s.text}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

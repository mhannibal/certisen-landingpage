"use client";

import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  Copy,
  Mail,
  MapPin,
} from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useScroll, useTransform } from "motion/react";
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Logo } from "@/components/logo";
import { BlurText, Reveal } from "@/components/ui/blur-text";
import { BrandLogo, LOGOS } from "@/components/ui/brand-logo";
import { Container, SectionLabel } from "@/components/ui/primitives";
import { useDict, useI18n } from "@/lib/i18n/provider";

const EMAIL = "certisen@inria.fr";
const LINKEDIN = "https://www.linkedin.com/company/certisen";

function Field({
  label,
  name,
  type = "text",
  area = false,
}: {
  label: string;
  name: string;
  type?: string;
  area?: boolean;
}) {
  const cls =
    "w-full rounded-lg border border-line-2 bg-ink px-3.5 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-subtle focus:border-fg";
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted">{label}</span>
      {area ? (
        <textarea
          name={name}
          rows={4}
          required
          className={`${cls} resize-none`}
        />
      ) : (
        <input name={name} type={type} required className={cls} />
      )}
    </label>
  );
}

const ROW = {
  hidden: { opacity: 0, x: -16 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/**
 * Lien de contact animé : fond qui balaie la ligne, trait qui se dessine,
 * texte qui glisse et flèche qui sort en diagonale pendant qu'une autre entre.
 */
function ContactLink({
  href,
  icon,
  label,
  external = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  external?: boolean;
}) {
  return (
    <motion.a
      variants={ROW}
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="group relative flex items-center justify-between overflow-hidden py-4 text-fg"
    >
      <span className="pointer-events-none absolute inset-0 origin-left scale-x-0 bg-white/[0.035] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-fg transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
      <span className="relative flex items-center gap-3 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-3">
        <span className="text-muted transition-colors duration-300 group-hover:text-fg">
          {icon}
        </span>
        {label}
      </span>
      <span className="relative mr-1 grid size-8 place-items-center overflow-hidden rounded-full border border-line-2 text-muted transition-colors duration-300 group-hover:border-fg group-hover:bg-fg group-hover:text-ink">
        <ArrowUpRight className="size-3.5 transition-transform duration-300 ease-out group-hover:-translate-y-5 group-hover:translate-x-5" />
        <ArrowUpRight className="absolute size-3.5 -translate-x-5 translate-y-5 transition-transform duration-300 ease-out group-hover:translate-x-0 group-hover:translate-y-0" />
      </span>
    </motion.a>
  );
}

/** Copie un texte dans le presse-papier (repli pour les contextes sans Clipboard API). */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

/**
 * Ligne « e-mail » : un clic copie l'adresse. Même survol que les liens ;
 * la pastille passe de l'icône copier à une coche, avec « Copié ! » à côté.
 */
function CopyEmail() {
  const t = useDict().contact;
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onCopy = async () => {
    if (!(await copyText(EMAIL))) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.button
      type="button"
      variants={ROW}
      onClick={onCopy}
      aria-label={`${t.copyEmail} : ${EMAIL}`}
      className="group relative flex w-full cursor-copy items-center justify-between overflow-hidden py-4 text-left text-fg"
    >
      <span className="pointer-events-none absolute inset-0 origin-left scale-x-0 bg-white/[0.035] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-fg transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100" />
      <span className="relative flex items-center gap-3 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-3">
        <span className="text-muted transition-colors duration-300 group-hover:text-fg">
          <Mail className="size-4" strokeWidth={1.5} />
        </span>
        {EMAIL}
      </span>
      <span className="relative mr-1 flex items-center gap-2.5">
        <AnimatePresence>
          {copied ? (
            <motion.span
              role="status"
              initial={{ opacity: 0, x: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: 8, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg"
            >
              {t.copied}
            </motion.span>
          ) : null}
        </AnimatePresence>
        <span
          className={`relative grid size-8 place-items-center overflow-hidden rounded-full border transition-colors duration-300 ${
            copied
              ? "border-fg bg-fg text-ink"
              : "border-line-2 text-muted group-hover:border-fg group-hover:bg-fg group-hover:text-ink"
          }`}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={copied ? "ok" : "copy"}
              initial={{ y: 14, opacity: 0, scale: 0.6 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -14, opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 420, damping: 26 }}
              className="grid place-items-center"
            >
              {copied ? (
                <Check className="size-3.5" strokeWidth={2.6} />
              ) : (
                <Copy className="size-3.5" />
              )}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
    </motion.button>
  );
}

export function Contact() {
  const t = useDict().contact;
  const [sent, setSent] = useState(false);
  // Pas de serveur pour l'instant : le formulaire prépare un e-mail dans la messagerie.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = `${f.get("message")}\n\n— ${f.get("name")} <${f.get("email")}>`;
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(String(f.get("subject")))}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <section id="contact" className="relative py-20 sm:py-28 lg:py-36">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col">
            <Reveal>
              <SectionLabel index="08">{t.eyebrow}</SectionLabel>
            </Reveal>
            <h2 className="mt-4 text-balance text-[2.5rem] font-medium leading-[1.05] tracking-[-0.04em] text-fg sm:mt-6 sm:text-6xl">
              <BlurText text={t.title} />
              {/[　-鿿＀-￯]$/.test(t.title) ? null : " "}
              <BlurText
                text={t.accent}
                delay={0.15}
                wordClassName="text-subtle"
              />
            </h2>
            <Reveal delay={0.15}>
              <p className="mt-4 max-w-md text-base text-muted sm:mt-6 sm:text-lg">{t.lead}</p>
            </Reveal>
            <div className="mt-auto pt-8 sm:pt-12">
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-60px" }}
                transition={{ staggerChildren: 0.09, delayChildren: 0.2 }}
                className="divide-y divide-line border-y border-line text-sm"
              >
                <CopyEmail />
                <ContactLink
                  href={LINKEDIN}
                  external
                  icon={
                    <span className="w-4 text-center font-semibold">in</span>
                  }
                  label={t.linkedin}
                />
                <motion.p
                  variants={ROW}
                  className="flex items-center gap-3 py-4 text-muted"
                >
                  <MapPin className="size-4 shrink-0" strokeWidth={1.5} />
                  {t.address}
                </motion.p>
              </motion.div>
            </div>
          </div>

          <Reveal delay={0.1} parallax={16}>
            <form onSubmit={onSubmit} className="card rounded-xl p-5 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t.form.name} name="name" />
                <Field label={t.form.email} name="email" type="email" />
              </div>
              <div className="mt-4 space-y-4">
                <Field label={t.form.subject} name="subject" />
                <Field label={t.form.message} name="message" area />
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-subtle">
                {t.form.privacy}
              </p>
              <button
                type="submit"
                className="group mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-fg font-medium text-ink transition-colors hover:bg-white/85"
              >
                {sent ? t.form.sent : t.form.submit}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

/** Financeurs affichés au pied de page (logos officiels, rendus en monochrome). */
const FUNDERS = [
  {
    name: "Inria",
    file: LOGOS.inria,
    height: "h-7",
    href: (fr: boolean) => (fr ? "https://www.inria.fr/fr" : "https://www.inria.fr/en"),
  },
  {
    name: "Inria Startup Studio",
    file: LOGOS.iss,
    height: "h-8",
    href: (fr: boolean) => (fr ? "https://www.inriastartupstudio.fr" : "https://www.inriastartupstudio.fr/en/"),
  },
  {
    name: "Bpifrance",
    file: LOGOS.bpifranceNegatif,
    height: "h-5",
    href: (fr: boolean) => (fr ? "https://www.bpifrance.fr" : "https://www.bpifrance.com"),
  },
];

/** Programme sans logo propre : marque typographique, vers la page officielle de l'appel à projets. */
const PIONNIERS_IA =
  "https://www.entreprises.gouv.fr/espace-entreprises/appels-a-projets-et-appels-a-manifestation-d-interet/pionniers-de-lintelligence";

/**
 * Grand « CertiSen » du pied de page : mot seul, aligné sur la largeur du contenu,
 * dégradé discret qui se fond vers le bas et fin liseré. Entrée en fondu, halo à
 * peine perceptible au survol. Purement décoratif (aria-hidden).
 */
function FooterWordmark() {
  const svg = useRef<SVGSVGElement>(null);
  const text = useRef<SVGTextElement>(null);
  // Cadre ajusté au mot mesuré (une fois la police chargée) : il occupe toute la largeur du contenu.
  const [box, setBox] = useState({ x: 0, y: 0, w: 1200, h: 200 });
  useEffect(() => {
    let alive = true;
    const measure = () => {
      const b = text.current?.getBBox();
      // On retire l'espace vide au-dessus des capitales ; le bas garde la place du fondu.
      // Marge : l'approche négative est aussi retirée après la dernière lettre, le cadre
      // mesuré s'arrêterait avant le bord réel du « n ».
      const pad = 250 * 0.06;
      if (alive && b && b.width > 0) setBox({ x: b.x - pad / 2, y: b.y + b.height * 0.14, w: b.width + pad * 1.5, h: b.height * 0.86 });
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const mx = useMotionValue(-1000);
  const my = useMotionValue(-1000);
  const glow = useMotionValue(0);
  const onMove = (e: ReactPointerEvent) => {
    const m = svg.current?.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    mx.set(p.x);
    my.set(p.y);
    glow.set(1);
  };
  const word = (
    <text x={0} y={200} fontSize={250} fontWeight={600} letterSpacing="-0.04em" style={{ fontFamily: "var(--font-sans)" }}>
      CertiSen
    </text>
  );
  return (
    <Container className="pb-0">
      <div aria-hidden onPointerMove={onMove} onPointerLeave={() => glow.set(0)} className="select-none pt-4">
        <svg ref={svg} viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} className="block h-auto w-full overflow-visible">
          <defs>
            {/* Dégradé vertical : le mot se fond dans le fond vers le bas */}
            <linearGradient id="wm-fill" gradientUnits="userSpaceOnUse" x1="0" y1={box.y} x2="0" y2={box.y + box.h}>
              <stop offset="0" stopColor="#262626" />
              <stop offset="0.65" stopColor="#141414" />
              <stop offset="1" stopColor="#0a0a0a" />
            </linearGradient>
            <radialGradient id="wm-spot">
              <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <clipPath id="wm-clip">{word}</clipPath>
          </defs>
          {/* Mot de mesure (invisible) */}
          <text
            ref={text}
            x={0}
            y={200}
            fontSize={250}
            fontWeight={600}
            letterSpacing="-0.04em"
            style={{ fontFamily: "var(--font-sans)" }}
            fill="none"
            opacity={0}
          >
            CertiSen
          </text>
          <g fill="url(#wm-fill)">{word}</g>
          {/* Halo très discret au survol, limité aux lettres */}
          <motion.g clipPath="url(#wm-clip)" style={{ opacity: glow }} transition={{ duration: 0.4 }}>
            <motion.circle cx={mx} cy={my} r={170} fill="url(#wm-spot)" opacity={0.09} />
          </motion.g>
        </svg>
      </div>
    </Container>
  );
}

export function Footer() {
  const { dict, locale } = useI18n();
  const t = dict.footer;
  const wrapper = useRef<HTMLDivElement>(null);
  // Le rideau se lève : 0 quand le pied de page entre par le bas, 1 quand il est entièrement dévoilé.
  const { scrollYProgress } = useScroll({ target: wrapper, offset: ["start end", "end end"] });
  const wordScale = useTransform(scrollYProgress, [0, 1], [0.82, 1]);
  const wordY = useTransform(scrollYProgress, [0, 1], ["12vh", "0vh"]);
  const wordOpacity = useTransform(scrollYProgress, [0.1, 0.9], [0, 1]);
  // Les informations montent doucement pendant que le rideau se lève.
  const infoY = useTransform(scrollYProgress, [0.35, 0.95], [40, 0]);
  const infoOpacity = useTransform(scrollYProgress, [0.35, 0.85], [0, 1]);
  const edgeOpacity = useTransform(scrollYProgress, [0.75, 1], [1, 0]);
  return (
    // Rideau : sur un grand écran, le pied de page reste fixé sous la page et n'est visible
    // que dans ce cadre (clip-path) ; il se dévoile pendant le défilement.
    <div ref={wrapper} className="relative tall:h-[100svh]" style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }}>
      <footer className="relative flex flex-col overflow-hidden bg-ink tall:fixed tall:inset-x-0 tall:bottom-0 tall:h-[100svh]">
        {/* Aurore qui respire et grille en fondu */}
        <div className="footer-aurora pointer-events-none absolute left-1/2 top-1/2 z-0 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] blur-[80px]" />
        {/* Grille très discrète, estompée vers les bords */}
        <div
          className="bg-grid pointer-events-none absolute inset-0 z-0 opacity-35"
          style={{
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black 0%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black 0%, transparent 75%)",
          }}
        />

        {/* Continuité avec la section Contact : le décor apparaît en fondu depuis le noir du haut */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[35vh] bg-gradient-to-b from-ink via-ink/70 to-transparent" />

        {/* Grand « CertiSen » : il monte et grandit pendant que le rideau se lève */}
        <motion.div
          style={{ scale: wordScale, y: wordY, opacity: wordOpacity }}
          className="pointer-events-auto z-0 order-last origin-bottom tall:absolute tall:inset-x-0 tall:bottom-0"
        >
          <FooterWordmark />
        </motion.div>


        {/* Éléments d'origine du pied de page, au centre : financeurs, adresse, contact */}
        <motion.div style={{ y: infoY, opacity: infoOpacity }} className="relative z-10 flex flex-1 flex-col justify-center tall:pt-16">
        <div className="mx-auto grid w-fit max-w-[1200px] gap-x-24 gap-y-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-[auto_auto_auto]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-subtle">{t.tagline}</p>
            <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">{t.fundedBy}</p>
            {/* Grille 2 × 2 : Inria, Inria Startup Studio / Pionniers de l'IA, Bpifrance */}
            <div className="mt-3 grid w-fit grid-cols-2 items-center justify-items-start gap-x-10 gap-y-5">
              {FUNDERS.map((f, i) => (
                <Fragment key={f.name}>
                  {/* Pionniers de l'IA se place avant Bpifrance (3e case). */}
                  {i === 2 ? (
                    <a
                      href={PIONNIERS_IA}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col leading-tight text-fg opacity-85 transition-opacity duration-300 hover:opacity-100"
                    >
                      <span className="text-[15px] font-medium tracking-[-0.02em]">Pionniers de l&apos;IA</span>
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] opacity-70">France 2030</span>
                    </a>
                  ) : null}
                  <a
                    href={f.href(locale === "fr")}
                    target="_blank"
                    rel="noreferrer"
                    className="opacity-85 transition-opacity duration-300 hover:opacity-100"
                  >
                    {/* Logos en couleurs d'origine (versions pour fond sombre). */}
                    <BrandLogo file={f.file} label={f.name} className={f.height} color />
                  </a>
                </Fragment>
              ))}
            </div>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">{t.addressTitle}</p>
            <address className="mt-3 text-sm not-italic leading-relaxed text-muted">
              {t.address.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </address>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-subtle">{t.contactTitle}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-muted">
              <li>
                <a href={`mailto:${EMAIL}`} className="transition-colors hover:text-fg">
                  {EMAIL}
                </a>
              </li>
              <li>
                <a href={LINKEDIN} target="_blank" rel="noreferrer" className="transition-colors hover:text-fg">
                  LinkedIn
                </a>
              </li>
            </ul>
          </div>
        </div>
        </motion.div>

        <Container className="relative z-10 flex flex-col items-center justify-between gap-4 border-t border-line py-5 text-xs text-subtle sm:flex-row">
          <span>{t.rights}</span>
          <a href="#top" className="group inline-flex items-center gap-2.5 whitespace-nowrap transition-colors duration-300 hover:text-fg">
            <span className="relative">
              {t.top}
              <span className="absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-fg transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:origin-left group-hover:scale-x-100" />
            </span>
            <span className="relative grid size-7 place-items-center overflow-hidden rounded-full border border-line-2 transition-colors duration-300 group-hover:border-fg group-hover:bg-fg group-hover:text-ink">
              <ArrowUp className="size-3.5 transition-transform duration-300 ease-out group-hover:-translate-y-6" />
              <ArrowUp className="absolute size-3.5 translate-y-6 transition-transform duration-300 ease-out group-hover:translate-y-0" />
            </span>
          </a>
        </Container>
      </footer>
      {/* Bord du rideau : il défile avec la page, au-dessus du pied de page fixé. Le fond
          passe donc toujours en douceur du noir de la section Contact au décor du pied de page. */}
      {/* Il s'efface à la fin du dévoilement pour ne pas assombrir les informations. */}
      <motion.div
        style={{ opacity: edgeOpacity }}
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[45vh] bg-gradient-to-b from-ink via-ink/80 to-transparent"
      />
    </div>
  );
}

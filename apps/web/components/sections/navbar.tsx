"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { ArrowUpRight, Check, ChevronDown, Globe, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { LOCALES, LOCALE_COOKIE, LOCALE_META, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { useReady } from "@/components/loader";

/** Change de langue : retient le choix (cookie, 1 an) puis charge la page dans cette langue. */
function switchLocale(next: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  window.location.assign(`/${next}${window.location.hash}`);
}

function LanguageMenu({ compact = false }: { compact?: boolean }) {
  const { locale, dict } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={dict.nav.language}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-line-2 px-3 text-sm text-muted transition-colors hover:border-subtle hover:text-fg ${compact ? "" : "bg-transparent"}`}
      >
        <Globe className="size-4" strokeWidth={1.6} />
        <span className="text-fg">{LOCALE_META[locale].short}</span>
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.ul
            role="listbox"
            aria-label={dict.nav.language}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="card absolute right-0 top-full z-50 mt-2 w-44 origin-top-right overflow-hidden rounded-xl p-1"
          >
            {LOCALES.map((l) => (
              <li key={l}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l === locale}
                  onClick={() => (l === locale ? setOpen(false) : switchLocale(l))}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                    l === locale ? "text-fg" : "text-muted"
                  }`}
                  lang={LOCALE_META[l].htmlLang}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-7 font-mono text-[11px] text-subtle">{LOCALE_META[l].short}</span>
                    {LOCALE_META[l].label}
                  </span>
                  {l === locale ? <Check className="size-4" /> : null}
                </button>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Barre flottante : transparente en haut de page, pilule resserrée au défilement. */
export function Navbar() {
  const { dict } = useI18n();
  const ready = useReady();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  // État de base pendant tout le film du héros (#top) ; la pilule se resserre une fois le film terminé.
  useMotionValueEvent(scrollY, "change", (v) => {
    const hero = document.getElementById("top");
    const end = hero ? hero.offsetTop + hero.offsetHeight - window.innerHeight : 40;
    setScrolled(v > Math.max(40, end - 40));
  });

  const links = [
    { href: "#probleme", label: dict.nav.links.problem },
    { href: "#solution", label: dict.nav.links.solution },
    { href: "#plateforme", label: dict.nav.links.platform },
    { href: "#montage", label: dict.nav.links.action },
    { href: "#feuille-de-route", label: dict.nav.links.journey },
  ];

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={ready ? { y: 0, opacity: 1 } : { y: -30, opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
    >
      <motion.nav
        animate={{
          maxWidth: scrolled ? 960 : 1200,
          paddingTop: scrolled ? 8 : 12,
          paddingBottom: scrolled ? 8 : 12,
        }}
        transition={{ type: "spring", stiffness: 220, damping: 30 }}
        className={`flex w-full items-center justify-between gap-4 rounded-full px-4 transition-[background-color,border-color,box-shadow] duration-500 sm:px-5 ${
          scrolled
            ? "border border-line-2 bg-card/80 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.8),inset_0_1px_0_rgb(255_255_255/0.05)] backdrop-blur-xl"
            : "border border-transparent"
        }`}
      >
        <a href="#top" aria-label={dict.nav.home}>
          <Logo />
        </a>

        <ul className="hidden items-center gap-1 lg:flex" onMouseLeave={() => setHover(null)}>
          {links.map((l) => (
            <li key={l.href} className="relative">
              <a
                href={l.href}
                onMouseEnter={() => setHover(l.href)}
                className="relative z-10 block whitespace-nowrap px-3.5 py-2 text-sm text-muted transition-colors hover:text-fg"
              >
                {l.label}
              </a>
              {hover === l.href ? (
                <motion.span
                  layoutId="nav-hover"
                  className="absolute inset-0 rounded-full bg-white/[0.07]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              ) : null}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <LanguageMenu />
          {/* Appel à l'action : onde qui s'élargit, reflet qui balaie le bouton, flèche qui repart au survol. */}
          <a
            href="#contact"
            className="group relative hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-fg px-4 py-2 text-sm font-medium text-ink transition-transform duration-300 hover:scale-[1.04] active:scale-[0.98] sm:inline-flex"
          >
            <span aria-hidden className="pointer-events-none absolute inset-0 animate-cta-ring rounded-full border border-fg" />
            <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
              <span className="absolute inset-y-0 left-0 w-1/3 animate-cta-shine bg-gradient-to-r from-transparent via-black/10 to-transparent" />
            </span>
            <span className="relative">{dict.nav.contact}</span>
            <span className="relative inline-flex overflow-hidden">
              <ArrowUpRight className="size-4 group-hover:animate-cta-arrow" />
            </span>
          </a>
          <button
            type="button"
            aria-label={open ? dict.nav.closeMenu : dict.nav.openMenu}
            onClick={() => setOpen((o) => !o)}
            className="grid size-10 place-items-center rounded-full border border-line-2 text-fg lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card absolute inset-x-4 top-20 rounded-3xl p-3 lg:hidden"
          >
            {[...links, { href: "#contact", label: dict.nav.contact }].map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i }}
                className="block rounded-2xl px-4 py-3 text-base text-fg hover:bg-white/5"
              >
                {l.label}
              </motion.a>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import "lenis/dist/lenis.css";
import "../globals.css";
import { SmoothScroll } from "@/components/smooth-scroll";
import { LOCALES, LOCALE_META, hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { I18nProvider } from "@/lib/i18n/provider";

const geistSans = localFont({
  src: "../fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      languages: Object.fromEntries(LOCALES.map((l) => [LOCALE_META[l].htmlLang, `/${l}`])),
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    // Variables de police sur <html> : le thème Tailwind (--font-sans, --font-mono) est défini
    // sur :root et doit pouvoir les lire, sinon les polices Geist ne s'appliquent jamais.
    <html lang={LOCALE_META[lang].htmlLang} className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <I18nProvider locale={lang} dict={dict}>
          <SmoothScroll>{children}</SmoothScroll>
        </I18nProvider>
      </body>
    </html>
  );
}

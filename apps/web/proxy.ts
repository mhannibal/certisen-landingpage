import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, hasLocale } from "@/lib/i18n/config";

/**
 * Choix de la langue (méthode officielle Next.js : Proxy + Accept-Language).
 * 1. langue choisie à la main dans le sélecteur (cookie) ;
 * 2. sinon, langue préférée du navigateur ;
 * 3. sinon, anglais.
 */
function getLocale(request: NextRequest) {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (saved && hasLocale(saved)) return saved;
  const headers = { "accept-language": request.headers.get("accept-language") ?? "" };
  const languages = new Negotiator({ headers }).languages();
  try {
    return match(languages, [...LOCALES], DEFAULT_LOCALE);
  } catch {
    // En-tête absent ou mal formé (ex. « * ») : langue par défaut.
    return DEFAULT_LOCALE;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathnameHasLocale = LOCALES.some((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`);
  if (pathnameHasLocale) return;

  request.nextUrl.pathname = `/${getLocale(request)}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  // Tout sauf les ressources internes et les fichiers (icon.svg, images…).
  matcher: ["/((?!_next|.*\\..*).*)"],
};

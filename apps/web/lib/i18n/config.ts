/** Langues du site. L'anglais est la langue par défaut. */
export const LOCALES = ["en", "fr", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Cookie qui retient la langue choisie à la main (prioritaire sur le navigateur). */
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const hasLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value);

/** Libellés du sélecteur de langue et formats régionaux (nombres). */
export const LOCALE_META: Record<Locale, { label: string; short: string; intl: string; htmlLang: string }> = {
  en: { label: "English", short: "EN", intl: "en-US", htmlLang: "en" },
  fr: { label: "Français", short: "FR", intl: "fr-FR", htmlLang: "fr" },
  zh: { label: "中文", short: "中文", intl: "zh-CN", htmlLang: "zh-CN" },
};

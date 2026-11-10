import "server-only";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en").then((m) => m.default),
  fr: () => import("./dictionaries/fr").then((m) => m.default),
  zh: () => import("./dictionaries/zh").then((m) => m.default),
};

export const getDictionary = (locale: Locale) => dictionaries[locale]();

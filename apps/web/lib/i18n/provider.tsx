"use client";

import { createContext, useContext, type ReactNode } from "react";
import { LOCALE_META, type Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

type I18n = { locale: Locale; intl: string; dict: Dictionary };

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dictionary; children: ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, intl: LOCALE_META[locale].intl, dict }}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n doit être utilisé dans <I18nProvider>");
  return ctx;
}

/** Raccourci : le dictionnaire de la langue courante. */
export const useDict = () => useI18n().dict;

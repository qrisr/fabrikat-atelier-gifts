/**
 * Localisation: typed message catalogues and Swiss formatting helpers.
 * Every visible string goes through `useI18n().m`.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { Lang, Localized } from "@/lib/catalog";
import { en, type Messages } from "@/lib/messages/en";

const catalogues: Record<Lang, Messages> = { en, de: en };

type I18n = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  m: Messages;
  /** Picks the current language from a bilingual catalogue string. */
  l: (value: Localized) => string;
  chf: (amount: number, options?: { decimals?: boolean }) => string;
  date: (iso: string | null | undefined) => string;
  dateTime: (iso: string | null | undefined) => string;
  number: (value: number) => string;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const value = useMemo(() => createI18n(lang, setLang), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export function createI18n(lang: Lang, setLang: (lang: Lang) => void = () => {}): I18n {
  const locale = "de-CH";
  const numberFormat = new Intl.NumberFormat(locale);
  return {
    lang,
    setLang,
    m: catalogues[lang],
    l: (value) => value[lang],
    chf: (amount, options = {}) => formatChf(amount, options.decimals ?? true),
    date: (iso) => formatSwissDate(iso),
    dateTime: (iso) => {
      if (!iso) return "–";
      const d = new Date(iso);
      return `${formatSwissDate(iso)}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    },
    number: (value) => numberFormat.format(value),
  };
}

/** CHF 1’234.50 — Swiss apostrophe grouping, always CHF. */
export function formatChf(amount: number, decimals = true): string {
  const formatted = new Intl.NumberFormat("de-CH", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(amount);
  return `CHF ${formatted}`;
}

/** DD.MM.YYYY, independent of the browser locale. */
export function formatSwissDate(iso: string | null | undefined): string {
  if (!iso) return "–";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (match && iso.length === 10) return `${match[3]}.${match[2]}.${match[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "–";
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

/** DE | EN switch; the choice is remembered in the browser. */
import type { Lang } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LANGS: Lang[] = ["de", "en"];

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, m } = useI18n();
  return (
    <div
      role="group"
      aria-label={m.language.label}
      className={cn(
        "inline-flex h-8 items-center rounded-full border border-border bg-background p-0.5",
        className,
      )}
    >
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={lang === code}
          title={m.language[code]}
          onClick={() => setLang(code)}
          className={cn(
            "h-7 min-w-9 rounded-full px-2.5 text-[0.6875rem] font-medium uppercase tracking-[0.08em] transition-colors",
            lang === code
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

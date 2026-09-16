/** Fabrikat Gift Atelier logo: a folded-paper parcel mark with the wordmark. */
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden="true">
      <rect
        x="1"
        y="1"
        width="38"
        height="38"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M8 16h24v16H8z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 12h28v4H6z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M20 12v20" stroke="var(--brand)" strokeWidth="1.6" />
      <path
        d="M20 12c-3-5-9-5-8-1 1 2 5 1 8 1zM20 12c3-5 9-5 8-1-1 2-5 1-8 1z"
        fill="none"
        stroke="var(--brand)"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const { m } = useI18n();
  return (
    <div
      className={cn("flex min-w-0 items-center gap-3", compact && "justify-center")}
      aria-label={m.meta.appName}
    >
      <LogoMark className={cn("shrink-0 text-foreground", compact && "size-7")} />
      <div className="min-w-0">
        <div className="font-display text-[1.2rem] uppercase leading-none tracking-[0.18em] text-foreground">
          {m.brand.wordmark}
        </div>
        <div className="mt-1.5 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {m.brand.subline}
        </div>
      </div>
    </div>
  );
}

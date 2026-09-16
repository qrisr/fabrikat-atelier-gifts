import { Check, PenLine } from "lucide-react";
import type { ReactNode } from "react";

import { ProductArt } from "@/components/product-art";
import type { GiftTemplate } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function TemplateCard({
  template,
  selected = false,
  budget,
  action,
}: {
  template: GiftTemplate;
  selected?: boolean;
  budget?: number;
  action: ReactNode;
}) {
  const { m, l, chf } = useI18n();
  const over = budget !== undefined ? template.price - budget : 0;

  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-sm border bg-card transition-all",
        selected ? "border-foreground shadow-[0_0_0_1px_var(--foreground)]" : "border-border hover:border-foreground/40",
      )}
    >
      <div className="relative">
        <ProductArt template={template} label={l(template.name)} />
        {selected && (
          <span className="absolute right-4 top-4 inline-flex h-7 items-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-medium text-background">
            <Check className="size-3.5" /> {m.gallery.selected}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col border-t border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-display text-2xl leading-tight">{l(template.name)}</h3>
            <p className="mt-1 text-sm italic text-muted-foreground">{l(template.tagline)}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display text-xl">{chf(template.price, { decimals: false })}</div>
            <div className="text-xs text-muted-foreground">{m.gallery.perSet}</div>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{l(template.description)}</p>
        <p className="mt-5 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {m.gallery.includes}
        </p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {template.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate">{l(item.name)}</span>
              {item.engravingSurcharge !== undefined && (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-brand">
                  <PenLine className="size-3" /> {m.gallery.engravable}
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-6">
          {budget !== undefined && (
            <p className={cn("mb-3 text-xs", over > 0 ? "text-tone-changes" : "text-tone-approved")}>
              {over > 0 ? m.gallery.overBudget(chf(over, { decimals: false })) : m.gallery.withinBudget}
            </p>
          )}
          {action}
        </div>
      </div>
    </article>
  );
}

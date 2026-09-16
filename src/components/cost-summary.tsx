/** Live cost estimate panel shown beside the setup steps. */
import type { ReactNode } from "react";

import { findTemplate } from "@/lib/catalog";
import type { Campaign } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import { estimateCost } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export function CostSummary({
  campaign,
  actualRecipients,
  detail = "basic",
  footer,
}: {
  campaign: Campaign;
  actualRecipients: number;
  /** basic: sets only · full: personalisation, logo and shipping lines. */
  detail?: "basic" | "full";
  footer?: ReactNode;
}) {
  const { m, l, chf, number } = useI18n();
  const template = findTemplate(campaign.templateId);
  const recipients = actualRecipients > 0 ? actualRecipients : campaign.recipientEstimate;
  const cost = estimateCost({ templateId: campaign.templateId, personalization: campaign.personalization, recipients });
  const budgetTotal = campaign.budgetPerRecipient * recipients;
  const comparable = detail === "full" ? cost.perRecipient : cost.setPrice;
  const difference = (comparable - campaign.budgetPerRecipient) * recipients;
  const total = detail === "full" ? cost.total : cost.setsTotal;

  return (
    <aside className="rounded-sm border border-border bg-card p-6 lg:sticky lg:top-8" aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">{m.summary.title}</p>
      <h2 className="mt-3 font-display text-2xl leading-tight">{campaign.name}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {m.occasion[campaign.occasion]} · {number(recipients)} {m.summary.recipients.toLowerCase()}
      </p>

      {!template ? (
        <p className="mt-6 border-t border-border pt-6 text-sm text-muted-foreground">{m.summary.noTemplate}</p>
      ) : (
        <>
          <dl className="mt-6 space-y-3 border-t border-border pt-6 text-sm">
            <Line label={`${m.summary.setPrice} · ${l(template.name)}`} value={chf(cost.setPrice)} />
            {detail === "full" && (
              <>
                {cost.wrapping > 0 && <Line label={m.summary.wrapping} value={`+ ${chf(cost.wrapping)}`} />}
                {cost.sticker > 0 && <Line label={m.summary.sticker} value={`+ ${chf(cost.sticker)}`} />}
                {cost.card > 0 && <Line label={m.summary.card} value={`+ ${chf(cost.card)}`} />}
                {cost.engravings.map((line) => {
                  const item = template.items.find((i) => i.id === line.itemId);
                  return (
                    <Line
                      key={line.itemId}
                      label={`${m.summary.engraving} · ${item ? l(item.name) : ""}`}
                      value={`+ ${chf(line.surcharge)}`}
                    />
                  );
                })}
              </>
            )}
            <Line label={m.summary.perRecipient} value={chf(comparable)} strong />
            <Line label={m.summary.recipients} value={`× ${number(recipients)}`} />
            {detail === "full" && (
              <>
                <Line label={m.summary.shipping} value={chf(cost.shippingTotal)} />
                {cost.logoSetup > 0 && <Line label={m.summary.logoSetup} value={chf(cost.logoSetup)} />}
              </>
            )}
          </dl>
          <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-foreground/80 pt-5">
            <span className="text-sm font-medium">{m.summary.total}</span>
            <span className="font-display text-3xl" data-testid="estimated-total">
              {chf(total)}
            </span>
          </div>
          <p
            className={cn(
              "mt-3 text-sm",
              difference > 0 ? "text-tone-changes" : "text-tone-approved",
            )}
          >
            {difference > 0
              ? m.summary.overBudget(chf(difference))
              : m.summary.underBudget(chf(Math.abs(difference)))}
            <span className="block text-xs text-muted-foreground">
              {m.summary.budgetTotal}: {chf(budgetTotal)}
            </span>
          </p>
        </>
      )}
      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        {actualRecipients > 0 ? m.summary.basedOnList : m.summary.basedOnEstimate} {m.summary.vatNote}
      </p>
      {footer && <div className="mt-6">{footer}</div>}
    </aside>
  );
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", strong && "font-medium")}>
      <dt className={cn("min-w-0", !strong && "text-muted-foreground")}>{label}</dt>
      <dd className="shrink-0 tabular-nums">{value}</dd>
    </div>
  );
}

/** Quote request: full campaign summary, cost breakdown, submission and review status. */
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Circle, Gift, Lock } from "lucide-react";
import { useState, type ReactNode } from "react";

import { EmptyState } from "@/components/empty-state";
import { CardPreview, ParcelPreview } from "@/components/gift-preview";
import { ProductArt } from "@/components/product-art";
import { StatusBadge } from "@/components/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { findCard, findSticker, findTemplate, findWrapping } from "@/lib/catalog";
import { type Campaign, type Recipient, isLocked } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import { VAT_RATE, estimateCost } from "@/lib/pricing";
import { actions, useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";

export function QuoteView({
  campaign,
  recipients,
  onSubmitted,
}: {
  campaign: Campaign;
  recipients: Recipient[];
  onSubmitted?: () => void;
}) {
  const { m } = useI18n();
  const { companies } = useAppState();
  const company = companies.find((c) => c.id === campaign.companyId);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [askRecipients, setAskRecipients] = useState(false);
  const template = findTemplate(campaign.templateId);
  const locked = isLocked(campaign);

  if (!template) {
    return (
      <EmptyState
        icon={Gift}
        eyebrow={m.quote.eyebrow}
        title={m.quote.title}
        description={m.quote.missingTemplate}
        action={{ label: m.quote.missingTemplateAction, to: `/campaigns/${campaign.id}/template` }}
      />
    );
  }

  const submit = () => {
    if (recipients.length === 0) {
      setAskRecipients(true);
      return;
    }
    if (actions.submitQuote(campaign.id)) {
      setJustSubmitted(true);
      onSubmitted?.();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-10">
      {locked ? (
        <ReviewStatus campaign={campaign} contactEmail={company?.contactEmail ?? ""} highlight={justSubmitted} />
      ) : (
        <header>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-brand">{m.quote.eyebrow}</p>
          <h1 className="font-display text-4xl">{m.quote.title}</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">{m.quote.intro}</p>
          {campaign.status === "changes_requested" && (
            <p className="mt-6 rounded-sm border border-tone-changes/30 bg-tone-changes/5 px-4 py-3 text-sm">
              {m.quote.statusPanel.changes_requested}
            </p>
          )}
        </header>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <Summary campaign={campaign} recipients={recipients} companyName={company?.name ?? ""} editable={!locked} />
        <div className="lg:sticky lg:top-8 lg:self-start">
          <CostBreakdownPanel campaign={campaign} recipients={recipients}>
            {!locked && (
              <>
                <Button size="lg" className="h-14 w-full text-base" onClick={submit} data-testid="submit-quote">
                  {m.quote.submit} <ArrowRight className="size-4" />
                </Button>
                <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                  <Lock className="mt-0.5 size-3.5 shrink-0" /> {m.quote.submitHint}
                </p>
              </>
            )}
          </CostBreakdownPanel>
        </div>
      </div>

      <AlertDialog open={askRecipients} onOpenChange={setAskRecipients}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-normal">{m.quote.noRecipientsTitle}</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">{m.quote.noRecipientsBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.quote.noRecipientsCancel}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link to="/campaigns/$campaignId/recipients" params={{ campaignId: campaign.id }}>
                {m.quote.noRecipientsAction}
              </Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReviewStatus({ campaign, contactEmail, highlight }: { campaign: Campaign; contactEmail: string; highlight: boolean }) {
  const { m, dateTime } = useI18n();
  const steps = [
    { key: "received", done: true },
    { key: "availability", done: campaign.status === "approved" || campaign.status === "changes_requested", active: campaign.status === "under_review" },
    { key: "personalization", done: campaign.status === "approved" || campaign.status === "changes_requested", active: campaign.status === "under_review" },
    { key: "offer", done: campaign.status === "approved", active: false },
  ] as const;

  return (
    <section
      className={cn(
        "grid gap-8 rounded-sm border border-border bg-card p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_22rem]",
        highlight && "animate-in fade-in slide-in-from-bottom-2 duration-500",
      )}
      data-testid="quote-confirmation"
    >
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">{m.quote.confirmationEyebrow}</p>
          <StatusBadge status={campaign.status} />
        </div>
        <h1 className="mt-4 font-display text-4xl leading-tight">{m.quote.confirmationTitle}</h1>
        <p className="mt-4 max-w-xl leading-7 text-muted-foreground">{m.quote.confirmationBody(contactEmail)}</p>
        <p className="mt-6 rounded-sm bg-secondary px-4 py-3 text-sm">{m.quote.statusPanel[campaign.status]}</p>
        {campaign.submittedAt && <p className="mt-4 text-xs text-muted-foreground">{m.quote.submittedAt(dateTime(campaign.submittedAt))}</p>}
        <Button asChild variant="outline" className="mt-6">
          <Link to="/">{m.quote.backToDashboard}</Link>
        </Button>
      </div>
      <ol className="space-y-5 border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
        {steps.map((step) => {
          const active = "active" in step && step.active;
          return (
            <li key={step.key} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border",
                  step.done && "border-tone-approved bg-tone-approved text-background",
                  active && "border-tone-review text-tone-review",
                )}
              >
                {step.done ? <Check className="size-3.5" /> : <Circle className={cn("size-2", active && "animate-pulse fill-current")} />}
              </span>
              <span className={cn("text-sm leading-6", !step.done && !active && "text-muted-foreground")}>{m.quote.timeline[step.key]}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Summary({
  campaign,
  recipients,
  companyName,
  editable,
}: {
  campaign: Campaign;
  recipients: Recipient[];
  companyName: string;
  editable: boolean;
}) {
  const { m, l, date, number } = useI18n();
  const template = findTemplate(campaign.templateId)!;
  const p = campaign.snapshot?.personalization ?? campaign.personalization;
  const engraved = template.items.filter((item) => item.engravingSurcharge !== undefined && p.engravings[item.id]?.enabled);
  const confirmed = recipients.filter((r) => r.status === "confirmed").length;
  const pending = recipients.length - confirmed;
  const edit = (step: "template" | "personalize" | "recipients" | "details") =>
    editable ? (
      <Link
        to={`/campaigns/$campaignId/${step}`}
        params={{ campaignId: campaign.id }}
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {m.quote.edit}
      </Link>
    ) : null;

  return (
    <div className="space-y-8">
      <Block title={m.quote.giftSet} action={edit("template")}>
        <div className="grid gap-6 sm:grid-cols-[14rem_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-sm border border-border">
            <ProductArt template={template} label={l(template.name)} />
          </div>
          <div>
            <h3 className="font-display text-2xl">{l(template.name)}</h3>
            <p className="mt-1 text-sm italic text-muted-foreground">{l(template.tagline)}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {template.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <span>{l(item.name)}</span>
                  <span className="text-muted-foreground">{item.maker}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Block>

      <Block title={m.quote.presentation} action={edit("personalize")}>
        <div className="grid gap-6 sm:grid-cols-[14rem_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-sm border border-border">
              <ParcelPreview personalization={p} />
            </div>
            <CardPreview personalization={p} companyName={companyName} placeholder={m.quote.noMessage} />
          </div>
          <dl className="grid content-start gap-4 text-sm">
            <Row label={m.quote.wrapping} value={l(findWrapping(p.wrappingId).name)} />
            <Row label={m.quote.sticker} value={l(findSticker(p.stickerId).name)} />
            <Row label={m.quote.card} value={l(findCard(p.cardId).name)} />
            <Row label={m.quote.message} value={p.cardMessage.trim() ? `«${p.cardMessage.trim()}»` : m.quote.noMessage} />
            <Row
              label={m.quote.logo}
              value={
                p.logoDataUrl ? (
                  <span className="flex items-center gap-3">
                    <img src={p.logoDataUrl} alt="" className="h-8 max-w-24 object-contain" />
                    <span className="truncate text-muted-foreground">{p.logoFileName}</span>
                  </span>
                ) : (
                  m.quote.noLogo
                )
              }
            />
            <Row
              label={m.quote.engravings}
              value={
                engraved.length === 0
                  ? m.quote.noEngravings
                  : engraved.map((item) => `${l(item.name)}: «${p.engravings[item.id]?.text || "–"}»`).join(" · ")
              }
            />
          </dl>
        </div>
      </Block>

      <Block title={m.quote.recipients} action={edit("recipients")}>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <Row label={m.quote.recipients} value={`${number(recipients.length)} · ${m.quote.recipientsDetail(confirmed, recipients.length)}`} />
          <Row label={m.quote.delivery} value={date(campaign.deliveryDate)} />
        </dl>
        {editable && pending > 0 && <p className="mt-4 text-sm text-muted-foreground">{m.quote.pendingAddresses(pending)}</p>}
      </Block>
    </div>
  );
}

function Block({ title, action, children }: { title: string; action: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-sm border border-border bg-card p-6">
      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-border pb-3">
        <h2 className="font-display text-2xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
}

function CostBreakdownPanel({ campaign, recipients, children }: { campaign: Campaign; recipients: Recipient[]; children: ReactNode }) {
  const { m, chf, number } = useI18n();
  const count = campaign.snapshot?.recipientCount ?? recipients.length;
  const cost = estimateCost({
    templateId: campaign.snapshot?.templateId ?? campaign.templateId,
    personalization: campaign.snapshot?.personalization ?? campaign.personalization,
    recipients: count,
  });
  const vat = Math.round(cost.total * VAT_RATE * 100) / 100;
  const n = number(count);

  return (
    <aside className="rounded-sm border border-border bg-card p-6" aria-labelledby="cost-title" data-testid="cost-breakdown">
      <h2 id="cost-title" className="font-display text-2xl">
        {m.quote.costTitle}
      </h2>
      <dl className="mt-5 space-y-3 text-sm">
        <Line label={m.quote.lineSets(n, chf(cost.setPrice))} value={chf(cost.setsTotal)} />
        {cost.personalizationPerRecipient > 0 && (
          <Line label={m.quote.linePersonalization(n, chf(cost.personalizationPerRecipient))} value={chf(cost.personalizationPerRecipient * count)} />
        )}
        {cost.logoSetup > 0 && <Line label={m.quote.lineLogo} value={chf(cost.logoSetup)} />}
        <Line label={m.quote.lineShipping(n, chf(cost.shippingPerRecipient))} value={chf(cost.shippingTotal)} />
      </dl>
      <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
        <Line label={m.quote.subtotal} value={chf(cost.total)} strong />
        <Line label={m.quote.vat} value={chf(vat)} />
      </dl>
      <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-foreground/80 pt-4">
        <span className="text-sm font-medium">{m.quote.totalInclVat}</span>
        <span className="font-display text-3xl" data-testid="quote-total">
          {chf(cost.total + vat)}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{m.quote.perRecipient(chf(cost.perRecipient))}</p>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">{m.quote.estimateNote}</p>
      {children && <div className="mt-6">{children}</div>}
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

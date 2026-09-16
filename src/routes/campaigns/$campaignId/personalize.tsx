import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, Gift, ImageUp, PenLine, Trash2 } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";

import { CostSummary } from "@/components/cost-summary";
import { EmptyState } from "@/components/empty-state";
import { CardPreview, EngravingPreview, ParcelPreview, Sticker } from "@/components/gift-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CARDS, STICKERS, WRAPPINGS, findTemplate } from "@/lib/catalog";
import { isLocked } from "@/lib/domain";
import { formatBytes, readAsDataUrl, validateLogo } from "@/lib/files";
import { useI18n } from "@/lib/i18n";
import { actions, useAppState } from "@/lib/store";
import { useCampaign } from "@/lib/use-campaign";
import { cn } from "@/lib/utils";

const MESSAGE_MAX = 280;

export const Route = createFileRoute("/campaigns/$campaignId/personalize")({
  component: PersonalizeStep,
});

function PersonalizeStep() {
  const { m, l, chf } = useI18n();
  const { campaignId } = Route.useParams();
  const { campaign, recipients } = useCampaign(campaignId);
  const { companies } = useAppState();
  if (!campaign) return null;

  const template = findTemplate(campaign.templateId);
  if (!template) {
    return (
      <EmptyState
        icon={Gift}
        eyebrow={m.personalize.eyebrow}
        title={m.personalize.title}
        description={m.personalize.needTemplate}
        action={{
          label: m.personalize.needTemplateAction,
          to: `/campaigns/${campaignId}/template`,
        }}
      />
    );
  }

  const locked = isLocked(campaign);
  const p = campaign.personalization;
  const company = companies.find((c) => c.id === campaign.companyId);
  const update = (patch: Partial<typeof p>) => actions.updatePersonalization(campaign.id, patch);
  const engravable = template.items.filter((item) => item.engravingSurcharge !== undefined);
  const priceTag = (amount: number) =>
    amount > 0 ? m.personalize.surcharge(chf(amount)) : m.personalize.included;

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="min-w-0">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          {m.personalize.eyebrow}
        </p>
        <h1 className="font-display text-4xl">{m.personalize.title}</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">{m.personalize.intro}</p>

        <fieldset disabled={locked} className="mt-10 space-y-12 disabled:opacity-70">
          <Section title={m.personalize.wrapping}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-5">
              {WRAPPINGS.map((wrapping) => (
                <Choice
                  key={wrapping.id}
                  selected={p.wrappingId === wrapping.id}
                  onSelect={() => update({ wrappingId: wrapping.id })}
                  title={l(wrapping.name)}
                  subtitle={priceTag(wrapping.surcharge)}
                >
                  <span
                    className="block h-16 w-full rounded-[2px]"
                    style={{
                      background:
                        wrapping.pattern === "dots"
                          ? `radial-gradient(${wrapping.ribbon}99 1px, transparent 1.3px) 0 0/10px 10px, ${wrapping.paper}`
                          : wrapping.pattern === "foil"
                            ? `repeating-linear-gradient(135deg, ${wrapping.paper} 0 8px, ${wrapping.ribbon}55 8px 9px)`
                            : wrapping.paper,
                      boxShadow: `inset 0 -10px 0 -4px ${wrapping.ribbon}`,
                    }}
                  />
                </Choice>
              ))}
            </div>
          </Section>

          <Section title={m.personalize.sticker}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-5">
              {STICKERS.map((sticker) => (
                <Choice
                  key={sticker.id}
                  selected={p.stickerId === sticker.id}
                  onSelect={() => update({ stickerId: sticker.id })}
                  title={l(sticker.name)}
                  subtitle={priceTag(sticker.surcharge)}
                >
                  <span className="grid h-16 place-items-center rounded-[2px] bg-secondary">
                    {sticker.motif === "none" ? (
                      <span className="size-10 rounded-full border border-dashed border-muted-foreground/40" />
                    ) : (
                      <svg viewBox="-22 -22 44 44" className="size-11" aria-hidden="true">
                        <Sticker sticker={sticker} cx={0} cy={0} />
                      </svg>
                    )}
                  </span>
                </Choice>
              ))}
            </div>
          </Section>

          <Section title={m.personalize.card}>
            <div className="grid gap-3 sm:grid-cols-3">
              {CARDS.map((card) => (
                <Choice
                  key={card.id}
                  selected={p.cardId === card.id}
                  onSelect={() => update({ cardId: card.id })}
                  title={l(card.name)}
                  subtitle={`${l(card.description)} · ${priceTag(card.surcharge)}`}
                />
              ))}
            </div>

            <div className="mt-8 grid gap-2.5">
              <Label htmlFor="card-message">{m.personalize.message}</Label>
              <Textarea
                id="card-message"
                rows={4}
                maxLength={MESSAGE_MAX}
                value={p.cardMessage}
                placeholder={m.personalize.messagePlaceholder}
                onChange={(event) => update({ cardMessage: event.target.value })}
                className="font-display text-lg leading-7 md:text-lg"
              />
              <p className="text-right text-xs text-muted-foreground">
                {m.personalize.messageCount(p.cardMessage.length, MESSAGE_MAX)}
              </p>
            </div>

            <LogoUpload
              logoDataUrl={p.logoDataUrl}
              logoFileName={p.logoFileName}
              disabled={locked}
              onChange={(logoDataUrl, logoFileName) => update({ logoDataUrl, logoFileName })}
            />
          </Section>

          <Section
            title={m.personalize.engraving}
            description={
              engravable.length ? m.personalize.engravingIntro : m.personalize.engravingNone
            }
          >
            <ul className="space-y-3">
              {engravable.map((item) => {
                const choice = p.engravings[item.id] ?? { enabled: false, text: "" };
                const max = item.engravingMaxLength ?? 12;
                const setChoice = (patch: Partial<typeof choice>) =>
                  update({ engravings: { ...p.engravings, [item.id]: { ...choice, ...patch } } });
                return (
                  <li
                    key={item.id}
                    className="rounded-sm border border-border bg-card p-5"
                    data-testid={`engraving-${item.id}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <Label
                        htmlFor={`engrave-${item.id}`}
                        className="flex min-w-0 items-center gap-3 font-normal"
                      >
                        <PenLine className="size-4 shrink-0 text-brand" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {m.personalize.engravingToggle(l(item.name))}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {m.personalize.surcharge(chf(item.engravingSurcharge ?? 0))}
                          </span>
                        </span>
                      </Label>
                      <Switch
                        id={`engrave-${item.id}`}
                        checked={choice.enabled}
                        onCheckedChange={(enabled) => setChoice({ enabled })}
                      />
                    </div>
                    {choice.enabled && (
                      <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-end">
                        <div className="grid gap-2.5">
                          <Label htmlFor={`engrave-text-${item.id}`}>
                            {m.personalize.engravingLabel}
                          </Label>
                          <Input
                            id={`engrave-text-${item.id}`}
                            value={choice.text}
                            maxLength={max}
                            placeholder={m.personalize.engravingPlaceholder}
                            onChange={(event) => setChoice({ text: event.target.value })}
                          />
                          <p className="text-xs text-muted-foreground">
                            {m.personalize.engravingHint(max)}
                          </p>
                        </div>
                        <EngravingPreview text={choice.text} kind={item.kind} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        </fieldset>
      </div>

      <div className="space-y-6 xl:sticky xl:top-8 xl:self-start">
        <section
          className="rounded-sm border border-border bg-card p-6"
          aria-label={m.personalize.preview}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            {m.personalize.preview}
          </p>
          <div className="mt-5 overflow-hidden rounded-sm">
            <ParcelPreview personalization={p} />
          </div>
          <div className="relative -mt-14 ml-auto w-[78%] pr-4">
            <CardPreview
              personalization={p}
              companyName={company?.name ?? ""}
              placeholder={m.personalize.messagePlaceholder.replace(/^e\.g\. /, "")}
            />
          </div>
        </section>
        <CostSummary
          campaign={campaign}
          actualRecipients={recipients.length}
          detail="full"
          footer={
            <Button asChild size="lg" className="w-full">
              <Link to="/campaigns/$campaignId/recipients" params={{ campaignId }}>
                {m.personalize.continue} <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 border-b border-border pb-3">
        <h2 className="font-display text-2xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Choice({
  selected,
  onSelect,
  title,
  subtitle,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative flex h-full flex-col gap-3 rounded-sm border bg-card p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed",
        selected
          ? "border-foreground shadow-[0_0_0_1px_var(--foreground)]"
          : "border-border hover:border-foreground/40",
      )}
    >
      {children}
      <span className="min-w-0 pr-5">
        <span className="block text-sm font-medium leading-5">{title}</span>
        <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">{subtitle}</span>
      </span>
      {selected && (
        <span className="absolute bottom-3 right-3 grid size-5 place-items-center rounded-full bg-foreground text-background">
          <Check className="size-3" />
        </span>
      )}
    </button>
  );
}

function LogoUpload({
  logoDataUrl,
  logoFileName,
  disabled,
  onChange,
}: {
  logoDataUrl: string | null;
  logoFileName: string | null;
  disabled: boolean;
  onChange: (dataUrl: string | null, fileName: string | null) => void;
}) {
  const { m } = useI18n();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const problem = validateLogo(file);
    if (problem) {
      setError(
        problem.code === "type"
          ? m.personalize.logoErrors.type(problem.type)
          : problem.code === "size"
            ? m.personalize.logoErrors.size(formatBytes(problem.bytes))
            : m.personalize.logoErrors.empty,
      );
      return;
    }
    try {
      onChange(await readAsDataUrl(file), file.name);
      setError(null);
    } catch {
      setError(m.personalize.logoErrors.read);
    }
  }

  return (
    <div className="mt-8 grid gap-2.5">
      <Label htmlFor={inputId}>{m.personalize.logo}</Label>
      <div className="flex flex-wrap items-center gap-4 rounded-sm border border-dashed border-border bg-card p-4">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-sm bg-secondary">
          {logoDataUrl ? (
            <img src={logoDataUrl} alt="" className="max-h-12 max-w-12 object-contain" />
          ) : (
            <ImageUp className="size-5 text-muted-foreground" strokeWidth={1.5} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{logoFileName ?? m.personalize.logoHint}</p>
          {logoFileName && (
            <p className="text-xs text-muted-foreground">{m.personalize.logoHint}</p>
          )}
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            {logoDataUrl ? m.personalize.logoReplace : m.personalize.logoUpload}
          </Button>
          {logoDataUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null, null)}
              aria-label={m.personalize.logoRemove}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-sm border border-tone-changes/30 bg-tone-changes/5 px-3 py-2 text-sm text-tone-changes"
        >
          {error}
        </p>
      )}
    </div>
  );
}

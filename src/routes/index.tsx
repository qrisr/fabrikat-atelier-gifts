import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Plus, Sparkles, Users, Wallet } from "lucide-react";
import { useMemo } from "react";

import { EmptyState, PageContainer, PageIntro } from "@/components/empty-state";
import { WelcomeIllustration } from "@/components/illustrations";
import { ProductArt } from "@/components/product-art";
import { CopyButton, useConfirmUrl } from "@/components/recipients/recipients-manager";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { nextStep } from "@/lib/campaign-flow";
import { findTemplate } from "@/lib/catalog";
import type { Campaign } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import { recipientCount, useAppState } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kampagnen — Fabrikat Gift Atelier" },
      {
        name: "description",
        content:
          "Hochwertige Jahresendgeschenke für Ihr Unternehmen planen und verwalten — mit Fabrikat.",
      },
      { property: "og:title", content: "Kampagnen — Fabrikat Gift Atelier" },
      {
        property: "og:description",
        content:
          "Hochwertige Jahresendgeschenke für Ihr Unternehmen planen und verwalten — mit Fabrikat.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { m } = useI18n();
  const state = useAppState();
  const company = state.companies.find((c) => c.id === state.activeCompanyId);
  const campaigns = useMemo(
    () =>
      state.campaigns
        .filter((c) => c.companyId === state.activeCompanyId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [state.campaigns, state.activeCompanyId],
  );
  const firstName = company?.contactName.split(" ")[0] ?? "";

  return (
    <PageContainer>
      <PageIntro
        eyebrow={m.dashboard.eyebrow}
        title={m.dashboard.greeting(firstName)}
        description={m.dashboard.intro}
        aside={
          campaigns.length > 0 && (
            <Button asChild size="lg">
              <Link to="/campaigns/new">
                <Plus className="size-4" /> {m.dashboard.newCampaign}
              </Link>
            </Button>
          )
        }
      />

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Plus}
          illustration={<WelcomeIllustration className="mb-8" />}
          eyebrow={m.dashboard.emptyEyebrow}
          title={m.dashboard.emptyTitle}
          description={m.dashboard.emptyBody}
          action={{ label: m.dashboard.emptyAction, to: "/campaigns/new" }}
        >
          <ol className="mx-auto mt-10 grid max-w-xl gap-3 text-left text-xs text-muted-foreground sm:grid-cols-4">
            {m.dashboard.emptySteps.map((step, index) => (
              <li key={step} className="flex gap-2 sm:flex-col sm:gap-1.5">
                <span className="font-display text-base text-brand">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </EmptyState>
      ) : (
        <section aria-labelledby="campaigns-heading">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="campaigns-heading" className="font-display text-2xl">
              {m.dashboard.listTitle}
            </h2>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-brand" /> {m.dashboard.season} ·{" "}
              {m.dashboard.count(campaigns.length)}
            </p>
          </div>
          <ul className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
            {campaigns.map((campaign) => (
              <li key={campaign.id}>
                <CampaignCard campaign={campaign} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageContainer>
  );
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const { m, l, chf, date, number } = useI18n();
  const state = useAppState();
  const template = findTemplate(campaign.templateId);
  const own = state.recipients.filter((r) => r.campaignId === campaign.id);
  const actual = own.length;
  const confirmed = own.filter((r) => r.status === "confirmed").length;
  const count = recipientCount(state, campaign);
  const confirmUrl = useConfirmUrl();
  const next = nextStep(campaign, actual);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-sm border border-border bg-card transition-shadow hover:shadow-[0_18px_40px_-28px_rgba(58,46,37,0.45)]">
      <div className="relative border-b border-border">
        {template ? (
          <ProductArt template={template} label={l(template.name)} crop />
        ) : (
          <div className="grid aspect-[400/180] place-items-center bg-secondary text-sm text-muted-foreground">
            {m.dashboard.noTemplate}
          </div>
        )}
        <StatusBadge status={campaign.status} className="absolute left-4 top-4 bg-card/95" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
          {m.occasion[campaign.occasion]}
          {template && ` · ${l(template.name)}`}
        </p>
        <h3 className="mt-2 font-display text-2xl leading-tight">{campaign.name}</h3>
        <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-5 text-sm">
          <Meta
            icon={CalendarDays}
            label={m.dashboard.delivery}
            value={date(campaign.deliveryDate)}
          />
          <Meta icon={Users} label={m.dashboard.recipients} value={number(count)} />
          <Meta
            icon={Wallet}
            label={m.dashboard.budget}
            value={chf(campaign.budgetPerRecipient, { decimals: false })}
          />
        </dl>
        <div className="mt-5 flex items-center gap-3" data-testid="address-progress">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">
                {actual > 0 ? m.dashboard.addresses(confirmed, actual) : m.dashboard.noAddressesYet}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-tone-approved transition-[width] duration-500"
                style={{ width: `${actual ? (confirmed / actual) * 100 : 0}%` }}
              />
            </div>
          </div>
          <CopyButton
            value={confirmUrl(campaign.shareToken)}
            label={m.dashboard.copyLink}
            iconOnly
          />
        </div>
        <Link
          to={`/campaigns/$campaignId/${next.step}`}
          params={{ campaignId: campaign.id }}
          className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5 text-sm font-medium text-foreground transition-colors hover:text-brand"
        >
          {m.dashboard.next[next.key]}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}

function Meta({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[0.6875rem] uppercase tracking-[0.08em] text-muted-foreground">
        <Icon className="size-3.5 shrink-0" strokeWidth={1.6} />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="mt-1.5 truncate font-medium">{value}</dd>
    </div>
  );
}

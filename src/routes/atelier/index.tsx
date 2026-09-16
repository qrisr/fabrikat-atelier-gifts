import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Lock, Mail } from "lucide-react";
import { useMemo } from "react";

import { EmptyState, PageContainer, PageIntro } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { findTemplate } from "@/lib/catalog";
import type { Campaign } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import { estimateCost } from "@/lib/pricing";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/atelier/")({
  head: () => ({
    meta: [{ title: "Atelier pipeline — Fabrikat" }, { name: "robots", content: "noindex" }],
  }),
  component: Pipeline,
});

const COLUMNS = ["submitted", "under_review", "changes_requested", "approved"] as const;

function Pipeline() {
  const { m, chf } = useI18n();
  const state = useAppState();

  const byStatus = useMemo(() => {
    const value = (c: Campaign) => {
      const count =
        c.snapshot?.recipientCount ||
        state.recipients.filter((r) => r.campaignId === c.id).length ||
        c.recipientEstimate;
      return estimateCost({
        templateId: c.snapshot?.templateId ?? c.templateId,
        personalization: c.snapshot?.personalization ?? c.personalization,
        recipients: count,
      }).total;
    };
    return COLUMNS.map((status) => {
      const items = state.campaigns
        .filter((c) => c.status === status)
        .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""))
        .map((c) => ({ campaign: c, value: value(c) }));
      return { status, items, total: items.reduce((sum, i) => sum + i.value, 0) };
    });
  }, [state.campaigns, state.recipients]);

  if (!state.isStaff) {
    return (
      <PageContainer>
        <EmptyState
          icon={Lock}
          eyebrow={m.atelier.eyebrow}
          title={m.atelier.title}
          description={m.atelier.notStaff}
        />
      </PageContainer>
    );
  }

  const pipelineTotal = byStatus
    .filter((c) => c.status !== "approved")
    .reduce((sum, c) => sum + c.total, 0);

  return (
    <PageContainer>
      <PageIntro
        eyebrow={m.atelier.eyebrow}
        title={m.atelier.title}
        description={m.atelier.intro}
        aside={
          <div className="flex flex-col items-start gap-3 md:items-end">
            <p className="font-display text-2xl">
              {m.atelier.totalValue(chf(pipelineTotal, { decimals: false }))}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/atelier/emails">
                <Mail className="size-4" /> {m.atelier.emails}
              </Link>
            </Button>
          </div>
        }
      />
      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        {byStatus.map((column) => (
          <section
            key={column.status}
            className="rounded-sm border border-border bg-secondary/40"
            data-testid={`pipeline-${column.status}`}
          >
            <header className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium">
                {m.atelier.columns[column.status]}{" "}
                <span className="text-muted-foreground">· {column.items.length}</span>
              </h2>
              <span className="text-xs tabular-nums text-muted-foreground">
                {chf(column.total, { decimals: false })}
              </span>
            </header>
            <ul className="space-y-3 p-3">
              {column.items.length === 0 && (
                <li className="px-1 py-6 text-center text-xs text-muted-foreground">
                  {m.atelier.empty}
                </li>
              )}
              {column.items.map(({ campaign, value }) => {
                const company = state.companies.find((c) => c.id === campaign.companyId);
                const count =
                  campaign.snapshot?.recipientCount ||
                  state.recipients.filter((r) => r.campaignId === campaign.id).length ||
                  campaign.recipientEstimate;
                return (
                  <li key={campaign.id}>
                    <Link
                      to="/campaigns/$campaignId/quote"
                      params={{ campaignId: campaign.id }}
                      className="group block rounded-sm border border-border bg-card p-4 transition-shadow hover:shadow-md"
                    >
                      <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                        {company?.name}
                      </p>
                      <p className="mt-1 flex items-start justify-between gap-2 font-display text-lg leading-snug">
                        {campaign.name}
                        <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                      </p>
                      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <dt className="text-muted-foreground">{m.atelier.value}</dt>
                          <dd className="font-medium tabular-nums">
                            {chf(value, { decimals: false })}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">{m.atelier.recipients}</dt>
                          <dd className="font-medium">{count}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">{m.atelier.delivery}</dt>
                          <DeliveryDate iso={campaign.deliveryDate} />
                        </div>
                      </dl>
                      <p className="mt-2 truncate text-xs text-muted-foreground">
                        {
                          findTemplate(campaign.snapshot?.templateId ?? campaign.templateId)?.name
                            .en
                        }
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </PageContainer>
  );
}

function DeliveryDate({ iso }: { iso: string }) {
  const { date } = useI18n();
  return <dd className="font-medium">{date(iso)}</dd>;
}

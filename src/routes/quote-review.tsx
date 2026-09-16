import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileCheck2 } from "lucide-react";
import { useMemo } from "react";
import { z } from "zod";

import { CampaignPicker, resolveCampaign } from "@/components/campaign-picker";
import { EmptyState, PageContainer, PageIntro } from "@/components/empty-state";
import { QuoteView } from "@/components/quote/quote-view";
import { useI18n } from "@/lib/i18n";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/quote-review")({
  validateSearch: z.object({ campaign: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Quote Review — Fabrikat Gift Atelier" },
      { name: "description", content: "Review the details and quotation for your Fabrikat gifting campaign." },
    ],
  }),
  component: Page,
});

function Page() {
  const { m } = useI18n();
  const t = m.pages.quoteReview;
  const navigate = useNavigate();
  const { campaign: requested } = Route.useSearch();
  const state = useAppState();
  const campaigns = useMemo(
    () => state.campaigns.filter((c) => c.companyId === state.activeCompanyId),
    [state.campaigns, state.activeCompanyId],
  );
  const campaign = resolveCampaign(campaigns, requested);
  const recipients = useMemo(
    () => state.recipients.filter((r) => r.campaignId === campaign?.id),
    [state.recipients, campaign?.id],
  );

  return (
    <PageContainer>
      <PageIntro
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        aside={
          campaign && (
            <CampaignPicker
              campaigns={campaigns}
              value={campaign.id}
              onChange={(id) => void navigate({ to: "/quote-review", search: { campaign: id } })}
            />
          )
        }
      />
      {campaign ? (
        <QuoteView key={campaign.id} campaign={campaign} recipients={recipients} />
      ) : (
        <EmptyState
          icon={FileCheck2}
          eyebrow={t.emptyEyebrow}
          title={t.emptyTitle}
          description={t.emptyBody}
          action={{ label: t.emptyAction, to: "/campaigns/new" }}
        />
      )}
    </PageContainer>
  );
}

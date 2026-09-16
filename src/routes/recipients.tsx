import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useMemo } from "react";
import { z } from "zod";

import { CampaignPicker, resolveCampaign } from "@/components/campaign-picker";
import { EmptyState, PageContainer, PageIntro } from "@/components/empty-state";
import { RecipientsManager } from "@/components/recipients/recipients-manager";
import { useI18n } from "@/lib/i18n";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/recipients")({
  validateSearch: z.object({ campaign: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Recipient Manager — Fabrikat Gift Atelier" },
      { name: "description", content: "Collect and confirm recipient addresses for your Fabrikat gifting campaign." },
    ],
  }),
  component: Page,
});

function Page() {
  const { m } = useI18n();
  const t = m.pages.recipients;
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
              onChange={(id) => void navigate({ to: "/recipients", search: { campaign: id } })}
            />
          )
        }
      />
      {campaign ? (
        <RecipientsManager campaign={campaign} recipients={recipients} />
      ) : (
        <EmptyState
          icon={Users}
          eyebrow={t.emptyEyebrow}
          title={t.emptyTitle}
          description={t.emptyBody}
          action={{ label: t.emptyAction, to: "/campaigns/new" }}
        />
      )}
    </PageContainer>
  );
}

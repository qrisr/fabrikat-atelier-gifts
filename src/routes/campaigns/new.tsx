import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { CampaignDetailsForm, earliestDeliveryDate } from "@/components/campaign-details-form";
import { PageContainer, PageIntro } from "@/components/empty-state";
import { findTemplate } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { actions } from "@/lib/store";

export const Route = createFileRoute("/campaigns/new")({
  validateSearch: z.object({ template: z.string().optional() }),
  head: () => ({ meta: [{ title: "New campaign — Fabrikat Gift Atelier" }] }),
  component: NewCampaign,
});

function NewCampaign() {
  const { m } = useI18n();
  const navigate = useNavigate();
  const { template } = Route.useSearch();
  const preselected = findTemplate(template);
  const year = new Date().getFullYear();
  const suggestedDate =
    `${year}-12-10` >= earliestDeliveryDate() ? `${year}-12-10` : earliestDeliveryDate();

  return (
    <PageContainer>
      <div className="mx-auto max-w-2xl">
        <PageIntro
          eyebrow={m.details.newEyebrow}
          title={m.details.newTitle}
          description={m.details.newIntro}
        />
        <CampaignDetailsForm
          submitLabel={m.details.submitNew}
          defaultValues={{
            name: "",
            occasion: "year_end",
            recipientEstimate: 25,
            budgetPerRecipient: preselected?.price ?? 120,
            deliveryDate: suggestedDate,
          }}
          onSubmit={(values) => {
            const id = actions.createCampaign(values);
            if (preselected) actions.selectTemplate(id, preselected.id);
            void navigate({ to: "/campaigns/$campaignId/template", params: { campaignId: id } });
          }}
        />
      </div>
    </PageContainer>
  );
}

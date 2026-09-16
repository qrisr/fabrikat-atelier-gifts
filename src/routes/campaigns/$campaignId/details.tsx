import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { CampaignDetailsForm } from "@/components/campaign-details-form";
import { CostSummary } from "@/components/cost-summary";
import { isLocked } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import { actions } from "@/lib/store";
import { useCampaign } from "@/lib/use-campaign";

export const Route = createFileRoute("/campaigns/$campaignId/details")({
  component: DetailsStep,
});

function DetailsStep() {
  const { m } = useI18n();
  const navigate = useNavigate();
  const { campaignId } = Route.useParams();
  const { campaign, recipients } = useCampaign(campaignId);
  if (!campaign) return null;
  const locked = isLocked(campaign);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="max-w-2xl">
        <h1 className="mb-8 font-display text-4xl">{m.details.editTitle}</h1>
        <CampaignDetailsForm
          key={campaign.id}
          disabled={locked}
          enforceLeadTime={false}
          submitLabel={m.flow.continue}
          defaultValues={{
            name: campaign.name,
            occasion: campaign.occasion,
            recipientEstimate: campaign.recipientEstimate,
            budgetPerRecipient: campaign.budgetPerRecipient,
            deliveryDate: campaign.deliveryDate,
          }}
          onSubmit={(values) => {
            actions.updateDetails(campaign.id, values);
            void navigate({ to: "/campaigns/$campaignId/template", params: { campaignId } });
          }}
        />
      </section>
      <CostSummary campaign={campaign} actualRecipients={recipients.length} />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { RecipientsManager } from "@/components/recipients/recipients-manager";
import { useI18n } from "@/lib/i18n";
import { useCampaign } from "@/lib/use-campaign";

export const Route = createFileRoute("/campaigns/$campaignId/recipients")({
  component: RecipientsStep,
});

function RecipientsStep() {
  const { m } = useI18n();
  const { campaignId } = Route.useParams();
  const { campaign, recipients } = useCampaign(campaignId);
  if (!campaign) return null;

  return (
    <div>
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
        {m.recipients.eyebrow}
      </p>
      <h1 className="font-display text-4xl">{m.recipients.title}</h1>
      <p className="mb-10 mt-4 max-w-2xl text-muted-foreground">{m.recipients.intro}</p>
      <RecipientsManager campaign={campaign} recipients={recipients} />
    </div>
  );
}

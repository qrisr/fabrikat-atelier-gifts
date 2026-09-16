import { createFileRoute } from "@tanstack/react-router";

import { QuoteView } from "@/components/quote/quote-view";
import { useCampaign } from "@/lib/use-campaign";

export const Route = createFileRoute("/campaigns/$campaignId/quote")({
  component: QuoteStep,
});

function QuoteStep() {
  const { campaignId } = Route.useParams();
  const { campaign, recipients } = useCampaign(campaignId);
  if (!campaign) return null;
  return <QuoteView campaign={campaign} recipients={recipients} />;
}

/** Campaign plus its recipients from the store. */
import { useMemo } from "react";

import { useAppState } from "@/lib/store";

export function useCampaign(campaignId: string) {
  const state = useAppState();
  const campaign = state.campaigns.find((c) => c.id === campaignId);
  const recipients = useMemo(
    () => state.recipients.filter((r) => r.campaignId === campaignId),
    [state.recipients, campaignId],
  );
  return { campaign, recipients };
}

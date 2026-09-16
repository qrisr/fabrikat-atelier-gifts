/**
 * Browser side of the integrations: calls the server functions after
 * submissions, status changes and new recipients, and reports the outcome.
 */
import { toast } from "sonner";

import { getRepository } from "@/lib/data";
import type { CampaignStatus } from "@/lib/domain";
import type { Messages } from "@/lib/messages/en";
import { getState } from "@/lib/store";
import {
  inviteRecipientsFn,
  quoteSubmittedFn,
  statusChangedFn,
} from "@/services/integrations.functions";

type Outcome = { status: "sent" | "skipped" | "dry_run" | "failed"; detail?: string };

async function base(campaignId: string) {
  const state = getState();
  const accessToken = await getRepository().getAccessToken();
  const campaign = state.campaigns.find((c) => c.id === campaignId);
  const company = state.companies.find((c) => c.id === campaign?.companyId);
  return {
    campaignId,
    accessToken,
    demo:
      state.backend === "local" && campaign && company
        ? {
            campaign,
            company,
            recipients: state.recipients.filter((r) => r.campaignId === campaignId),
          }
        : null,
  };
}

function report(m: Messages, outcomes: Array<Outcome | undefined>) {
  const list = outcomes.filter((o): o is Outcome => Boolean(o));
  if (list.some((o) => o.status === "failed")) {
    toast.error(m.integrations.failed, {
      description: list.find((o) => o.status === "failed")?.detail,
    });
  } else if (list.some((o) => o.status === "dry_run")) {
    toast.message(m.integrations.dryRun);
  }
}

export async function afterQuoteSubmitted(campaignId: string, m: Messages) {
  try {
    const result = await quoteSubmittedFn({ data: await base(campaignId) });
    if (!result.ok) {
      toast.error(m.integrations.failed, { description: result.error });
      return;
    }
    if ("sheets" in result) report(m, [result.sheets, result.pipeline, result.email]);
  } catch (error) {
    console.error(error);
    toast.error(m.integrations.failed);
  }
}

export async function afterStatusChanged(campaignId: string, status: CampaignStatus, m: Messages) {
  try {
    const result = await statusChangedFn({ data: { ...(await base(campaignId)), status } });
    if (!result.ok) {
      toast.error(m.integrations.failed, { description: result.error });
      return;
    }
    if ("email" in result) report(m, [result.email, result.pipeline, result.sheets]);
  } catch (error) {
    console.error(error);
    toast.error(m.integrations.failed);
  }
}

/** Sends confirmation emails; returns the ids whose email actually went out. */
export async function inviteRecipients(campaignId: string, recipientIds: string[], m: Messages) {
  if (recipientIds.length === 0) return [];
  try {
    const result = await inviteRecipientsFn({
      data: { ...(await base(campaignId)), recipientIds },
    });
    if (!result.ok) {
      toast.error(m.integrations.inviteFailed, { description: result.error });
      return [];
    }
    if (result.email.status === "sent") {
      toast.success(m.integrations.invitesSent(result.invited.length));
      return result.invited;
    }
    report(m, [result.email]);
    return [];
  } catch (error) {
    console.error(error);
    toast.error(m.integrations.inviteFailed);
    return [];
  }
}

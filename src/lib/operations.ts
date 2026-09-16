/**
 * Pure state transitions shared by the browser repository and optimistic
 * updates. The Supabase RPCs (submit_quote, confirm_address) mirror these rules.
 */
import type { CampaignStatus } from "@/lib/domain";
import { isLocked, newId, newToken } from "@/lib/domain";
import type {
  ConfirmPayload,
  ConfirmResult,
  ConfirmationData,
  PersistedData,
  SubmitResult,
} from "@/lib/data/types";
import { estimateCost } from "@/lib/pricing";
import { isSwissPostalCode } from "@/lib/swiss";

const now = () => new Date().toISOString();

export function submitQuote(
  data: PersistedData,
  campaignId: string,
): { result: SubmitResult; data: PersistedData } {
  const campaign = data.campaigns.find((c) => c.id === campaignId);
  if (!campaign || isLocked(campaign)) return { result: { ok: false, reason: "locked" }, data };
  if (!campaign.templateId) return { result: { ok: false, reason: "no_template" }, data };
  const recipientCount = data.recipients.filter((r) => r.campaignId === campaignId).length;
  if (recipientCount === 0) return { result: { ok: false, reason: "no_recipients" }, data };

  const cost = estimateCost({
    templateId: campaign.templateId,
    personalization: campaign.personalization,
    recipients: recipientCount,
  });
  const submitted = {
    ...campaign,
    status: "submitted" as const,
    submittedAt: now(),
    updatedAt: now(),
    snapshot: {
      templateId: campaign.templateId,
      personalization: campaign.personalization,
      recipientCount,
      budgetPerRecipient: campaign.budgetPerRecipient,
      deliveryDate: campaign.deliveryDate,
      totals: { perRecipient: cost.perRecipient, total: cost.total },
    },
  };
  return {
    result: { ok: true, campaign: submitted },
    data: { ...data, campaigns: data.campaigns.map((c) => (c.id === campaignId ? submitted : c)) },
  };
}

export function setStatus(
  data: PersistedData,
  campaignId: string,
  status: CampaignStatus,
): PersistedData {
  return {
    ...data,
    campaigns: data.campaigns.map((c) =>
      c.id === campaignId ? { ...c, status, updatedAt: now() } : c,
    ),
  };
}

export function getConfirmation(data: PersistedData, token: string): ConfirmationData | null {
  const recipient = data.recipients.find((r) => r.token === token);
  const campaign = data.campaigns.find(
    (c) => c.shareToken === token || c.id === recipient?.campaignId,
  );
  if (!campaign) return null;
  const company = data.companies.find((c) => c.id === campaign.companyId);
  return {
    campaign: {
      id: campaign.id,
      templateId: campaign.templateId,
      deliveryDate: campaign.deliveryDate,
      status: campaign.status,
      companyName: company?.name ?? "",
    },
    recipient: recipient
      ? {
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          email: recipient.email,
          address: recipient.address,
          preferences: recipient.preferences,
        }
      : null,
  };
}

export function confirmAddress(
  data: PersistedData,
  token: string,
  payload: ConfirmPayload,
): { result: ConfirmResult; data: PersistedData } {
  const a = payload.address;
  if (!a.street.trim() || !a.city.trim() || !isSwissPostalCode(a.postalCode))
    return { result: "error", data };
  const confirmedAt = now();
  const apply = (recipientId: string) => ({
    result: "confirmed" as const,
    data: {
      ...data,
      recipients: data.recipients.map((r) =>
        r.id === recipientId
          ? {
              ...r,
              ...(isLocked(data.campaigns.find((c) => c.id === r.campaignId) ?? { status: "draft" })
                ? {}
                : {
                    firstName: payload.firstName,
                    lastName: payload.lastName,
                    email: payload.email,
                  }),
              address: payload.address,
              preferences: payload.preferences,
              status: "confirmed" as const,
              confirmedAt,
            }
          : r,
      ),
    },
  });

  const personal = data.recipients.find((r) => r.token === token);
  if (personal) return apply(personal.id);

  const campaign = data.campaigns.find((c) => c.shareToken === token);
  if (!campaign) return { result: "not_found", data };
  const existing = data.recipients.find(
    (r) =>
      r.campaignId === campaign.id && r.email.toLowerCase() === payload.email.trim().toLowerCase(),
  );
  if (existing) return apply(existing.id);
  if (isLocked(campaign)) return { result: "closed", data };

  return {
    result: "confirmed",
    data: {
      ...data,
      recipients: [
        ...data.recipients,
        {
          id: newId(),
          campaignId: campaign.id,
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          company: "",
          address: payload.address,
          preferences: payload.preferences,
          status: "confirmed",
          token: newToken(),
          confirmedAt,
          createdAt: confirmedAt,
        },
      ],
    },
  };
}

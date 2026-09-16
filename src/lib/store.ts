/**
 * Application state: companies, campaigns, recipients.
 * External store read via useSyncExternalStore. Persistence is attached
 * through a Repository (see src/lib/data) — the store itself stays synchronous.
 */
import { useSyncExternalStore } from "react";

import {
  type Campaign,
  type CampaignStatus,
  type Company,
  type Personalization,
  type Recipient,
  defaultPersonalization,
  isLocked,
  newId,
  newToken,
} from "@/lib/domain";
import { estimateCost } from "@/lib/pricing";
import { seedCampaigns, seedRecipients } from "@/lib/seed";

export type AppState = {
  companies: Company[];
  activeCompanyId: string;
  campaigns: Campaign[];
  recipients: Recipient[];
};

export type CampaignDetails = Pick<
  Campaign,
  "name" | "occasion" | "recipientEstimate" | "budgetPerRecipient" | "deliveryDate"
>;

export type RecipientInput = Omit<Recipient, "id" | "campaignId" | "token" | "createdAt" | "confirmedAt" | "status"> &
  Partial<Pick<Recipient, "status">>;

type Listener = () => void;

const listeners = new Set<Listener>();
let state: AppState = initialState();

export function initialState(): AppState {
  return {
    companies: [
      { id: "alpen-co", name: "Alpen & Co. AG", initials: "AC", contactName: "Anna Keller", contactEmail: "anna.keller@alpen-co.ch" },
      { id: "seeblick", name: "Seeblick Treuhand GmbH", initials: "ST", contactName: "Marco Brunner", contactEmail: "m.brunner@seeblick-treuhand.ch" },
    ],
    activeCompanyId: "alpen-co",
    campaigns: seedCampaigns,
    recipients: seedRecipients,
  };
}

export function getState(): AppState {
  return state;
}

export function setState(next: AppState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function update(fn: (draft: AppState) => AppState) {
  setState(fn(state));
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverSnapshot = initialState();

/** Returns the whole state; its identity only changes on updates. Derive with useMemo. */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, () => serverSnapshot);
}

const now = () => new Date().toISOString();

function patchCampaign(id: string, fn: (c: Campaign) => Campaign, options: { allowLocked?: boolean } = {}) {
  update((s) => ({
    ...s,
    campaigns: s.campaigns.map((c) => {
      if (c.id !== id) return c;
      if (isLocked(c) && !options.allowLocked) return c;
      return { ...fn(c), updatedAt: now() };
    }),
  }));
}

export const actions = {
  setActiveCompany(companyId: string) {
    update((s) => ({ ...s, activeCompanyId: companyId }));
  },

  createCampaign(details: CampaignDetails): string {
    const id = newId();
    const campaign: Campaign = {
      id,
      companyId: state.activeCompanyId,
      ...details,
      templateId: null,
      personalization: defaultPersonalization(),
      status: "draft",
      shareToken: newToken(),
      submittedAt: null,
      snapshot: null,
      createdAt: now(),
      updatedAt: now(),
    };
    update((s) => ({ ...s, campaigns: [campaign, ...s.campaigns] }));
    return id;
  },

  updateDetails(id: string, details: Partial<CampaignDetails>) {
    patchCampaign(id, (c) => ({ ...c, ...details }));
  },

  selectTemplate(id: string, templateId: string) {
    patchCampaign(id, (c) =>
      c.templateId === templateId ? c : { ...c, templateId, personalization: { ...c.personalization, engravings: {} } },
    );
  },

  updatePersonalization(id: string, patch: Partial<Personalization>) {
    patchCampaign(id, (c) => ({ ...c, personalization: { ...c.personalization, ...patch } }));
  },

  addRecipients(campaignId: string, inputs: RecipientInput[]): Recipient[] {
    const campaign = state.campaigns.find((c) => c.id === campaignId);
    if (!campaign || isLocked(campaign)) return [];
    const created = inputs.map<Recipient>((input) => ({
      ...input,
      id: newId(),
      campaignId,
      token: newToken(),
      status: input.status ?? "pending",
      confirmedAt: null,
      createdAt: now(),
    }));
    update((s) => ({ ...s, recipients: [...s.recipients, ...created] }));
    return created;
  },

  updateRecipient(recipientId: string, patch: Partial<Omit<Recipient, "id" | "campaignId" | "token">>) {
    update((s) => ({
      ...s,
      recipients: s.recipients.map((r) => (r.id === recipientId ? { ...r, ...patch } : r)),
    }));
  },

  removeRecipient(recipientId: string) {
    update((s) => ({ ...s, recipients: s.recipients.filter((r) => r.id !== recipientId) }));
  },

  markLinksSent(campaignId: string, recipientIds: string[]) {
    update((s) => ({
      ...s,
      recipients: s.recipients.map((r) =>
        r.campaignId === campaignId && recipientIds.includes(r.id) && r.status === "pending"
          ? { ...r, status: "link_sent" }
          : r,
      ),
    }));
  },

  /**
   * Recipient-facing confirmation. A personal token updates that recipient;
   * the campaign share token matches by email or adds a new recipient.
   */
  confirmAddress(
    token: string,
    input: Pick<Recipient, "firstName" | "lastName" | "email" | "address" | "preferences">,
  ): { ok: true; recipientId: string } | { ok: false; reason: "not_found" | "closed" } {
    const confirmedAt = now();
    const personal = state.recipients.find((r) => r.token === token);
    if (personal) {
      actions.updateRecipient(personal.id, { ...input, status: "confirmed", confirmedAt });
      return { ok: true, recipientId: personal.id };
    }
    const campaign = state.campaigns.find((c) => c.shareToken === token);
    if (!campaign) return { ok: false, reason: "not_found" };
    const existing = state.recipients.find(
      (r) => r.campaignId === campaign.id && r.email.toLowerCase() === input.email.trim().toLowerCase(),
    );
    if (existing) {
      actions.updateRecipient(existing.id, { ...input, status: "confirmed", confirmedAt });
      return { ok: true, recipientId: existing.id };
    }
    if (isLocked(campaign)) return { ok: false, reason: "closed" };
    const [created] = actions.addRecipients(campaign.id, [{ ...input, company: "", status: "confirmed" }]);
    if (!created) return { ok: false, reason: "closed" };
    actions.updateRecipient(created.id, { confirmedAt });
    return { ok: true, recipientId: created.id };
  },

  /** Locks the configuration and freezes a snapshot. Returns false when not submittable. */
  submitQuote(id: string): boolean {
    const campaign = state.campaigns.find((c) => c.id === id);
    if (!campaign || isLocked(campaign)) return false;
    const recipientCount = state.recipients.filter((r) => r.campaignId === id).length;
    if (recipientCount === 0 || !campaign.templateId) return false;
    const cost = estimateCost({
      templateId: campaign.templateId,
      personalization: campaign.personalization,
      recipients: recipientCount,
    });
    patchCampaign(id, (c) => ({
      ...c,
      status: "submitted",
      submittedAt: now(),
      snapshot: {
        templateId: c.templateId,
        personalization: c.personalization,
        recipientCount,
        budgetPerRecipient: c.budgetPerRecipient,
        deliveryDate: c.deliveryDate,
        totals: { perRecipient: cost.perRecipient, total: cost.total },
      },
    }));
    return true;
  },

  /** Fabrikat-side status change (review tooling / demo control). */
  setStatus(id: string, status: CampaignStatus) {
    patchCampaign(id, (c) => ({ ...c, status }), { allowLocked: true });
  },
};

/** Actual recipients once added, otherwise the estimate from the brief. */
export function recipientCount(s: AppState, campaign: Campaign) {
  const actual = s.recipients.filter((r) => r.campaignId === campaign.id).length;
  return actual > 0 ? actual : campaign.recipientEstimate;
}

export function campaignRecipients(s: AppState, campaignId: string) {
  return s.recipients.filter((r) => r.campaignId === campaignId);
}

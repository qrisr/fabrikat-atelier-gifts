/**
 * Application state: companies, campaigns, recipients.
 * Synchronous external store (useSyncExternalStore) with optimistic updates;
 * every change is handed to the active Repository (browser or Supabase), and
 * remote changes from other tabs, devices or Fabrikat staff flow back in.
 */
import { useSyncExternalStore } from "react";

import { getRepository } from "@/lib/data";
import { demoData } from "@/lib/data/local";
import type { ConfirmPayload, ConfirmResult, PersistedData, SubmitResult } from "@/lib/data/types";
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

export type AppState = PersistedData & {
  /** False until persisted data has been loaded in the browser. */
  ready: boolean;
  backend: "local" | "supabase" | null;
  loadError: string | null;
  isStaff: boolean;
};

export type CampaignDetails = Pick<
  Campaign,
  "name" | "occasion" | "recipientEstimate" | "budgetPerRecipient" | "deliveryDate"
>;

export type RecipientInput = Omit<
  Recipient,
  "id" | "campaignId" | "token" | "createdAt" | "confirmedAt" | "status"
> &
  Partial<Pick<Recipient, "status">>;

type Listener = () => void;

const listeners = new Set<Listener>();

export function initialState(): AppState {
  return { ...demoData(), ready: false, backend: null, loadError: null, isStaff: false };
}

let state: AppState = initialState();
const serverSnapshot = initialState();

export function getState(): AppState {
  return state;
}

function emit(next: AppState) {
  state = next;
  listeners.forEach((listener) => listener());
}

const persisted = (s: AppState): PersistedData => ({
  companies: s.companies,
  activeCompanyId: s.activeCompanyId,
  campaigns: s.campaigns,
  recipients: s.recipients,
});

/** Local change: update UI immediately, then persist. */
function update(fn: (s: AppState) => AppState) {
  const next = fn(state);
  if (next === state) return;
  emit(next);
  if (next.ready) getRepository().persist(persisted(next));
}

/** Data that came from storage — never written back. */
function applyRemote(data: PersistedData, extra: Partial<AppState> = {}) {
  emit({ ...state, ...data, ...extra });
}

export function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Returns the whole state; its identity only changes on updates. Derive with useMemo. */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, () => serverSnapshot);
}

let started = false;

/** Loads persisted data once in the browser and subscribes to remote changes. */
export async function startStore() {
  if (started || typeof window === "undefined") return;
  started = true;
  const repository = getRepository();
  try {
    const data = await repository.load();
    applyRemote(data, { ready: true, backend: repository.kind, loadError: null });
    repository.subscribe((remote) => applyRemote(remote));
    const isStaff = await repository.isStaff();
    if (isStaff !== state.isStaff) emit({ ...state, isStaff });
  } catch (error) {
    console.error("[fabrikat] could not load data", error);
    emit({
      ...state,
      ready: true,
      backend: repository.kind,
      loadError: error instanceof Error ? error.message : String(error),
    });
  }
}

const now = () => new Date().toISOString();

function patchCampaign(id: string, fn: (c: Campaign) => Campaign) {
  update((s) => {
    const current = s.campaigns.find((c) => c.id === id);
    if (!current || isLocked(current)) return s;
    return {
      ...s,
      campaigns: s.campaigns.map((c) => (c.id === id ? { ...fn(c), updatedAt: now() } : c)),
    };
  });
}

export const actions = {
  setActiveCompany(companyId: string) {
    update((s) => ({ ...s, activeCompanyId: companyId }));
  },

  updateCompany(companyId: string, patch: Partial<Omit<Company, "id">>) {
    update((s) => ({
      ...s,
      companies: s.companies.map((c) => (c.id === companyId ? { ...c, ...patch } : c)),
    }));
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
      c.templateId === templateId
        ? c
        : { ...c, templateId, personalization: { ...c.personalization, engravings: {} } },
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

  updateRecipient(
    recipientId: string,
    patch: Partial<Omit<Recipient, "id" | "campaignId" | "token">>,
  ) {
    update((s) => {
      const recipient = s.recipients.find((r) => r.id === recipientId);
      const campaign = s.campaigns.find((c) => c.id === recipient?.campaignId);
      if (!recipient || !campaign) return s;
      // While locked, names and emails stay as submitted; addresses may still be corrected.
      const allowed = isLocked(campaign)
        ? {
            address: patch.address ?? recipient.address,
            preferences: patch.preferences ?? recipient.preferences,
          }
        : patch;
      return {
        ...s,
        recipients: s.recipients.map((r) => (r.id === recipientId ? { ...r, ...allowed } : r)),
      };
    });
  },

  removeRecipient(recipientId: string) {
    update((s) => {
      const recipient = s.recipients.find((r) => r.id === recipientId);
      const campaign = s.campaigns.find((c) => c.id === recipient?.campaignId);
      if (!campaign || isLocked(campaign)) return s;
      return { ...s, recipients: s.recipients.filter((r) => r.id !== recipientId) };
    });
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

  /** Locks the configuration server-side (or locally) and records the snapshot. */
  async submitQuote(id: string): Promise<SubmitResult> {
    const result = await getRepository().submitQuote(id, persisted(state));
    if (result.ok) {
      applyRemote({
        ...persisted(state),
        campaigns: state.campaigns.map((c) => (c.id === id ? result.campaign : c)),
      });
    }
    return result;
  },

  /** Fabrikat-side review status (staff, or demo control in browser mode). */
  async setStatus(id: string, status: CampaignStatus): Promise<boolean> {
    const updated = await getRepository().setStatus(id, status, persisted(state));
    if (!updated) return false;
    applyRemote({
      ...persisted(state),
      campaigns: state.campaigns.map((c) => (c.id === id ? updated : c)),
    });
    return true;
  },

  async confirmAddress(token: string, payload: ConfirmPayload): Promise<ConfirmResult> {
    const { result, data } = await getRepository().confirmAddress(token, payload, persisted(state));
    if (result === "confirmed" && data) applyRemote(data);
    return result;
  },
};

/** Actual recipients once added, otherwise the estimate from the brief. */
export function recipientCount(s: AppState, campaign: Campaign) {
  const actual = s.recipients.filter((r) => r.campaignId === campaign.id).length;
  return actual > 0 ? actual : campaign.recipientEstimate;
}

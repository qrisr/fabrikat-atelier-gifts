/**
 * Browser repository: persists to localStorage and syncs other tabs via the
 * storage event. Used when no Supabase project is configured.
 */
import type { PersistedData, Repository } from "@/lib/data/types";
import * as ops from "@/lib/operations";
import { seedCampaigns, seedRecipients } from "@/lib/seed";

const KEY = "fabrikat-atelier:v1";

export const defaultCompanies: PersistedData["companies"] = [
  {
    id: "alpen-co",
    name: "Alpen & Co. AG",
    initials: "AC",
    contactName: "Anna Keller",
    contactEmail: "anna.keller@alpen-co.ch",
  },
  {
    id: "seeblick",
    name: "Seeblick Treuhand GmbH",
    initials: "ST",
    contactName: "Marco Brunner",
    contactEmail: "m.brunner@seeblick-treuhand.ch",
  },
];

export function demoData(): PersistedData {
  return {
    companies: defaultCompanies,
    activeCompanyId: "alpen-co",
    campaigns: seedCampaigns,
    recipients: seedRecipients,
  };
}

function read(): PersistedData | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number; data?: PersistedData };
    return parsed.version === 1 && parsed.data ? parsed.data : null;
  } catch {
    return null;
  }
}

function write(data: PersistedData) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ version: 1, data }));
  } catch (error) {
    // Quota exceeded (large logos) — keep working in memory.
    console.warn("[fabrikat] could not save to localStorage", error);
  }
}

export function createLocalRepository(): Repository {
  return {
    kind: "local",
    async load() {
      const stored = read();
      if (stored) return stored;
      const data = demoData();
      write(data);
      return data;
    },
    persist(next) {
      write(next);
    },
    async flush() {},
    subscribe(onChange) {
      const handler = (event: StorageEvent) => {
        if (event.key !== KEY) return;
        const data = read();
        if (data) onChange(data);
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
    async submitQuote(campaignId, local) {
      const { result, data } = ops.submitQuote(local, campaignId);
      if (result.ok) write(data);
      return result;
    },
    async setStatus(campaignId, status, local) {
      const data = ops.setStatus(local, campaignId, status);
      write(data);
      return data.campaigns.find((c) => c.id === campaignId) ?? null;
    },
    async getConfirmation(token, local) {
      return ops.getConfirmation(read() ?? local, token);
    },
    async confirmAddress(token, payload, local) {
      const { result, data } = ops.confirmAddress(read() ?? local, token, payload);
      if (result === "confirmed") write(data);
      return { result, data };
    },
    async isStaff() {
      return true;
    },
  };
}

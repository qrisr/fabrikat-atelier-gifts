/** Persistence contract shared by the browser store and Supabase. */
import type { Campaign, CampaignStatus, Company, Recipient } from "@/lib/domain";

export type PersistedData = {
  companies: Company[];
  activeCompanyId: string;
  campaigns: Campaign[];
  recipients: Recipient[];
};

export type ConfirmationData = {
  campaign: {
    id: string;
    templateId: string | null;
    deliveryDate: string;
    status: CampaignStatus;
    companyName: string;
  };
  recipient: Pick<Recipient, "firstName" | "lastName" | "email" | "address" | "preferences"> | null;
};

export type ConfirmPayload = Pick<
  Recipient,
  "firstName" | "lastName" | "email" | "address" | "preferences"
>;
export type ConfirmResult = "confirmed" | "closed" | "not_found" | "error";

export type SubmitResult =
  | { ok: true; campaign: Campaign }
  | { ok: false; reason: "no_recipients" | "no_template" | "locked" | "error"; message?: string };

export interface Repository {
  readonly kind: "local" | "supabase";
  load(): Promise<PersistedData>;
  /** Called after every local change; implementations debounce and diff. */
  persist(next: PersistedData): void;
  /** Push pending writes immediately (before RPCs that read the database). */
  flush(): Promise<void>;
  /** Remote changes (other tab, other device, Fabrikat staff). */
  subscribe(onChange: (data: PersistedData) => void): () => void;
  submitQuote(campaignId: string, local: PersistedData): Promise<SubmitResult>;
  setStatus(
    campaignId: string,
    status: CampaignStatus,
    local: PersistedData,
  ): Promise<Campaign | null>;
  getConfirmation(token: string, local: PersistedData): Promise<ConfirmationData | null>;
  confirmAddress(
    token: string,
    payload: ConfirmPayload,
    local: PersistedData,
  ): Promise<{ result: ConfirmResult; data?: PersistedData }>;
  /** Supabase only: whether the signed-in user is Fabrikat staff. */
  isStaff(): Promise<boolean>;
}

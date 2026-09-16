/**
 * Domain model for Fabrikat Gift Atelier.
 * Pure types and constants — no React, no storage.
 */

export const CAMPAIGN_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "changes_requested",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const OCCASIONS = [
  "year_end",
  "customer_appreciation",
  "employee_thanks",
  "partner_gift",
] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const RECIPIENT_STATUSES = ["pending", "link_sent", "confirmed"] as const;
export type RecipientStatus = (typeof RECIPIENT_STATUSES)[number];

export type Company = {
  id: string;
  name: string;
  initials: string;
  contactName: string;
  contactEmail: string;
};

export type EngravingChoice = { enabled: boolean; text: string };

export type Personalization = {
  wrappingId: string;
  stickerId: string;
  cardId: string;
  cardMessage: string;
  /** Data URL of the uploaded company logo (PNG, JPG, SVG, WebP). */
  logoDataUrl: string | null;
  logoFileName: string | null;
  /** Keyed by template item id; only engravable items are honoured. */
  engravings: Record<string, EngravingChoice>;
};

export type Campaign = {
  id: string;
  companyId: string;
  name: string;
  occasion: Occasion;
  recipientEstimate: number;
  budgetPerRecipient: number;
  /** ISO date (YYYY-MM-DD). */
  deliveryDate: string;
  templateId: string | null;
  personalization: Personalization;
  status: CampaignStatus;
  /** Token for the shared address-confirmation link. */
  shareToken: string;
  submittedAt: string | null;
  /** Frozen copy of the configuration at submission time. */
  snapshot: CampaignSnapshot | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignSnapshot = {
  templateId: string | null;
  personalization: Personalization;
  recipientCount: number;
  budgetPerRecipient: number;
  deliveryDate: string;
  totals: { perRecipient: number; total: number };
};

export type SwissAddress = {
  street: string;
  postalCode: string;
  city: string;
  canton: string;
};

export type Recipient = {
  id: string;
  campaignId: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  address: SwissAddress;
  status: RecipientStatus;
  /** Keyed by preference id defined on the template (e.g. tea flavour). */
  preferences: Record<string, string>;
  /** Personal token for the individual confirmation link. */
  token: string;
  confirmedAt: string | null;
  createdAt: string;
};

export const emptyAddress = (): SwissAddress => ({ street: "", postalCode: "", city: "", canton: "" });

export const defaultPersonalization = (): Personalization => ({
  wrappingId: "kraft-natural",
  stickerId: "none",
  cardId: "classic",
  cardMessage: "",
  logoDataUrl: null,
  logoFileName: null,
  engravings: {},
});

export function isLocked(campaign: Pick<Campaign, "status">): boolean {
  return campaign.status !== "draft" && campaign.status !== "changes_requested";
}

export function newId(): string {
  return crypto.randomUUID();
}

export function newToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

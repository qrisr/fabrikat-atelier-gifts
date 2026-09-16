/** Guided campaign steps and the "next step" for a campaign. */
import type { Campaign } from "@/lib/domain";

export const FLOW_STEPS = ["details", "template", "personalize", "recipients", "quote"] as const;
export type FlowStep = (typeof FLOW_STEPS)[number];

export type NextStepKey =
  | "chooseTemplate"
  | "personalize"
  | "addRecipients"
  | "requestQuote"
  | "awaitingReview"
  | "underReview"
  | "approved"
  | "changesRequested";

export function nextStep(
  campaign: Campaign,
  actualRecipients: number,
): { key: NextStepKey; step: FlowStep } {
  switch (campaign.status) {
    case "submitted":
      return { key: "awaitingReview", step: "quote" };
    case "under_review":
      return { key: "underReview", step: "quote" };
    case "approved":
      return { key: "approved", step: "quote" };
    case "changes_requested":
      return { key: "changesRequested", step: "quote" };
    case "draft":
      if (!campaign.templateId) return { key: "chooseTemplate", step: "template" };
      if (
        campaign.personalization.cardMessage.trim() === "" &&
        campaign.personalization.stickerId === "none"
      )
        return { key: "personalize", step: "personalize" };
      if (actualRecipients === 0) return { key: "addRecipients", step: "recipients" };
      return { key: "requestQuote", step: "quote" };
  }
}

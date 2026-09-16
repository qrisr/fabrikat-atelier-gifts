/**
 * Estimated campaign cost. All amounts CHF, excluding VAT.
 * The official offer comes from Fabrikat after manual review.
 */
import { findCard, findSticker, findTemplate, findWrapping } from "@/lib/catalog";
import type { Personalization } from "@/lib/domain";

/** Estimated parcel cost per recipient within Switzerland (Post Priority). */
export const SHIPPING_PER_RECIPIENT_CH = 9.5;
/** One-time setup for printing a company logo on cards. */
export const LOGO_SETUP_FEE = 60;

export type EngravingLine = { itemId: string; surcharge: number };

export type CostBreakdown = {
  recipients: number;
  setPrice: number;
  wrapping: number;
  sticker: number;
  card: number;
  engravings: EngravingLine[];
  engravingPerRecipient: number;
  personalizationPerRecipient: number;
  perRecipient: number;
  shippingPerRecipient: number;
  logoSetup: number;
  setsTotal: number;
  personalizationTotal: number;
  shippingTotal: number;
  total: number;
};

export function estimateCost(input: {
  templateId: string | null;
  personalization: Personalization;
  recipients: number;
}): CostBreakdown {
  const template = findTemplate(input.templateId);
  const p = input.personalization;
  const recipients = Math.max(0, Math.floor(input.recipients || 0));

  const setPrice = template?.price ?? 0;
  const wrapping = findWrapping(p.wrappingId).surcharge;
  const sticker = findSticker(p.stickerId).surcharge;
  const card = findCard(p.cardId).surcharge;

  const engravings: EngravingLine[] = (template?.items ?? [])
    .filter((item) => item.engravingSurcharge !== undefined)
    .filter((item) => p.engravings[item.id]?.enabled)
    .map((item) => ({ itemId: item.id, surcharge: item.engravingSurcharge ?? 0 }));
  const engravingPerRecipient = engravings.reduce((sum, line) => sum + line.surcharge, 0);

  const personalizationPerRecipient = wrapping + sticker + card + engravingPerRecipient;
  const perRecipient = setPrice + personalizationPerRecipient;
  const logoSetup = p.logoDataUrl ? LOGO_SETUP_FEE : 0;

  const setsTotal = round(setPrice * recipients);
  const personalizationTotal = round(personalizationPerRecipient * recipients + logoSetup);
  const shippingTotal = round(SHIPPING_PER_RECIPIENT_CH * recipients);

  return {
    recipients,
    setPrice,
    wrapping,
    sticker,
    card,
    engravings,
    engravingPerRecipient,
    personalizationPerRecipient,
    perRecipient: round(perRecipient),
    shippingPerRecipient: SHIPPING_PER_RECIPIENT_CH,
    logoSetup,
    setsTotal,
    personalizationTotal,
    shippingTotal,
    total: round(setsTotal + personalizationTotal + shippingTotal),
  };
}

const round = (value: number) => Math.round(value * 100) / 100;

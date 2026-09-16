import { describe, expect, it } from "vitest";

import { defaultPersonalization } from "@/lib/domain";
import { formatChf, formatSwissDate } from "@/lib/i18n";
import { LOGO_SETUP_FEE, SHIPPING_PER_RECIPIENT_CH, estimateCost } from "@/lib/pricing";

describe("estimateCost", () => {
  it("multiplies the set price by recipients", () => {
    const cost = estimateCost({ templateId: "schreibtisch", personalization: defaultPersonalization(), recipients: 25 });
    expect(cost.setsTotal).toBe(3625);
    expect(cost.perRecipient).toBe(145);
    expect(cost.shippingTotal).toBe(25 * SHIPPING_PER_RECIPIENT_CH);
  });

  it("adds wrapping, sticker, card, engraving and logo setup", () => {
    const cost = estimateCost({
      templateId: "schreibtisch",
      recipients: 3,
      personalization: {
        ...defaultPersonalization(),
        wrappingId: "gold-foil",
        stickerId: "christmas",
        cardId: "letterpress",
        logoDataUrl: "data:image/png;base64,xx",
        engravings: { "sd-notebook": { enabled: true, text: "AK" }, "sd-pen": { enabled: false, text: "" } },
      },
    });
    expect(cost.perRecipient).toBe(145 + 6.5 + 0.8 + 3.5 + 16);
    expect(cost.logoSetup).toBe(LOGO_SETUP_FEE);
    expect(cost.total).toBe(Math.round(((145 + 6.5 + 0.8 + 3.5 + 16) * 3 + 60 + 28.5) * 100) / 100);
  });

  it("ignores engravings for items outside the template", () => {
    const cost = estimateCost({
      templateId: "winterabend",
      recipients: 1,
      personalization: { ...defaultPersonalization(), engravings: { "sd-pen": { enabled: true, text: "X" } } },
    });
    expect(cost.engravingPerRecipient).toBe(0);
  });
});

describe("Swiss formatting", () => {
  it("formats CHF and dates", () => {
    expect(formatChf(1234.5)).toMatch(/^CHF 1.234\.50$/);
    expect(formatSwissDate("2026-12-05")).toBe("05.12.2026");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import { demoData } from "@/lib/data/local";
import * as ops from "@/lib/operations";
import {
  quoteReceivedEmail,
  recipientInviteEmail,
  statusUpdateEmail,
} from "@/services/email-templates";
import { exportToSheets, onInvite, sendEmails, sheetRow } from "@/services/integrations.server";

function context() {
  const data = demoData();
  const submitted = ops.submitQuote(data, "c-team-2026");
  if (!submitted.result.ok) throw new Error("fixture not submittable");
  const campaign = submitted.result.campaign;
  return {
    campaign,
    company: data.companies[0]!,
    recipients: data.recipients.filter((r) => r.campaignId === campaign.id),
    baseUrl: "https://gifts.example.ch",
    lang: "en" as const,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("email templates", () => {
  it("renders quote received with estimate and link", () => {
    const email = quoteReceivedEmail(context());
    expect(email.to).toBe("anna.keller@alpen-co.ch");
    expect(email.subject).toContain("Team-Weihnachten 2026");
    expect(email.html).toContain("https://gifts.example.ch/campaigns/c-team-2026/quote");
    expect(email.text).toContain("Estimate excl. VAT: CHF");
  });

  it("approved email contains totals incl. VAT and delivery date", () => {
    const email = statusUpdateEmail(context(), "approved")!;
    expect(email.html).toContain("Total incl. VAT");
    expect(email.html).toContain("05.12.2026");
  });

  it("defaults to Swiss German", () => {
    const { lang: _lang, ...ctx } = context();
    const email = statusUpdateEmail(ctx, "approved")!;
    expect(email.subject).toBe("Ihre Offerte ist bereit — Team-Weihnachten 2026");
    expect(email.html).toContain("Total inkl. MWST");
    expect(email.html).toContain('lang="de-CH"');
  });

  it("escapes user content", () => {
    const ctx = context();
    ctx.campaign = { ...ctx.campaign, name: '<img src=x onerror="alert(1)">' };
    expect(quoteReceivedEmail(ctx).html).not.toContain("<img src=x");
  });

  it("invite links to the personal token", () => {
    const ctx = context();
    const email = recipientInviteEmail(ctx, ctx.recipients[2]!);
    expect(email.html).toContain("https://gifts.example.ch/confirm/seed-r3");
  });
});

describe("integrations without configuration", () => {
  it("dry-runs email and sheets, and does not call the network", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const ctx = context();
    expect((await sendEmails([quoteReceivedEmail(ctx)], true)).status).toBe("dry_run");
    expect((await exportToSheets(ctx, true)).status).toBe("dry_run");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never sends in unverified demo mode even with keys", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_FROM", "Atelier <a@b.ch>");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await sendEmails([quoteReceivedEmail(context())], false);
    expect(result.status).toBe("dry_run");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends a Resend batch when verified", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_FROM", "Atelier <a@b.ch>");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const ctx = context();
    const result = await onInvite(
      ctx,
      ctx.recipients.map((r) => r.id),
      true,
    );
    expect(result.email.status).toBe("sent");
    // Lea is already confirmed, so only two invitations go out.
    expect(result.invited).toHaveLength(2);
    const body = JSON.parse(String(fetchSpy.mock.calls[0]![1]!.body)) as Array<{ to: string[] }>;
    expect(body.map((b) => b.to[0])).toEqual(["jonas.huber@alpen-co.ch", "sara.rossi@alpen-co.ch"]);
  });
});

describe("sheet row", () => {
  it("contains campaign, budget, estimate and recipient list", () => {
    const row = sheetRow(context());
    expect(row.company).toBe("Alpen & Co. AG");
    expect(row.recipients).toBe(3);
    expect(row.budget_total_chf).toBe(285);
    expect(row.recipient_list.split("\n")).toHaveLength(3);
    expect(row.recipient_list).toContain("Seefeldstrasse 12, 8008 Zürich ZH");
  });
});

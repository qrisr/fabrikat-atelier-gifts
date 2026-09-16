/**
 * Server-only integrations: Google Sheets export, pipeline webhook, Resend email.
 *
 * Trust model
 * - With Supabase configured, campaign data is always re-read from the database
 *   with the caller's access token (RLS), never taken from the browser.
 * - Without Supabase (browser demo), integrations run as dry runs unless
 *   ALLOW_DEMO_INTEGRATIONS=true — otherwise anyone could send email through the app.
 *
 * Environment (Lovable Cloud secrets)
 *   RESEND_API_KEY, RESEND_FROM            e.g. "Fabrikat Gift Atelier <atelier@fabrikat.ch>"
 *   GOOGLE_SHEETS_WEBHOOK_URL, GOOGLE_SHEETS_WEBHOOK_SECRET   Apps Script web app (docs/INTEGRATIONS.md)
 *   PIPELINE_WEBHOOK_URL                    optional: any CRM / automation later (Zapier, Make, Pipedrive …)
 *   APP_URL                                 public base URL for links in emails
 *   HOOK_SECRET                             shared secret for /api/hooks/campaign-status
 *   SUPABASE_SERVICE_ROLE_KEY               only for the database webhook route
 */
import { createClient } from "@supabase/supabase-js";

import { findCard, findSticker, findTemplate, findWrapping } from "@/lib/catalog";
import { toCampaign, toCompany, toRecipient } from "@/lib/data/supabase";
import type { Campaign, CampaignStatus, Company, Recipient } from "@/lib/domain";
import { formatSwissDate } from "@/lib/i18n";
import { estimateCost } from "@/lib/pricing";
import {
  type CampaignContext,
  type Email,
  campaignUrl,
  quoteReceivedEmail,
  recipientInviteEmail,
  statusUpdateEmail,
} from "@/services/email-templates";

export type Outcome = { status: "sent" | "skipped" | "dry_run" | "failed"; detail?: string };

const env = (name: string): string | undefined => {
  const fromProcess = typeof process !== "undefined" ? process.env[name] : undefined;
  const fromVite = (import.meta.env as Record<string, string | undefined>)[name];
  return fromProcess || fromVite || undefined;
};

export function supabaseServerConfig() {
  const url = env("VITE_SUPABASE_URL") ?? env("SUPABASE_URL");
  const key =
    env("VITE_SUPABASE_PUBLISHABLE_KEY") ??
    env("SUPABASE_PUBLISHABLE_KEY") ??
    env("SUPABASE_ANON_KEY");
  return url && key ? { url, key } : null;
}

const demoAllowed = () => env("ALLOW_DEMO_INTEGRATIONS") === "true";

// ─── Context loading ─────────────────────────────────────────────────────────

export type DemoPayload = { campaign: Campaign; company: Company; recipients: Recipient[] };

export class IntegrationError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/** Loads a campaign as the caller sees it (RLS) — or as the service role for webhooks. */
export async function loadContext(input: {
  campaignId: string;
  accessToken?: string | null;
  serviceRole?: boolean;
  demo?: DemoPayload | null;
  baseUrl: string;
}): Promise<{ ctx: CampaignContext; verified: boolean }> {
  const config = supabaseServerConfig();
  const baseUrl = env("APP_URL")?.replace(/\/$/, "") ?? input.baseUrl;

  if (!config) {
    if (!input.demo || input.demo.campaign.id !== input.campaignId)
      throw new IntegrationError("campaign data missing");
    return { ctx: { ...input.demo, baseUrl }, verified: false };
  }

  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  let authKey: string;
  let headers: Record<string, string> = {};
  if (input.serviceRole) {
    if (!serviceKey) throw new IntegrationError("service role key missing", 500);
    authKey = serviceKey;
  } else {
    if (!input.accessToken) throw new IntegrationError("not signed in", 401);
    authKey = config.key;
    headers = { Authorization: `Bearer ${input.accessToken}` };
  }
  const client = createClient(config.url, authKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers },
  });

  const { data: row, error } = await client
    .from("campaigns")
    .select("*")
    .eq("id", input.campaignId)
    .maybeSingle();
  if (error) throw new IntegrationError(error.message, 500);
  if (!row) throw new IntegrationError("campaign not found", 404);

  const [company, personalization, engravings, recipients] = await Promise.all([
    client.from("companies").select("*").eq("id", row["company_id"]).single(),
    client
      .from("campaign_personalizations")
      .select("*")
      .eq("campaign_id", input.campaignId)
      .maybeSingle(),
    client.from("campaign_engravings").select("*").eq("campaign_id", input.campaignId),
    client.from("recipients").select("*").eq("campaign_id", input.campaignId).order("created_at"),
  ]);
  if (company.error) throw new IntegrationError(company.error.message, 500);

  return {
    ctx: {
      campaign: toCampaign(row, personalization.data ?? undefined, engravings.data ?? []),
      company: toCompany(company.data),
      recipients: (recipients.data ?? []).map(toRecipient),
      baseUrl,
    },
    verified: true,
  };
}

// ─── Email (Resend) ──────────────────────────────────────────────────────────

export async function sendEmails(
  emails: Email[],
  verified: boolean,
): Promise<Outcome & { previews?: Email[] }> {
  const valid = emails.filter((e) => /@/.test(e.to));
  if (valid.length === 0) return { status: "skipped", detail: "no recipient address" };
  const apiKey = env("RESEND_API_KEY");
  const from = env("RESEND_FROM");
  if (!apiKey || !from)
    return { status: "dry_run", detail: "RESEND_API_KEY / RESEND_FROM not set", previews: valid };
  if (!verified && !demoAllowed())
    return { status: "dry_run", detail: "demo mode — not sent", previews: valid };

  try {
    for (let i = 0; i < valid.length; i += 100) {
      const batch = valid
        .slice(i, i + 100)
        .map((e) => ({ from, to: [e.to], subject: e.subject, html: e.html, text: e.text }));
      const response = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
      if (!response.ok)
        return { status: "failed", detail: `Resend ${response.status}: ${await response.text()}` };
    }
    return { status: "sent", detail: `${valid.length} email(s)` };
  } catch (error) {
    return { status: "failed", detail: error instanceof Error ? error.message : String(error) };
  }
}

// ─── Google Sheets ───────────────────────────────────────────────────────────

export function sheetRow(ctx: CampaignContext) {
  const { campaign, company, recipients } = ctx;
  const p = campaign.snapshot?.personalization ?? campaign.personalization;
  const templateId = campaign.snapshot?.templateId ?? campaign.templateId;
  const template = findTemplate(templateId);
  const count = campaign.snapshot?.recipientCount ?? recipients.length;
  const cost = estimateCost({ templateId, personalization: p, recipients: count });
  const engravings = (template?.items ?? [])
    .filter((item) => p.engravings[item.id]?.enabled)
    .map((item) => `${item.name.de}: ${p.engravings[item.id]?.text ?? ""}`)
    .join("; ");

  return {
    submitted_at: campaign.submittedAt ?? new Date().toISOString(),
    status: campaign.status,
    campaign_id: campaign.id,
    company: company.name,
    contact_name: company.contactName,
    contact_email: company.contactEmail,
    campaign: campaign.name,
    occasion: campaign.occasion,
    delivery_date: formatSwissDate(campaign.deliveryDate),
    gift_set: template?.name.de ?? "",
    recipients: count,
    confirmed_addresses: recipients.filter((r) => r.status === "confirmed").length,
    budget_per_recipient_chf: campaign.budgetPerRecipient,
    budget_total_chf: campaign.budgetPerRecipient * count,
    estimate_per_recipient_chf: cost.perRecipient,
    estimate_total_excl_vat_chf: cost.total,
    wrapping: findWrapping(p.wrappingId).name.de,
    sticker: findSticker(p.stickerId).name.de,
    card: findCard(p.cardId).name.de,
    card_message: p.cardMessage,
    logo: p.logoDataUrl ? (p.logoFileName ?? "yes") : "",
    engravings,
    recipient_list: recipients
      .map((r) =>
        [
          `${r.firstName} ${r.lastName} <${r.email}>`,
          r.address.street
            ? `${r.address.street}, ${r.address.postalCode} ${r.address.city} ${r.address.canton}`.trim()
            : "address pending",
          r.status,
          Object.entries(r.preferences)
            .map(([k, v]) => `${k}=${v}`)
            .join(" "),
        ]
          .filter(Boolean)
          .join(" | "),
      )
      .join("\n"),
    campaign_url: campaignUrl(ctx),
  };
}

export async function exportToSheets(
  ctx: CampaignContext,
  verified: boolean,
): Promise<Outcome & { row?: ReturnType<typeof sheetRow> }> {
  const url = env("GOOGLE_SHEETS_WEBHOOK_URL");
  const row = sheetRow(ctx);
  if (!url) return { status: "dry_run", detail: "GOOGLE_SHEETS_WEBHOOK_URL not set", row };
  if (!verified && !demoAllowed())
    return { status: "dry_run", detail: "demo mode — not exported", row };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: env("GOOGLE_SHEETS_WEBHOOK_SECRET") ?? "", row }),
      redirect: "follow",
    });
    const text = await response.text();
    if (!response.ok || /"ok"\s*:\s*false/.test(text))
      return { status: "failed", detail: `Sheets ${response.status}: ${text.slice(0, 200)}` };
    return { status: "sent" };
  } catch (error) {
    return { status: "failed", detail: error instanceof Error ? error.message : String(error) };
  }
}

// ─── Pipeline webhook (CRM-neutral) ──────────────────────────────────────────

export async function notifyPipeline(
  ctx: CampaignContext,
  event: string,
  verified: boolean,
): Promise<Outcome> {
  const url = env("PIPELINE_WEBHOOK_URL");
  if (!url) return { status: "skipped", detail: "PIPELINE_WEBHOOK_URL not set" };
  if (!verified && !demoAllowed()) return { status: "dry_run", detail: "demo mode" };
  const row = sheetRow(ctx);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        deal: {
          name: `${row.company} — ${row.campaign}`,
          stage: ctx.campaign.status === "submitted" ? "quote_requested" : ctx.campaign.status,
          amount_chf: row.estimate_total_excl_vat_chf,
          budget_chf: row.budget_total_chf,
          close_date: ctx.campaign.deliveryDate,
          company: {
            name: row.company,
            contact_name: row.contact_name,
            contact_email: row.contact_email,
          },
          url: row.campaign_url,
        },
      }),
    });
    return response.ok
      ? { status: "sent" }
      : { status: "failed", detail: `Pipeline ${response.status}` };
  } catch (error) {
    return { status: "failed", detail: error instanceof Error ? error.message : String(error) };
  }
}

// ─── Use cases ───────────────────────────────────────────────────────────────

export async function onQuoteSubmitted(ctx: CampaignContext, verified: boolean) {
  if (ctx.campaign.status === "draft")
    throw new IntegrationError("campaign has not been submitted");
  const [sheets, pipeline, email] = await Promise.all([
    exportToSheets(ctx, verified),
    notifyPipeline(ctx, "quote_requested", verified),
    sendEmails([quoteReceivedEmail(ctx)], verified),
  ]);
  return { sheets, pipeline, email };
}

export async function onStatusChanged(
  ctx: CampaignContext,
  status: CampaignStatus,
  verified: boolean,
  note?: string | null,
) {
  const message = statusUpdateEmail(ctx, status, note);
  const [email, pipeline, sheets] = await Promise.all([
    message
      ? sendEmails([message], verified)
      : Promise.resolve<Outcome>({ status: "skipped", detail: "no email for this status" }),
    notifyPipeline(ctx, `status_${status}`, verified),
    exportToSheets(ctx, verified),
  ]);
  return { email, pipeline, sheets };
}

export async function onInvite(ctx: CampaignContext, recipientIds: string[], verified: boolean) {
  const targets = ctx.recipients.filter(
    (r) => recipientIds.includes(r.id) && r.status !== "confirmed",
  );
  if (targets.length === 0)
    return {
      email: { status: "skipped", detail: "nobody to invite" } as Outcome,
      invited: [] as string[],
    };
  const email = await sendEmails(
    targets.map((r) => recipientInviteEmail(ctx, r)),
    verified,
  );
  return {
    email,
    invited: email.status === "sent" || email.status === "dry_run" ? targets.map((r) => r.id) : [],
  };
}

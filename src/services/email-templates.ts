/**
 * Transactional email templates in Fabrikat's quiet, analog style.
 * Pure functions (no I/O) so they render in previews, tests and the server.
 * Table layout + inline styles for mail clients.
 */
import { findCard, findSticker, findTemplate, findWrapping } from "@/lib/catalog";
import type { Campaign, CampaignStatus, Company, Recipient } from "@/lib/domain";
import { formatChf, formatSwissDate } from "@/lib/i18n";
import { VAT_RATE, estimateCost } from "@/lib/pricing";

export type Email = { to: string; subject: string; html: string; text: string };

const C = {
  paper: "#F7F2E8",
  card: "#FCFAF5",
  ink: "#3A2E25",
  muted: "#7A6D60",
  line: "#E3D9C8",
  brand: "#9A5B34",
  approved: "#4F7A55",
  changes: "#A4553A",
};

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );

function layout({
  preheader,
  eyebrow,
  title,
  body,
  action,
  footer,
}: {
  preheader: string;
  eyebrow: string;
  title: string;
  body: string;
  action?: { label: string; url: string };
  footer?: string;
}) {
  const button = action
    ? `<tr><td style="padding:8px 40px 8px"><a href="${escape(action.url)}" style="display:inline-block;background:${C.ink};color:${C.paper};text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:14px;letter-spacing:.02em;padding:14px 26px;border-radius:2px">${escape(action.label)}</a></td></tr>`
    : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:${C.paper}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper}">
<tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.card};border:1px solid ${C.line}">
<tr><td style="padding:32px 40px 8px;font-family:Georgia,'Times New Roman',serif;font-size:15px;letter-spacing:.24em;text-transform:uppercase;color:${C.ink}">Fabrikat<span style="display:block;margin-top:6px;font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:.18em;color:${C.muted}">Gift Atelier · Zürich</span></td></tr>
<tr><td style="padding:28px 40px 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:.16em;text-transform:uppercase;color:${C.brand}">${escape(eyebrow)}</td></tr>
<tr><td style="padding:10px 40px 8px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;color:${C.ink}">${escape(title)}</td></tr>
<tr><td style="padding:8px 40px 16px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${C.ink}">${body}</td></tr>
${button}
<tr><td style="padding:32px 40px 36px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${C.muted};border-top:1px solid ${C.line}">${footer ?? "Fabrikat · Zürich<br>Considered objects, assembled by hand."}</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (text: string) => `<p style="margin:0 0 14px">${text}</p>`;

function rows(lines: Array<[string, string]>, strongLast = false) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;border-top:1px solid ${C.line}">${lines
    .map(
      ([label, value], index) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid ${C.line};color:${C.muted};font-size:14px">${escape(label)}</td><td align="right" style="padding:10px 0;border-bottom:1px solid ${C.line};font-size:14px;${strongLast && index === lines.length - 1 ? "font-weight:bold;color:" + C.ink : ""}">${escape(value)}</td></tr>`,
    )
    .join("")}</table>`;
}

function textFrom(parts: string[]) {
  return parts.filter(Boolean).join("\n\n");
}

export type CampaignContext = {
  campaign: Campaign;
  company: Company;
  recipients: Recipient[];
  baseUrl: string;
};

function costs(ctx: CampaignContext) {
  const count = ctx.campaign.snapshot?.recipientCount ?? ctx.recipients.length;
  const cost = estimateCost({
    templateId: ctx.campaign.snapshot?.templateId ?? ctx.campaign.templateId,
    personalization: ctx.campaign.snapshot?.personalization ?? ctx.campaign.personalization,
    recipients: count,
  });
  const vat = Math.round(cost.total * VAT_RATE * 100) / 100;
  return { count, cost, vat, gross: Math.round((cost.total + vat) * 100) / 100 };
}

export const campaignUrl = (ctx: CampaignContext) =>
  `${ctx.baseUrl}/campaigns/${ctx.campaign.id}/quote`;

export function quoteReceivedEmail(ctx: CampaignContext): Email {
  const { campaign, company } = ctx;
  const template = findTemplate(campaign.templateId);
  const { count, cost } = costs(ctx);
  const greeting = company.contactName
    ? `Dear ${escape(company.contactName.split(" ")[0]!)},`
    : "Hello,";
  const body = [
    p(greeting),
    p(
      `thank you for your quote request for <strong>${escape(campaign.name)}</strong>. Our atelier is now checking product availability and personalisation feasibility. You'll receive our official offer, usually within two working days.`,
    ),
    rows([
      ["Gift set", template?.name.en ?? "–"],
      ["Recipients", String(count)],
      ["Target delivery", formatSwissDate(campaign.deliveryDate)],
      ["Estimate excl. VAT", formatChf(cost.total)],
    ]),
    p(
      `<span style="color:${C.muted};font-size:13px">Your configuration is locked while we review it.</span>`,
    ),
  ].join("");
  return {
    to: company.contactEmail,
    subject: `We've received your quote request — ${campaign.name}`,
    html: layout({
      preheader: "Fabrikat is reviewing availability and personalisation.",
      eyebrow: "Request received",
      title: "Thank you. Our atelier is on it.",
      body,
      action: { label: "View your request", url: campaignUrl(ctx) },
    }),
    text: textFrom([
      greeting.replace(/<[^>]+>/g, ""),
      `Thank you for your quote request for ${campaign.name}. We're checking availability and personalisation and will send the official offer, usually within two working days.`,
      `Gift set: ${template?.name.en ?? "–"}\nRecipients: ${count}\nTarget delivery: ${formatSwissDate(campaign.deliveryDate)}\nEstimate excl. VAT: ${formatChf(cost.total)}`,
      `View your request: ${campaignUrl(ctx)}`,
    ]),
  };
}

export function statusUpdateEmail(
  ctx: CampaignContext,
  status: CampaignStatus,
  note?: string | null,
): Email | null {
  const { campaign, company } = ctx;
  const template = findTemplate(campaign.snapshot?.templateId ?? campaign.templateId);
  const greeting = company.contactName
    ? `Dear ${escape(company.contactName.split(" ")[0]!)},`
    : "Hello,";
  const noteBlock = note ? p(`<em style="color:${C.muted}">«${escape(note)}»</em>`) : "";

  if (status === "under_review") {
    return {
      to: company.contactEmail,
      subject: `Your request is under review — ${campaign.name}`,
      html: layout({
        preheader: "We're checking availability and personalisation.",
        eyebrow: "Under review",
        title: "Your gifts are being considered.",
        body: [
          p(greeting),
          p(
            `our atelier has started reviewing <strong>${escape(campaign.name)}</strong>: availability of every piece in <em>${escape(template?.name.en ?? "your set")}</em>, wrapping, card and engravings. We'll be in touch with the official offer shortly.`,
          ),
          noteBlock,
        ].join(""),
        action: { label: "Follow the review", url: campaignUrl(ctx) },
      }),
      text: textFrom([
        "Your request is under review.",
        `We've started reviewing ${campaign.name}. We'll send the official offer shortly.`,
        note ?? "",
        campaignUrl(ctx),
      ]),
    };
  }

  if (status === "approved") {
    const { count, cost, vat, gross } = costs(ctx);
    const p13n = campaign.snapshot?.personalization ?? campaign.personalization;
    return {
      to: company.contactEmail,
      subject: `Your offer is ready — ${campaign.name}`,
      html: layout({
        preheader: `Offer total ${formatChf(gross)} incl. VAT · delivery by ${formatSwissDate(campaign.deliveryDate)}`,
        eyebrow: "Offer approved",
        title: "Your offer is ready.",
        body: [
          p(greeting),
          p(
            `we're delighted to confirm <strong>${escape(campaign.name)}</strong>. Here is the summary of your official offer:`,
          ),
          rows(
            [
              [
                `${template?.name.en ?? "Gift set"} · ${count} × ${formatChf(cost.setPrice)}`,
                formatChf(cost.setsTotal),
              ],
              [
                `Personalisation (${findWrapping(p13n.wrappingId).name.en}, ${findSticker(p13n.stickerId).name.en}, ${findCard(p13n.cardId).name.en}${cost.engravings.length ? ", engraving" : ""})`,
                formatChf(cost.personalizationTotal),
              ],
              [`Shipping within Switzerland · ${count} parcels`, formatChf(cost.shippingTotal)],
              ["Total excl. VAT", formatChf(cost.total)],
              ["VAT 8.1%", formatChf(vat)],
              ["Total incl. VAT", formatChf(gross)],
            ],
            true,
          ),
          rows([
            ["Production start", "After your confirmation"],
            ["Estimated delivery", formatSwissDate(campaign.deliveryDate)],
          ]),
          noteBlock,
        ].join(""),
        action: { label: "View the official offer", url: campaignUrl(ctx) },
      }),
      text: textFrom([
        "Your offer is ready.",
        `${campaign.name}\nSets: ${formatChf(cost.setsTotal)}\nPersonalisation: ${formatChf(cost.personalizationTotal)}\nShipping: ${formatChf(cost.shippingTotal)}\nTotal excl. VAT: ${formatChf(cost.total)}\nVAT 8.1%: ${formatChf(vat)}\nTotal incl. VAT: ${formatChf(gross)}\nEstimated delivery: ${formatSwissDate(campaign.deliveryDate)}`,
        note ?? "",
        `View the official offer: ${campaignUrl(ctx)}`,
      ]),
    };
  }

  if (status === "changes_requested") {
    return {
      to: company.contactEmail,
      subject: `A few suggestions for your request — ${campaign.name}`,
      html: layout({
        preheader: "Your campaign is editable again.",
        eyebrow: "Changes suggested",
        title: "A few thoughts from our atelier.",
        body: [
          p(greeting),
          p(
            `while reviewing <strong>${escape(campaign.name)}</strong>, we noticed something we'd like to adjust with you. Your campaign is editable again — please review and resubmit when ready.`,
          ),
          noteBlock,
        ].join(""),
        action: { label: "Review and resubmit", url: campaignUrl(ctx) },
      }),
      text: textFrom([
        "A few suggestions for your request.",
        `Your campaign ${campaign.name} is editable again. Please review and resubmit.`,
        note ?? "",
        campaignUrl(ctx),
      ]),
    };
  }

  return null;
}

export function recipientInviteEmail(ctx: CampaignContext, recipient: Recipient): Email {
  const url = `${ctx.baseUrl}/confirm/${recipient.token}`;
  const company = ctx.company.name;
  return {
    to: recipient.email,
    subject: `${company} would like to send you a gift`,
    html: layout({
      preheader: "Please confirm your delivery address — it takes a minute.",
      eyebrow: "A gift is on its way",
      title: `${company} would like to send you a gift.`,
      body: [
        p(`Hello ${escape(recipient.firstName)},`),
        p(
          `to make sure it reaches you, please confirm your delivery address in Switzerland${findTemplate(ctx.campaign.templateId)?.items.some((i) => i.preference) ? " and choose your preferences" : ""}. It takes about a minute.`,
        ),
        p(
          `<span style="color:${C.muted};font-size:13px">We'd be grateful for your reply before ${formatSwissDate(ctx.campaign.deliveryDate)}. Your address is used only for this delivery.</span>`,
        ),
      ].join(""),
      action: { label: "Confirm my address", url },
      footer: `Sent by Fabrikat Gift Atelier on behalf of ${escape(company)}.<br>Fabrikat · Zürich`,
    }),
    text: textFrom([
      `Hello ${recipient.firstName},`,
      `${company} would like to send you a gift. Please confirm your delivery address: ${url}`,
      "Your address is used only for this delivery.",
    ]),
  };
}

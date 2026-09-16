/**
 * Transactional email templates in Fabrikat's quiet, analog style (de/en).
 * Pure functions (no I/O) so they render in previews, tests and the server.
 * Table layout + inline styles for mail clients. German is the default.
 */
import { type Lang, findCard, findSticker, findTemplate, findWrapping } from "@/lib/catalog";
import type { CampaignStatus, Company, Recipient, Campaign } from "@/lib/domain";
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
};

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );

const copy = {
  de: {
    footer: "Fabrikat · Zürich<br>Sorgfältig ausgewählte Dinge, von Hand zusammengestellt.",
    hello: (name: string) => (name ? `Guten Tag ${name}` : "Guten Tag"),
    giftSet: "Geschenkset",
    recipients: "Empfänger",
    targetDelivery: "Gewünschte Lieferung",
    estimate: "Schätzung ohne MWST",
    locked: "Ihre Konfiguration bleibt gesperrt, solange wir sie prüfen.",
    received: {
      subject: (name: string) => `Ihre Offertanfrage ist eingegangen — ${name}`,
      preheader: "Fabrikat prüft Verfügbarkeit und Personalisierung.",
      eyebrow: "Anfrage erhalten",
      title: "Herzlichen Dank. Unser Atelier kümmert sich darum.",
      body: (name: string) =>
        `Vielen Dank für Ihre Offertanfrage für <strong>${name}</strong>. Unser Atelier prüft jetzt die Verfügbarkeit der Produkte und die Machbarkeit der Personalisierung. Die verbindliche Offerte erhalten Sie in der Regel innert zwei Arbeitstagen.`,
      action: "Anfrage ansehen",
    },
    review: {
      subject: (name: string) => `Ihre Anfrage wird geprüft — ${name}`,
      preheader: "Wir prüfen Verfügbarkeit und Personalisierung.",
      eyebrow: "In Prüfung",
      title: "Ihre Geschenke sind in guten Händen.",
      body: (name: string, set: string) =>
        `Unser Atelier hat mit der Prüfung von <strong>${name}</strong> begonnen: Verfügbarkeit jedes Stücks aus <em>${set}</em>, Verpackung, Karte und Gravuren. Die verbindliche Offerte folgt in Kürze.`,
      action: "Prüfung verfolgen",
    },
    approved: {
      subject: (name: string) => `Ihre Offerte ist bereit — ${name}`,
      preheader: (total: string, date: string) =>
        `Total ${total} inkl. MWST · Lieferung bis ${date}`,
      eyebrow: "Offerte bestätigt",
      title: "Ihre Offerte ist bereit.",
      body: (name: string) =>
        `Wir freuen uns, <strong>${name}</strong> zu bestätigen. Hier die Zusammenfassung Ihrer verbindlichen Offerte:`,
      sets: (set: string, n: number, price: string) => `${set} · ${n} × ${price}`,
      personalization: (details: string) => `Personalisierung (${details})`,
      engraving: "Gravur",
      shipping: (n: number) => `Versand innerhalb der Schweiz · ${n} Pakete`,
      subtotal: "Total ohne MWST",
      vat: "MWST 8,1 %",
      total: "Total inkl. MWST",
      production: "Produktionsstart",
      productionValue: "Nach Ihrer Bestätigung",
      delivery: "Voraussichtliche Lieferung",
      action: "Verbindliche Offerte ansehen",
    },
    changes: {
      subject: (name: string) => `Einige Vorschläge zu Ihrer Anfrage — ${name}`,
      preheader: "Ihre Kampagne ist wieder bearbeitbar.",
      eyebrow: "Änderungen vorgeschlagen",
      title: "Ein paar Gedanken aus unserem Atelier.",
      body: (name: string) =>
        `Bei der Prüfung von <strong>${name}</strong> ist uns etwas aufgefallen, das wir gerne mit Ihnen anpassen möchten. Ihre Kampagne ist wieder bearbeitbar — bitte prüfen Sie sie und reichen Sie sie erneut ein.`,
      action: "Prüfen und erneut einreichen",
    },
    invite: {
      subject: (company: string) => `${company} möchte Ihnen ein Geschenk senden`,
      preheader: "Bitte bestätigen Sie Ihre Lieferadresse — es dauert eine Minute.",
      eyebrow: "Ein Geschenk ist unterwegs",
      title: (company: string) => `${company} möchte Ihnen ein Geschenk senden.`,
      body: (withPreferences: boolean) =>
        `Damit es sicher ankommt, bestätigen Sie bitte Ihre Lieferadresse in der Schweiz${withPreferences ? " und wählen Sie Ihre Präferenzen" : ""}. Das dauert etwa eine Minute.`,
      deadline: (date: string) =>
        `Wir freuen uns über Ihre Antwort vor dem ${date}. Ihre Adresse wird nur für diese Lieferung verwendet.`,
      action: "Adresse bestätigen",
      footer: (company: string) =>
        `Versendet von Fabrikat Gift Atelier im Auftrag von ${company}.<br>Fabrikat · Zürich`,
    },
  },
  en: {
    footer: "Fabrikat · Zürich<br>Considered objects, assembled by hand.",
    hello: (name: string) => (name ? `Dear ${name},` : "Hello,"),
    giftSet: "Gift set",
    recipients: "Recipients",
    targetDelivery: "Target delivery",
    estimate: "Estimate excl. VAT",
    locked: "Your configuration is locked while we review it.",
    received: {
      subject: (name: string) => `We've received your quote request — ${name}`,
      preheader: "Fabrikat is reviewing availability and personalisation.",
      eyebrow: "Request received",
      title: "Thank you. Our atelier is on it.",
      body: (name: string) =>
        `thank you for your quote request for <strong>${name}</strong>. Our atelier is now checking product availability and personalisation feasibility. You'll receive our official offer, usually within two working days.`,
      action: "View your request",
    },
    review: {
      subject: (name: string) => `Your request is under review — ${name}`,
      preheader: "We're checking availability and personalisation.",
      eyebrow: "Under review",
      title: "Your gifts are being considered.",
      body: (name: string, set: string) =>
        `our atelier has started reviewing <strong>${name}</strong>: availability of every piece in <em>${set}</em>, wrapping, card and engravings. We'll be in touch with the official offer shortly.`,
      action: "Follow the review",
    },
    approved: {
      subject: (name: string) => `Your offer is ready — ${name}`,
      preheader: (total: string, date: string) =>
        `Offer total ${total} incl. VAT · delivery by ${date}`,
      eyebrow: "Offer approved",
      title: "Your offer is ready.",
      body: (name: string) =>
        `we're delighted to confirm <strong>${name}</strong>. Here is the summary of your official offer:`,
      sets: (set: string, n: number, price: string) => `${set} · ${n} × ${price}`,
      personalization: (details: string) => `Personalisation (${details})`,
      engraving: "engraving",
      shipping: (n: number) => `Shipping within Switzerland · ${n} parcels`,
      subtotal: "Total excl. VAT",
      vat: "VAT 8.1%",
      total: "Total incl. VAT",
      production: "Production start",
      productionValue: "After your confirmation",
      delivery: "Estimated delivery",
      action: "View the official offer",
    },
    changes: {
      subject: (name: string) => `A few suggestions for your request — ${name}`,
      preheader: "Your campaign is editable again.",
      eyebrow: "Changes suggested",
      title: "A few thoughts from our atelier.",
      body: (name: string) =>
        `while reviewing <strong>${name}</strong>, we noticed something we'd like to adjust with you. Your campaign is editable again — please review and resubmit when ready.`,
      action: "Review and resubmit",
    },
    invite: {
      subject: (company: string) => `${company} would like to send you a gift`,
      preheader: "Please confirm your delivery address — it takes a minute.",
      eyebrow: "A gift is on its way",
      title: (company: string) => `${company} would like to send you a gift.`,
      body: (withPreferences: boolean) =>
        `to make sure it reaches you, please confirm your delivery address in Switzerland${withPreferences ? " and choose your preferences" : ""}. It takes about a minute.`,
      deadline: (date: string) =>
        `We'd be grateful for your reply before ${date}. Your address is used only for this delivery.`,
      action: "Confirm my address",
      footer: (company: string) =>
        `Sent by Fabrikat Gift Atelier on behalf of ${company}.<br>Fabrikat · Zürich`,
    },
  },
} as const;

function layout({
  lang,
  preheader,
  eyebrow,
  title,
  body,
  action,
  footer,
}: {
  lang: Lang;
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
<html lang="${lang === "de" ? "de-CH" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head>
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
<tr><td style="padding:32px 40px 36px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${C.muted};border-top:1px solid ${C.line}">${footer ?? copy[lang].footer}</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (html: string) => `<p style="margin:0 0 14px">${html}</p>`;

function rows(lines: Array<[string, string]>, strongLast = false) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;border-top:1px solid ${C.line}">${lines
    .map(
      ([label, value], index) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid ${C.line};color:${C.muted};font-size:14px">${escape(label)}</td><td align="right" style="padding:10px 0;border-bottom:1px solid ${C.line};font-size:14px;${strongLast && index === lines.length - 1 ? `font-weight:bold;color:${C.ink}` : ""}">${escape(value)}</td></tr>`,
    )
    .join("")}</table>`;
}

const strip = (html: string) => html.replace(/<[^>]+>/g, "");
const textFrom = (parts: string[]) => parts.filter(Boolean).map(strip).join("\n\n");

export type CampaignContext = {
  campaign: Campaign;
  company: Company;
  recipients: Recipient[];
  baseUrl: string;
  lang?: Lang;
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

const firstName = (company: Company) => escape(company.contactName.split(" ")[0] ?? "");

export function quoteReceivedEmail(ctx: CampaignContext): Email {
  const lang = ctx.lang ?? "de";
  const t = copy[lang];
  const { campaign, company } = ctx;
  const template = findTemplate(campaign.templateId);
  const { count, cost } = costs(ctx);
  const name = escape(campaign.name);
  const facts: Array<[string, string]> = [
    [t.giftSet, template?.name[lang] ?? "–"],
    [t.recipients, String(count)],
    [t.targetDelivery, formatSwissDate(campaign.deliveryDate)],
    [t.estimate, formatChf(cost.total)],
  ];
  return {
    to: company.contactEmail,
    subject: t.received.subject(campaign.name),
    html: layout({
      lang,
      preheader: t.received.preheader,
      eyebrow: t.received.eyebrow,
      title: t.received.title,
      body: [
        p(t.hello(firstName(company))),
        p(t.received.body(name)),
        rows(facts),
        p(`<span style="color:${C.muted};font-size:13px">${t.locked}</span>`),
      ].join(""),
      action: { label: t.received.action, url: campaignUrl(ctx) },
    }),
    text: textFrom([
      t.hello(company.contactName.split(" ")[0] ?? ""),
      t.received.body(campaign.name),
      facts.map(([label, value]) => `${label}: ${value}`).join("\n"),
      `${t.received.action}: ${campaignUrl(ctx)}`,
    ]),
  };
}

export function statusUpdateEmail(
  ctx: CampaignContext,
  status: CampaignStatus,
  note?: string | null,
): Email | null {
  const lang = ctx.lang ?? "de";
  const t = copy[lang];
  const { campaign, company } = ctx;
  const template = findTemplate(campaign.snapshot?.templateId ?? campaign.templateId);
  const name = escape(campaign.name);
  const hello = p(t.hello(firstName(company)));
  const noteBlock = note ? p(`<em style="color:${C.muted}">«${escape(note)}»</em>`) : "";
  const plainHello = t.hello(company.contactName.split(" ")[0] ?? "");

  if (status === "under_review") {
    const setName = escape(template?.name[lang] ?? "");
    return {
      to: company.contactEmail,
      subject: t.review.subject(campaign.name),
      html: layout({
        lang,
        preheader: t.review.preheader,
        eyebrow: t.review.eyebrow,
        title: t.review.title,
        body: [hello, p(t.review.body(name, setName)), noteBlock].join(""),
        action: { label: t.review.action, url: campaignUrl(ctx) },
      }),
      text: textFrom([
        plainHello,
        t.review.body(campaign.name, template?.name[lang] ?? ""),
        note ?? "",
        `${t.review.action}: ${campaignUrl(ctx)}`,
      ]),
    };
  }

  if (status === "approved") {
    const a = t.approved;
    const { count, cost, vat, gross } = costs(ctx);
    const p13n = campaign.snapshot?.personalization ?? campaign.personalization;
    const details = [
      findWrapping(p13n.wrappingId).name[lang],
      findSticker(p13n.stickerId).name[lang],
      findCard(p13n.cardId).name[lang],
      ...(cost.engravings.length ? [a.engraving] : []),
    ].join(", ");
    const priceLines: Array<[string, string]> = [
      [
        a.sets(template?.name[lang] ?? t.giftSet, count, formatChf(cost.setPrice)),
        formatChf(cost.setsTotal),
      ],
      [a.personalization(details), formatChf(cost.personalizationTotal)],
      [a.shipping(count), formatChf(cost.shippingTotal)],
      [a.subtotal, formatChf(cost.total)],
      [a.vat, formatChf(vat)],
      [a.total, formatChf(gross)],
    ];
    const timing: Array<[string, string]> = [
      [a.production, a.productionValue],
      [a.delivery, formatSwissDate(campaign.deliveryDate)],
    ];
    return {
      to: company.contactEmail,
      subject: a.subject(campaign.name),
      html: layout({
        lang,
        preheader: a.preheader(formatChf(gross), formatSwissDate(campaign.deliveryDate)),
        eyebrow: a.eyebrow,
        title: a.title,
        body: [hello, p(a.body(name)), rows(priceLines, true), rows(timing), noteBlock].join(""),
        action: { label: a.action, url: campaignUrl(ctx) },
      }),
      text: textFrom([
        plainHello,
        a.body(campaign.name),
        priceLines.map(([label, value]) => `${label}: ${value}`).join("\n"),
        timing.map(([label, value]) => `${label}: ${value}`).join("\n"),
        note ?? "",
        `${a.action}: ${campaignUrl(ctx)}`,
      ]),
    };
  }

  if (status === "changes_requested") {
    return {
      to: company.contactEmail,
      subject: t.changes.subject(campaign.name),
      html: layout({
        lang,
        preheader: t.changes.preheader,
        eyebrow: t.changes.eyebrow,
        title: t.changes.title,
        body: [hello, p(t.changes.body(name)), noteBlock].join(""),
        action: { label: t.changes.action, url: campaignUrl(ctx) },
      }),
      text: textFrom([
        plainHello,
        t.changes.body(campaign.name),
        note ?? "",
        `${t.changes.action}: ${campaignUrl(ctx)}`,
      ]),
    };
  }

  return null;
}

export function recipientInviteEmail(ctx: CampaignContext, recipient: Recipient): Email {
  const lang = ctx.lang ?? "de";
  const t = copy[lang].invite;
  const url = `${ctx.baseUrl}/confirm/${recipient.token}`;
  const company = ctx.company.name;
  const withPreferences = Boolean(
    findTemplate(ctx.campaign.templateId)?.items.some((i) => i.preference),
  );
  const hello = copy[lang].hello(escape(recipient.firstName));
  return {
    to: recipient.email,
    subject: t.subject(company),
    html: layout({
      lang,
      preheader: t.preheader,
      eyebrow: t.eyebrow,
      title: t.title(company),
      body: [
        p(hello),
        p(t.body(withPreferences)),
        p(
          `<span style="color:${C.muted};font-size:13px">${t.deadline(formatSwissDate(ctx.campaign.deliveryDate))}</span>`,
        ),
      ].join(""),
      action: { label: t.action, url },
      footer: t.footer(escape(company)),
    }),
    text: textFrom([
      copy[lang].hello(recipient.firstName),
      `${t.title(company)} ${t.body(withPreferences)}`,
      `${t.action}: ${url}`,
      t.deadline(formatSwissDate(ctx.campaign.deliveryDate)),
    ]),
  };
}

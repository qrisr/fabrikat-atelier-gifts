import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { PageContainer, PageIntro } from "@/components/empty-state";
import { useI18n } from "@/lib/i18n";
import { useAppState } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  quoteReceivedEmail,
  recipientInviteEmail,
  statusUpdateEmail,
} from "@/services/email-templates";

export const Route = createFileRoute("/atelier/emails")({
  head: () => ({
    meta: [{ title: "E-Mail-Vorschau — Fabrikat" }, { name: "robots", content: "noindex" }],
  }),
  component: EmailPreviews,
});

function EmailPreviews() {
  const { m, lang } = useI18n();
  const state = useAppState();
  const [active, setActive] = useState(0);

  const emails = useMemo(() => {
    const campaign =
      state.campaigns.find((c) => c.status !== "draft" && c.templateId) ??
      state.campaigns.find((c) => c.templateId);
    if (!campaign || typeof window === "undefined") return [];
    const company = state.companies.find((c) => c.id === campaign.companyId) ?? state.companies[0]!;
    const recipients = state.recipients.filter((r) => r.campaignId === campaign.id);
    const ctx = { campaign, company, recipients, baseUrl: window.location.origin, lang };
    const sampleRecipient = recipients[0] ?? {
      id: "sample",
      campaignId: campaign.id,
      firstName: "Lea",
      lastName: "Meier",
      email: "lea.meier@example.ch",
      company: "",
      address: { street: "", postalCode: "", city: "", canton: "" },
      status: "pending" as const,
      preferences: {},
      token: "sample-token",
      confirmedAt: null,
      createdAt: campaign.createdAt,
    };
    return [
      { label: m.atelier.emailKinds.invite, email: recipientInviteEmail(ctx, sampleRecipient) },
      { label: m.atelier.emailKinds.received, email: quoteReceivedEmail(ctx) },
      { label: m.atelier.emailKinds.underReview, email: statusUpdateEmail(ctx, "under_review")! },
      {
        label: "Offer approved",
        email: statusUpdateEmail(ctx, "approved", m.atelier.sampleNoteApproved)!,
      },
      {
        label: "Changes requested",
        email: statusUpdateEmail(ctx, "changes_requested", m.atelier.sampleNoteChanges)!,
      },
    ];
  }, [state, m, lang]);

  const current = emails[active];

  return (
    <PageContainer>
      <PageIntro
        eyebrow={m.atelier.eyebrow}
        title={m.atelier.emailsTitle}
        description={m.atelier.emailsIntro}
      />
      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <ul className="space-y-1">
          {emails.map((item, index) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => setActive(index)}
                className={cn(
                  "w-full rounded-sm px-3 py-2.5 text-left text-sm",
                  index === active ? "bg-foreground text-background" : "hover:bg-secondary",
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
        {current && (
          <div className="overflow-hidden rounded-sm border border-border bg-card">
            <div className="border-b border-border px-5 py-3 text-sm">
              <p className="text-muted-foreground">
                {m.atelier.emailTo}: {current.email.to || "–"}
              </p>
              <p className="font-medium">{current.email.subject}</p>
            </div>
            <iframe
              title={current.email.subject}
              srcDoc={current.email.html}
              className="h-[780px] w-full bg-white"
              sandbox=""
            />
          </div>
        )}
      </div>
    </PageContainer>
  );
}

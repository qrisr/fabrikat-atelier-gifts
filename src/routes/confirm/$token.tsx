import { createFileRoute } from "@tanstack/react-router";
import { SearchX } from "lucide-react";

import { ConfirmForm } from "@/components/recipients/confirm-form";
import { useI18n } from "@/lib/i18n";
import { actions, useAppState } from "@/lib/store";

export const Route = createFileRoute("/confirm/$token")({
  head: () => ({
    meta: [
      { title: "Confirm your delivery address — Fabrikat" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConfirmPage,
});

function ConfirmPage() {
  const { m } = useI18n();
  const { token } = Route.useParams();
  const state = useAppState();
  const recipient = state.recipients.find((r) => r.token === token);
  const campaign = state.campaigns.find((c) => c.id === recipient?.campaignId || c.shareToken === token);
  const company = state.companies.find((c) => c.id === campaign?.companyId);

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-16">
      <main className="mx-auto w-full max-w-lg rounded-sm border border-border bg-card px-5 py-8 shadow-[0_30px_60px_-45px_rgba(58,46,37,0.5)] sm:px-10 sm:py-12">
        {campaign ? (
          <ConfirmForm
            campaign={campaign}
            company={company}
            recipient={recipient}
            onSubmit={(payload) => {
              const result = actions.confirmAddress(token, payload);
              if (result.ok) return { ok: true };
              return { ok: false, error: result.reason === "closed" ? m.confirm.closedBody : m.confirm.notFoundBody };
            }}
          />
        ) : (
          <div className="py-10 text-center">
            <SearchX className="mx-auto size-8 text-muted-foreground" strokeWidth={1.4} />
            <h1 className="mt-6 font-display text-3xl">{m.confirm.notFoundTitle}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{m.confirm.notFoundBody}</p>
          </div>
        )}
      </main>
    </div>
  );
}

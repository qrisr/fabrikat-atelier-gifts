import { createFileRoute } from "@tanstack/react-router";
import { SearchX } from "lucide-react";
import { useEffect, useState } from "react";

import { LanguageToggle } from "@/components/language-toggle";
import { ConfirmForm } from "@/components/recipients/confirm-form";
import { getRepository } from "@/lib/data";
import type { ConfirmationData } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { actions, getState } from "@/lib/store";

export const Route = createFileRoute("/confirm/$token")({
  head: () => ({
    meta: [
      { title: "Lieferadresse bestätigen — Fabrikat" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConfirmPage,
});

function ConfirmPage() {
  const { m } = useI18n();
  const { token } = Route.useParams();
  const [context, setContext] = useState<ConfirmationData | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void getRepository()
      .getConfirmation(token, getState())
      .then((data) => {
        if (!cancelled) setContext(data);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:py-12">
      <div className="mx-auto mb-4 flex w-full max-w-lg justify-end">
        <LanguageToggle />
      </div>
      <main className="mx-auto w-full max-w-lg rounded-sm border border-border bg-card px-5 py-8 shadow-[0_30px_60px_-45px_rgba(58,46,37,0.5)] sm:px-10 sm:py-12">
        {context === undefined ? (
          <p className="py-16 text-center text-sm text-muted-foreground" role="status">
            {m.app.loading}
          </p>
        ) : context ? (
          <ConfirmForm
            context={context}
            onSubmit={async (payload) => {
              const result = await actions.confirmAddress(token, payload);
              if (result === "confirmed") return { ok: true };
              return {
                ok: false,
                error:
                  result === "closed"
                    ? m.confirm.closedBody
                    : result === "not_found"
                      ? m.confirm.notFoundBody
                      : m.confirm.submitError,
              };
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

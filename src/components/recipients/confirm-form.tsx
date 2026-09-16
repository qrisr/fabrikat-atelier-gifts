/** Recipient-facing address confirmation form (public page and in-app preview). */
import { Check, Lock } from "lucide-react";
import { useState } from "react";

import { LogoMark } from "@/components/brand";
import { Field } from "@/components/campaign-details-form";
import {
  RecipientFields,
  type RecipientDraft,
  emptyDraft,
  hasErrors,
  validateDraft,
  type DraftErrors,
} from "@/components/recipients/recipient-fields";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { findTemplate } from "@/lib/catalog";
import type { ConfirmPayload, ConfirmationData } from "@/lib/data/types";
import { useI18n } from "@/lib/i18n";
import { useHydrated } from "@/lib/use-hydrated";

export type { ConfirmPayload };

export function ConfirmForm({
  context,
  preview = false,
  onSubmit,
}: {
  context: ConfirmationData;
  preview?: boolean;
  onSubmit?: (
    payload: ConfirmPayload,
  ) => Promise<{ ok: boolean; error?: string }> | { ok: boolean; error?: string };
}) {
  const { m, l, date } = useI18n();
  const { campaign, recipient } = context;
  const template = findTemplate(campaign.templateId);
  const preferenceItems = (template?.items ?? []).filter((item) => item.preference);
  const [draft, setDraft] = useState<RecipientDraft>(() =>
    recipient
      ? {
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          email: recipient.email,
          company: "",
          address: recipient.address,
        }
      : emptyDraft(),
  );
  const [preferences, setPreferences] = useState<Record<string, string>>(
    recipient?.preferences ?? {},
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const companyName = campaign.companyName;
  const hydrated = useHydrated();

  if (state === "done") {
    return (
      <div className="py-10 text-center" role="status">
        <div className="mx-auto mb-6 grid size-14 place-items-center rounded-full bg-tone-approved/10 text-tone-approved">
          <Check className="size-6" />
        </div>
        <h2 className="font-display text-3xl">{m.confirm.successTitle}</h2>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
          {m.confirm.successBody(date(campaign.deliveryDate))}
        </p>
      </div>
    );
  }

  return (
    <form
      method="post"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (preview || !onSubmit) return;
        const found = validateDraft(draft, m, { requireAddress: true });
        setErrors(found);
        if (hasErrors(found)) return;
        setState("saving");
        const result = await onSubmit({
          firstName: draft.firstName.trim(),
          lastName: draft.lastName.trim(),
          email: draft.email.trim(),
          address: {
            ...draft.address,
            street: draft.address.street.trim(),
            city: draft.address.city.trim(),
          },
          preferences,
        });
        if (result.ok) setState("done");
        else {
          setState("error");
          setSubmitError(result.error ?? null);
        }
      }}
    >
      <div className="flex items-center gap-3 text-foreground">
        <LogoMark className="size-8" />
        <span className="font-display text-sm uppercase tracking-[0.18em]">Fabrikat</span>
      </div>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
        {m.confirm.eyebrow}
      </p>
      <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
        {m.confirm.title(companyName)}
      </h1>
      {recipient && <p className="mt-4 text-sm">{m.confirm.personalHello(recipient.firstName)}</p>}
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{m.confirm.intro}</p>

      <div className="mt-8 space-y-8">
        <RecipientFields
          idPrefix={preview ? "preview" : "confirm"}
          draft={draft}
          onChange={setDraft}
          errors={errors}
          showCompany={false}
          showIdentity
        />

        {preferenceItems.length > 0 && (
          <section className="border-t border-border pt-8">
            <h2 className="font-display text-2xl">
              {m.confirm.preferencesTitle}{" "}
              <span className="font-sans text-sm text-muted-foreground">
                ({m.confirm.optional})
              </span>
            </h2>
            <div className="mt-5 grid gap-5">
              {preferenceItems.map((item) => {
                const pref = item.preference!;
                const fieldId = `${preview ? "preview" : "confirm"}-pref-${pref.id}`;
                return (
                  <Field key={item.id} id={fieldId} label={`${l(pref.label)} · ${l(item.name)}`}>
                    <Select
                      value={preferences[pref.id] ?? "none"}
                      onValueChange={(value) =>
                        setPreferences((current) => {
                          const next = { ...current };
                          if (value === "none") delete next[pref.id];
                          else next[pref.id] = value;
                          return next;
                        })
                      }
                    >
                      <SelectTrigger id={fieldId}>
                        <SelectValue>
                          {l(
                            pref.options.find((o) => o.id === preferences[pref.id])?.label ?? {
                              de: m.confirm.noPreference,
                              en: m.confirm.noPreference,
                            },
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{m.confirm.noPreference}</SelectItem>
                        {pref.options.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {l(option.label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {state === "error" && submitError && (
        <p
          role="alert"
          className="mt-6 rounded-sm border border-tone-changes/30 bg-tone-changes/5 px-3 py-2 text-sm text-tone-changes"
        >
          {submitError}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="mt-8 w-full"
        disabled={preview || !hydrated || state === "saving"}
      >
        {m.confirm.submit}
      </Button>
      <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" /> {m.confirm.privacy}
      </p>
    </form>
  );
}

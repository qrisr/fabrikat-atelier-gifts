/** Campaign brief: name, occasion, recipient estimate, budget, delivery date. */
import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OCCASIONS, type Occasion } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import type { Messages } from "@/lib/messages/en";
import type { CampaignDetails } from "@/lib/store";

const MIN_LEAD_DAYS = 14;

export function detailsSchema(m: Messages, options: { enforceLeadTime: boolean }) {
  return z.object({
    name: z.string().trim().min(1, m.details.errors.nameRequired).max(120),
    occasion: z.enum(OCCASIONS),
    recipientEstimate: z.coerce
      .number({ invalid_type_error: m.details.errors.recipientsMin })
      .int()
      .min(1, m.details.errors.recipientsMin)
      .max(2000, m.details.errors.recipientsMax),
    budgetPerRecipient: z.coerce
      .number({ invalid_type_error: m.details.errors.budgetMin })
      .min(50, m.details.errors.budgetMin)
      .max(5000, m.details.errors.budgetMax),
    deliveryDate: z
      .string()
      .min(1, m.details.errors.dateRequired)
      .refine((value) => !options.enforceLeadTime || value >= earliestDeliveryDate(), m.details.errors.datePast),
  });
}

export function earliestDeliveryDate(from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + MIN_LEAD_DAYS);
  return d.toISOString().slice(0, 10);
}

type FormValues = CampaignDetails;

export function CampaignDetailsForm({
  defaultValues,
  onSubmit,
  submitLabel,
  disabled = false,
  enforceLeadTime = true,
  footer,
}: {
  defaultValues: FormValues;
  onSubmit: (values: FormValues) => void;
  submitLabel: string;
  disabled?: boolean;
  enforceLeadTime?: boolean;
  footer?: ReactNode;
}) {
  const { m } = useI18n();
  const form = useForm<FormValues>({
    resolver: zodResolver(detailsSchema(m, { enforceLeadTime })),
    defaultValues,
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-8" noValidate>
      <fieldset disabled={disabled} className="grid gap-8 disabled:opacity-70">
        <Field id="name" label={m.details.name} hint={m.details.nameHint} error={errors.name?.message}>
          <Input id="name" placeholder={m.details.namePlaceholder} {...form.register("name")} />
        </Field>

        <Field id="occasion" label={m.details.occasion} error={errors.occasion?.message}>
          <Controller
            control={form.control}
            name="occasion"
            render={({ field }) => (
              <Select value={field.value} onValueChange={(value) => field.onChange(value as Occasion)} disabled={disabled}>
                <SelectTrigger id="occasion">
                  <SelectValue>{m.occasion[field.value]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {OCCASIONS.map((occasion) => (
                    <SelectItem key={occasion} value={occasion}>
                      {m.occasion[occasion]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>

        <div className="grid gap-8 sm:grid-cols-2">
          <Field
            id="recipientEstimate"
            label={m.details.recipients}
            hint={m.details.recipientsHint}
            error={errors.recipientEstimate?.message}
          >
            <Input id="recipientEstimate" type="number" inputMode="numeric" min={1} {...form.register("recipientEstimate")} />
          </Field>
          <Field
            id="budgetPerRecipient"
            label={m.details.budget}
            hint={m.details.budgetHint}
            error={errors.budgetPerRecipient?.message}
          >
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center text-sm text-muted-foreground">
                CHF
              </span>
              <Input
                id="budgetPerRecipient"
                type="number"
                inputMode="decimal"
                min={50}
                step={5}
                className="pl-12"
                {...form.register("budgetPerRecipient")}
              />
            </div>
          </Field>
        </div>

        <Field id="deliveryDate" label={m.details.delivery} hint={m.details.deliveryHint} error={errors.deliveryDate?.message}>
          <Input id="deliveryDate" type="date" lang="de-CH" className="sm:max-w-xs" {...form.register("deliveryDate")} />
        </Field>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-8">
        {!disabled && (
          <Button type="submit" size="lg">
            {submitLabel}
          </Button>
        )}
        {footer}
      </div>
    </form>
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-tone-changes">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

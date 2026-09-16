/** Shared recipient form fields and validation (manager dialog, inline edit, confirmation page). */
import { Field } from "@/components/campaign-details-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SwissAddress } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import type { Messages } from "@/lib/messages/en";
import { CANTONS, isEmail, isSwissPostalCode } from "@/lib/swiss";
import { cn } from "@/lib/utils";

export type RecipientDraft = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  address: SwissAddress;
};

export type DraftErrors = Partial<
  Record<"firstName" | "lastName" | "email" | "street" | "postalCode" | "city", string>
>;

export function validateDraft(
  draft: RecipientDraft,
  m: Messages,
  options: { requireAddress: boolean; takenEmails?: string[] },
): DraftErrors {
  const errors: DraftErrors = {};
  const e = m.recipients.errors;
  if (!draft.firstName.trim()) errors.firstName = e.required;
  if (!draft.lastName.trim()) errors.lastName = e.required;
  if (!draft.email.trim()) errors.email = e.required;
  else if (!isEmail(draft.email)) errors.email = e.email;
  else if (options.takenEmails?.some((t) => t.toLowerCase() === draft.email.trim().toLowerCase()))
    errors.email = e.duplicate;

  const a = draft.address;
  const anyAddress = [a.street, a.postalCode, a.city].some((v) => v.trim() !== "");
  if (options.requireAddress || anyAddress) {
    if (!a.street.trim()) errors.street = e.required;
    if (!isSwissPostalCode(a.postalCode)) errors.postalCode = e.postalCode;
    if (!a.city.trim()) errors.city = e.required;
  }
  return errors;
}

export function RecipientFields({
  draft,
  onChange,
  errors,
  idPrefix,
  showCompany = true,
  showIdentity = true,
  compact = false,
}: {
  draft: RecipientDraft;
  onChange: (draft: RecipientDraft) => void;
  errors: DraftErrors;
  idPrefix: string;
  showCompany?: boolean;
  showIdentity?: boolean;
  compact?: boolean;
}) {
  const { m } = useI18n();
  const f = m.recipients.fields;
  const set = (patch: Partial<RecipientDraft>) => onChange({ ...draft, ...patch });
  const setAddress = (patch: Partial<SwissAddress>) =>
    set({ address: { ...draft.address, ...patch } });
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className={cn("grid gap-5", compact && "gap-4")}>
      {showIdentity && (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={id("first")} label={f.firstName} error={errors.firstName}>
              <Input
                id={id("first")}
                autoComplete="given-name"
                value={draft.firstName}
                onChange={(e) => set({ firstName: e.target.value })}
              />
            </Field>
            <Field id={id("last")} label={f.lastName} error={errors.lastName}>
              <Input
                id={id("last")}
                autoComplete="family-name"
                value={draft.lastName}
                onChange={(e) => set({ lastName: e.target.value })}
              />
            </Field>
          </div>
          <Field id={id("email")} label={f.email} error={errors.email}>
            <Input
              id={id("email")}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={draft.email}
              onChange={(e) => set({ email: e.target.value })}
            />
          </Field>
          {showCompany && (
            <Field id={id("company")} label={f.company}>
              <Input
                id={id("company")}
                autoComplete="organization"
                value={draft.company}
                onChange={(e) => set({ company: e.target.value })}
              />
            </Field>
          )}
        </>
      )}
      <Field id={id("street")} label={f.street} error={errors.street}>
        <Input
          id={id("street")}
          autoComplete="street-address"
          placeholder={m.recipients.streetPlaceholder}
          value={draft.address.street}
          onChange={(e) => setAddress({ street: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4 sm:grid-cols-[7rem_minmax(0,1fr)_10rem]">
        <Field id={id("plz")} label={f.postalCode} error={errors.postalCode}>
          <Input
            id={id("plz")}
            autoComplete="postal-code"
            inputMode="numeric"
            maxLength={4}
            placeholder="8001"
            value={draft.address.postalCode}
            onChange={(e) =>
              setAddress({ postalCode: e.target.value.replace(/\D/g, "").slice(0, 4) })
            }
          />
        </Field>
        <Field id={id("city")} label={f.city} error={errors.city}>
          <Input
            id={id("city")}
            autoComplete="address-level2"
            placeholder={m.recipients.cityPlaceholder}
            value={draft.address.city}
            onChange={(e) => setAddress({ city: e.target.value })}
          />
        </Field>
        <div className="col-span-2 sm:col-span-1">
          <Field id={id("canton")} label={f.canton}>
            <Select value={draft.address.canton} onValueChange={(canton) => setAddress({ canton })}>
              <SelectTrigger id={id("canton")}>
                <SelectValue placeholder="–" />
              </SelectTrigger>
              <SelectContent>
                {CANTONS.map(([code, name]) => (
                  <SelectItem key={code} value={code}>
                    {code} · {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>
    </div>
  );
}

export const emptyDraft = (): RecipientDraft => ({
  firstName: "",
  lastName: "",
  email: "",
  company: "",
  address: { street: "", postalCode: "", city: "", canton: "" },
});

export const hasErrors = (errors: DraftErrors) => Object.keys(errors).length > 0;

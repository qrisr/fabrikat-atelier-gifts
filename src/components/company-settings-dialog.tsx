/** Company (workspace) details used for quotes and notification emails. */
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/campaign-details-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Company } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import { actions } from "@/lib/store";
import { isEmail } from "@/lib/swiss";

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter((part) => /^[\p{L}]/u.test(part))
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

export function CompanySettingsDialog({
  company,
  open,
  onOpenChange,
}: {
  company: Company;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { m } = useI18n();
  const [draft, setDraft] = useState(company);
  const [errors, setErrors] = useState<Partial<Record<"name" | "contactEmail", string>>>({});

  useEffect(() => {
    if (open) {
      setDraft(company);
      setErrors({});
    }
  }, [open, company]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">
            {m.workspace.settingsTitle}
          </DialogTitle>
          <DialogDescription>{m.workspace.settingsIntro}</DialogDescription>
        </DialogHeader>
        <form
          id="company-settings"
          noValidate
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            const found: typeof errors = {};
            if (!draft.name.trim()) found.name = m.workspace.required;
            if (draft.contactEmail.trim() && !isEmail(draft.contactEmail))
              found.contactEmail = m.workspace.invalidEmail;
            setErrors(found);
            if (Object.keys(found).length) return;
            actions.updateCompany(company.id, {
              name: draft.name.trim(),
              initials: initialsOf(draft.name) || company.initials,
              contactName: draft.contactName.trim(),
              contactEmail: draft.contactEmail.trim(),
            });
            toast.success(m.workspace.saved);
            onOpenChange(false);
          }}
        >
          <Field id="company-name" label={m.workspace.name} error={errors.name}>
            <Input
              id="company-name"
              autoComplete="organization"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Field>
          <Field id="company-contact" label={m.workspace.contactName}>
            <Input
              id="company-contact"
              autoComplete="name"
              value={draft.contactName}
              onChange={(e) => setDraft({ ...draft, contactName: e.target.value })}
            />
          </Field>
          <Field id="company-email" label={m.workspace.contactEmail} error={errors.contactEmail}>
            <Input
              id="company-email"
              type="email"
              autoComplete="email"
              value={draft.contactEmail}
              onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })}
            />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {m.workspace.cancel}
          </Button>
          <Button type="submit" form="company-settings">
            {m.workspace.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

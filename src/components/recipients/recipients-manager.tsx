/** Recipient collection: CSV import, share link, list with inline editing, form preview. */
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  FileUp,
  Link2,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ConfirmForm } from "@/components/recipients/confirm-form";
import {
  RecipientFields,
  type DraftErrors,
  type RecipientDraft,
  emptyDraft,
  hasErrors,
  validateDraft,
} from "@/components/recipients/recipient-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CSV_TEMPLATE, type CsvProblem, importRecipientsCsv } from "@/lib/csv";
import { type Campaign, type Recipient, type RecipientStatus, isLocked } from "@/lib/domain";
import { downloadText, readAsText } from "@/lib/files";
import { useI18n } from "@/lib/i18n";
import { getRepository } from "@/lib/data";
import { inviteRecipients } from "@/lib/integrations-client";
import type { Messages } from "@/lib/messages/en";
import { actions, useAppState } from "@/lib/store";
import { isAddressComplete } from "@/lib/swiss";
import { cn } from "@/lib/utils";

/** Absolute confirmation URL; origin is filled in after hydration to avoid SSR mismatches. */
export function useConfirmUrl() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  return (token: string) => `${origin}/confirm/${token}`;
}

export function RecipientsManager({
  campaign,
  recipients,
}: {
  campaign: Campaign;
  recipients: Recipient[];
}) {
  const { m } = useI18n();
  const { companies } = useAppState();
  const locked = isLocked(campaign);
  const company = companies.find((c) => c.id === campaign.companyId);
  const [filter, setFilter] = useState<RecipientStatus | "all">("all");
  const [adding, setAdding] = useState(false);
  const [sending, setSending] = useState(false);
  const visible = useMemo(
    () => (filter === "all" ? recipients : recipients.filter((r) => r.status === filter)),
    [recipients, filter],
  );
  const counts = useMemo(() => {
    const c = { pending: 0, link_sent: 0, confirmed: 0 };
    recipients.forEach((r) => c[r.status]++);
    return c;
  }, [recipients]);
  const toNotify = recipients.filter((r) => r.status === "pending");
  const confirmUrl = useConfirmUrl();

  return (
    <div className="space-y-12">
      {locked && (
        <p className="rounded-sm border border-border bg-secondary px-4 py-3 text-sm">
          {m.recipients.locked}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <CsvImport campaign={campaign} recipients={recipients} disabled={locked} />
        <ShareLink campaign={campaign} />
      </div>

      <section aria-labelledby="recipient-list">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 id="recipient-list" className="font-display text-2xl">
              {m.recipients.listTitle}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {m.recipients.listCount(recipients.length)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {toNotify.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                title={m.recipients.sendLinksHint}
                disabled={sending}
                onClick={async () => {
                  setSending(true);
                  const invited = await inviteRecipients(
                    campaign.id,
                    toNotify.map((r) => r.id),
                    m,
                  );
                  actions.markLinksSent(campaign.id, invited);
                  setSending(false);
                }}
              >
                <Send className="size-4" /> {m.recipients.sendLinks} ({toNotify.length})
              </Button>
            )}
            {!locked && (
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus className="size-4" /> {m.recipients.add}
              </Button>
            )}
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={m.recipients.statusCol}>
          {(["all", "confirmed", "link_sent", "pending"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                "h-8 rounded-full border px-3 text-xs transition-colors",
                filter === key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:border-foreground/40",
              )}
            >
              {key === "all" ? m.recipients.filterAll : m.recipients.statusLabel[key]}{" "}
              <span className="tabular-nums opacity-70">
                {key === "all" ? recipients.length : counts[key]}
              </span>
            </button>
          ))}
        </div>

        {recipients.length === 0 ? (
          <RecipientsGuide />
        ) : (
          <div className="overflow-hidden rounded-sm border border-border bg-card">
            <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_8.5rem_7.5rem] gap-4 border-b border-border px-5 py-3 text-[0.6875rem] uppercase tracking-[0.1em] text-muted-foreground md:grid">
              <span>{m.recipients.name}</span>
              <span>{m.recipients.address}</span>
              <span>{m.recipients.statusCol}</span>
              <span className="sr-only">{m.recipients.actionsCol}</span>
            </div>
            <ul className="divide-y divide-border">
              {visible.map((recipient) => (
                <RecipientRow
                  key={recipient.id}
                  recipient={recipient}
                  recipients={recipients}
                  canRemove={!locked}
                />
              ))}
            </ul>
          </div>
        )}
      </section>

      <section
        aria-labelledby="form-preview"
        className="grid gap-8 rounded-sm border border-border bg-secondary/50 p-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:p-10"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            {m.recipients.openForm}
          </p>
          <h2 id="form-preview" className="mt-3 font-display text-3xl">
            {m.confirm.preview}
          </h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            {m.recipients.linkBody}
          </p>
          <Button asChild variant="outline" className="mt-6">
            <a href={confirmUrl(campaign.shareToken)} target="_blank" rel="noreferrer">
              <Link2 className="size-4" /> {m.recipients.openForm}
            </a>
          </Button>
        </div>
        <div className="mx-auto w-full max-w-[24rem] rounded-[1.75rem] border-[6px] border-foreground/85 bg-background p-6 shadow-xl">
          <ConfirmForm
            preview
            context={{
              campaign: {
                id: campaign.id,
                templateId: campaign.templateId,
                deliveryDate: campaign.deliveryDate,
                status: campaign.status,
                companyName: company?.name ?? "",
              },
              recipient: null,
            }}
          />
        </div>
      </section>

      <div className="flex justify-end border-t border-border pt-8">
        <Button asChild size="lg">
          <Link to="/campaigns/$campaignId/quote" params={{ campaignId: campaign.id }}>
            {m.recipients.continue} <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <AddRecipientDialog
        open={adding}
        onOpenChange={setAdding}
        campaign={campaign}
        recipients={recipients}
      />
    </div>
  );
}

/** Every new recipient gets a personal link to confirm (or complete) their address. */
async function inviteNew(campaignId: string, created: Recipient[], m: Messages) {
  const ids = created.filter((r) => r.status !== "confirmed").map((r) => r.id);
  if (ids.length === 0) return;
  // Give the repository a moment to persist the new rows before the server reads them.
  await getRepository().flush();
  const invited = await inviteRecipients(campaignId, ids, m);
  actions.markLinksSent(campaignId, invited);
}

function RecipientsGuide() {
  const { m } = useI18n();
  const g = m.recipients.guide;
  const columns: Array<[string, boolean]> = [
    ["first_name", true],
    ["last_name", true],
    ["email", true],
    ["company", false],
    ["street", false],
    ["postal_code", false],
    ["city", false],
    ["canton", false],
  ];
  return (
    <section
      className="rounded-sm border border-dashed border-border bg-card p-6 sm:p-8"
      data-testid="recipients-guide"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">{g.eyebrow}</p>
      <h3 className="mt-2 font-display text-2xl">{g.title}</h3>
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <h4 className="flex items-center gap-2 font-medium">
            <FileUp className="size-4 text-brand" /> {g.csvTitle}
          </h4>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            {g.csvSteps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="font-display text-foreground">{index + 1}</span> {step}
              </li>
            ))}
          </ol>
          <p className="mt-5 text-xs uppercase tracking-[0.1em] text-muted-foreground">
            {g.columnsTitle}
          </p>
          <div className="mt-2 overflow-x-auto rounded-sm border border-border">
            <table className="w-full min-w-[34rem] text-left font-mono text-[0.6875rem]">
              <thead className="bg-secondary">
                <tr>
                  {columns.map(([name, required]) => (
                    <th key={name} className="px-2 py-1.5 font-medium">
                      {name}
                      <span
                        className={cn(
                          "block font-sans font-normal",
                          required ? "text-brand" : "text-muted-foreground",
                        )}
                      >
                        {required ? g.required : g.optional}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="text-muted-foreground">
                  {[
                    "Lea",
                    "Meier",
                    "lea.meier@beispiel.ch",
                    "Beispiel AG",
                    "Seefeldstrasse 12",
                    "8008",
                    "Zürich",
                    "ZH",
                  ].map((v) => (
                    <td key={v} className="border-t border-border px-2 py-1.5">
                      {v}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => downloadText("fabrikat-empfaenger-vorlage.csv", `\uFEFF${CSV_TEMPLATE}`)}
          >
            <Download className="size-4" /> {m.recipients.csvTemplate}
          </Button>
        </div>
        <div>
          <h4 className="flex items-center gap-2 font-medium">
            <Link2 className="size-4 text-brand" /> {g.linkTitle}
          </h4>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            {g.linkSteps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="font-display text-foreground">{index + 1}</span> {step}
              </li>
            ))}
          </ol>
          <p className="mt-5 text-xs text-muted-foreground">{g.privacy}</p>
        </div>
      </div>
    </section>
  );
}

function Panel({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: typeof FileUp;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-sm border border-border bg-card p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary">
          <Icon className="size-4 text-brand" strokeWidth={1.6} />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-tight">{title}</h2>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{body}</p>
        </div>
      </div>
      <div className="mt-6 flex flex-1 flex-col">{children}</div>
    </section>
  );
}

function CsvImport({
  campaign,
  recipients,
  disabled,
}: {
  campaign: Campaign;
  recipients: Recipient[];
  disabled: boolean;
}) {
  const { m } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<{ added: number; problems: CsvProblem[] } | null>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    const text = await readAsText(file);
    const parsed = importRecipientsCsv(
      text,
      recipients.map((r) => r.email),
    );
    const created = parsed.rows.length > 0 ? actions.addRecipients(campaign.id, parsed.rows) : [];
    setResult({ added: created.length, problems: parsed.problems });
    await inviteNew(campaign.id, created, m);
  }

  return (
    <Panel icon={FileUp} title={m.recipients.csvTitle} body={m.recipients.csvBody}>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) void handle(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-3 rounded-sm border border-dashed px-4 py-8 text-center transition-colors",
          dragging ? "border-brand bg-brand/5" : "border-border",
          disabled ? "opacity-60" : "cursor-pointer hover:border-foreground/40",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          disabled={disabled}
          data-testid="csv-input"
          onChange={(e) => {
            void handle(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <span className="inline-flex h-9 items-center rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground">
          {m.recipients.csvChoose}
        </span>
        <span className="text-xs text-muted-foreground">{m.recipients.csvDrop}</span>
      </label>
      <button
        type="button"
        onClick={() => downloadText("fabrikat-empfaenger-vorlage.csv", `\uFEFF${CSV_TEMPLATE}`)}
        className="mt-4 inline-flex items-center gap-2 self-start text-sm text-foreground underline-offset-4 hover:underline"
      >
        <Download className="size-4" /> {m.recipients.csvTemplate}
      </button>
      {result && <CsvResultMessage added={result.added} problems={result.problems} />}
    </Panel>
  );
}

export function CsvResultMessage({ added, problems }: { added: number; problems: CsvProblem[] }) {
  const { m } = useI18n();
  const p = m.recipients.csvProblems;
  const col = (c: keyof typeof m.recipients.columns) => m.recipients.columns[c];
  const text = (problem: CsvProblem) => {
    switch (problem.kind) {
      case "empty_file":
        return p.empty_file;
      case "missing_headers":
        return p.missing_headers(problem.missing.map(col).join(", "), problem.found.join(", "));
      case "empty_row":
        return p.empty_row(problem.line);
      case "missing_value":
        return p.missing_value(problem.line, col(problem.column));
      case "invalid_email":
        return p.invalid_email(problem.line, problem.value);
      case "invalid_postal_code":
        return p.invalid_postal_code(problem.line, problem.value);
      case "invalid_canton":
        return p.invalid_canton(problem.line, problem.value);
      case "duplicate_email":
        return p.duplicate_email(problem.line, problem.value);
    }
  };
  const rowProblems = problems.filter(
    (x) => x.kind !== "empty_file" && x.kind !== "missing_headers",
  );
  const fatal = problems.find((x) => x.kind === "empty_file" || x.kind === "missing_headers");

  return (
    <div className="mt-4 space-y-2 text-sm" role="status" data-testid="csv-result">
      {added > 0 && (
        <p className="flex items-center gap-2 text-tone-approved">
          <Check className="size-4" /> {m.recipients.csvImported(added)}
        </p>
      )}
      {fatal && (
        <p
          role="alert"
          className="rounded-sm border border-tone-changes/30 bg-tone-changes/5 px-3 py-2 text-tone-changes"
        >
          {text(fatal)}
        </p>
      )}
      {rowProblems.length > 0 && (
        <div
          role="alert"
          className="rounded-sm border border-tone-review/30 bg-tone-review/5 px-3 py-2"
        >
          <p className="font-medium">
            {m.recipients.csvSkipped(
              new Set(rowProblems.map((x) => ("line" in x ? x.line : 0))).size,
            )}
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
            {rowProblems.slice(0, 8).map((problem, i) => (
              <li key={i}>{text(problem)}</li>
            ))}
            {rowProblems.length > 8 && <li>…</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

export function CopyButton({
  value,
  label,
  iconOnly = false,
}: {
  value: string;
  label: string;
  iconOnly?: boolean;
}) {
  const { m } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant={iconOnly ? "ghost" : "primary"}
      size={iconOnly ? "sm" : "default"}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          /* clipboard unavailable — the link stays visible to copy manually */
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {!iconOnly && (copied ? m.recipients.copied : label)}
    </Button>
  );
}

function ShareLink({ campaign }: { campaign: Campaign }) {
  const { m } = useI18n();
  const url = useConfirmUrl()(campaign.shareToken);
  return (
    <Panel icon={Link2} title={m.recipients.linkTitle} body={m.recipients.linkBody}>
      <div className="flex flex-1 flex-col justify-center gap-3">
        <input
          readOnly
          value={url}
          aria-label={m.recipients.linkTitle}
          data-testid="share-link"
          onFocus={(e) => e.currentTarget.select()}
          className="h-11 w-full truncate rounded-sm border border-input bg-paper px-3.5 font-mono text-xs"
        />
        <div className="flex flex-wrap gap-2">
          <CopyButton value={url} label={m.recipients.copy} />
          <Button asChild variant="outline">
            <a href={url} target="_blank" rel="noreferrer">
              {m.recipients.openForm}
            </a>
          </Button>
        </div>
      </div>
    </Panel>
  );
}

export function RecipientStatusBadge({ status }: { status: RecipientStatus }) {
  const { m } = useI18n();
  const tone = {
    confirmed: "text-tone-approved bg-tone-approved/10 border-tone-approved/25",
    link_sent: "text-tone-submitted bg-tone-submitted/10 border-tone-submitted/25",
    pending: "text-tone-review bg-tone-review/10 border-tone-review/30",
  }[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs",
        tone,
      )}
      data-status={status}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {m.recipients.statusLabel[status]}
    </span>
  );
}

function RecipientRow({
  recipient,
  recipients,
  canRemove,
}: {
  recipient: Recipient;
  recipients: Recipient[];
  canRemove: boolean;
}) {
  const { m } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RecipientDraft>(recipient);
  const [errors, setErrors] = useState<DraftErrors>({});
  const confirmUrl = useConfirmUrl();
  const a = recipient.address;
  const complete = isAddressComplete(a);

  if (editing) {
    return (
      <li className="bg-secondary/40 px-5 py-6" data-testid={`recipient-${recipient.email}`}>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const found = validateDraft(draft, m, {
              requireAddress: false,
              takenEmails: recipients.filter((r) => r.id !== recipient.id).map((r) => r.email),
            });
            setErrors(found);
            if (hasErrors(found)) return;
            actions.updateRecipient(recipient.id, {
              firstName: draft.firstName.trim(),
              lastName: draft.lastName.trim(),
              email: draft.email.trim(),
              company: draft.company.trim(),
              address: draft.address,
            });
            setEditing(false);
          }}
        >
          <RecipientFields
            idPrefix={`edit-${recipient.id}`}
            draft={draft}
            onChange={setDraft}
            errors={errors}
            compact
          />
          <div className="mt-5 flex gap-2">
            <Button type="submit" size="sm">
              <Check className="size-4" /> {m.recipients.save}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setDraft(recipient);
                setErrors({});
                setEditing(false);
              }}
            >
              <X className="size-4" /> {m.recipients.cancel}
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li
      className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_8.5rem_7.5rem] md:items-center md:gap-4"
      data-testid={`recipient-${recipient.email}`}
    >
      <div className="min-w-0">
        <p className="truncate font-medium">
          {recipient.firstName} {recipient.lastName}
        </p>
        <p className="truncate text-sm text-muted-foreground">{recipient.email}</p>
      </div>
      <p className={cn("min-w-0 text-sm", !complete && "italic text-muted-foreground")}>
        {complete ? (
          <>
            <span className="block truncate">{a.street}</span>
            <span className="block truncate">
              {a.postalCode} {a.city}
              {a.canton && ` ${a.canton}`}
            </span>
          </>
        ) : (
          m.recipients.addressMissing
        )}
      </p>
      <div>
        <RecipientStatusBadge status={recipient.status} />
      </div>
      <div className="flex gap-1 md:justify-end">
        <CopyButton
          value={confirmUrl(recipient.token)}
          label={m.recipients.copyPersonal}
          iconOnly
        />
        <Button
          variant="ghost"
          size="sm"
          aria-label={m.recipients.edit}
          title={m.recipients.edit}
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-4" />
        </Button>
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={m.recipients.remove}
            title={m.recipients.remove}
            onClick={() => actions.removeRecipient(recipient.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </li>
  );
}

function AddRecipientDialog({
  open,
  onOpenChange,
  campaign,
  recipients,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  recipients: Recipient[];
}) {
  const { m } = useI18n();
  const [draft, setDraft] = useState<RecipientDraft>(emptyDraft);
  const [errors, setErrors] = useState<DraftErrors>({});

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setDraft(emptyDraft());
          setErrors({});
        }
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">
            {m.recipients.dialogTitle}
          </DialogTitle>
        </DialogHeader>
        <form
          id="add-recipient"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const found = validateDraft(draft, m, {
              requireAddress: false,
              takenEmails: recipients.map((r) => r.email),
            });
            setErrors(found);
            if (hasErrors(found)) return;
            const created = actions.addRecipients(campaign.id, [
              {
                firstName: draft.firstName.trim(),
                lastName: draft.lastName.trim(),
                email: draft.email.trim(),
                company: draft.company.trim(),
                address: draft.address,
                preferences: {},
              },
            ]);
            void inviteNew(campaign.id, created, m);
            onOpenChange(false);
            setDraft(emptyDraft());
          }}
        >
          <RecipientFields idPrefix="add" draft={draft} onChange={setDraft} errors={errors} />
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {m.recipients.cancel}
          </Button>
          <Button type="submit" form="add-recipient">
            {m.recipients.add}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

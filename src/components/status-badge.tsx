import type { CampaignStatus } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const toneClass: Record<CampaignStatus, string> = {
  draft: "text-tone-draft bg-tone-draft/10 border-tone-draft/25",
  submitted: "text-tone-submitted bg-tone-submitted/10 border-tone-submitted/25",
  under_review: "text-tone-review bg-tone-review/10 border-tone-review/30",
  approved: "text-tone-approved bg-tone-approved/10 border-tone-approved/25",
  changes_requested: "text-tone-changes bg-tone-changes/10 border-tone-changes/25",
};

export function StatusBadge({ status, className }: { status: CampaignStatus; className?: string }) {
  const { m } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-2 rounded-full border px-3 text-xs font-medium",
        toneClass[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {m.status[status]}
    </span>
  );
}

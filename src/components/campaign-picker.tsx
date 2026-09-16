/** Chooses the campaign for the sidebar pages (Recipients, Quote Review). */
import { StatusBadge } from "@/components/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Campaign } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";

export function CampaignPicker({
  campaigns,
  value,
  onChange,
}: {
  campaigns: Campaign[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { m } = useI18n();
  return (
    <div className="grid gap-2 md:w-[22rem]">
      <label htmlFor="campaign-picker" className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
        {m.recipients.campaignPicker}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="campaign-picker">
          <SelectValue>{campaigns.find((c) => c.id === value)?.name}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {campaigns.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <span className="flex items-center gap-3">
                <span className="truncate">{c.name}</span>
                <StatusBadge status={c.status} className="h-5 px-2 text-[0.625rem]" />
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Picks the campaign from ?campaign=, else the most recently updated one. */
export function resolveCampaign(campaigns: Campaign[], requested: string | undefined) {
  const sorted = [...campaigns].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return sorted.find((c) => c.id === requested) ?? sorted[0];
}

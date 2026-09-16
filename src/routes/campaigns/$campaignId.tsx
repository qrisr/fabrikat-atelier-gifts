import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Check, Lock, SearchX } from "lucide-react";

import { EmptyState, PageContainer } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { FLOW_STEPS } from "@/lib/campaign-flow";
import { isLocked } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import { useCampaign } from "@/lib/use-campaign";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/campaigns/$campaignId")({
  head: () => ({ meta: [{ title: "Campaign — Fabrikat Gift Atelier" }] }),
  component: CampaignLayout,
});

function CampaignLayout() {
  const { m } = useI18n();
  const { campaignId } = Route.useParams();
  const { campaign } = useCampaign(campaignId);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentIndex = FLOW_STEPS.findIndex((step) => pathname.endsWith(`/${step}`));

  if (!campaign) {
    return (
      <PageContainer>
        <EmptyState
          icon={SearchX}
          eyebrow={m.flow.back}
          title={m.flow.notFoundTitle}
          description={m.flow.notFoundBody}
          action={{ label: m.flow.back, to: "/" }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {m.flow.back}
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-[16rem] truncate text-sm text-muted-foreground sm:inline">{campaign.name}</span>
          <StatusBadge status={campaign.status} />
        </div>
      </div>

      <nav aria-label={m.flow.stepLabel(Math.max(currentIndex, 0) + 1, FLOW_STEPS.length)} className="mb-10 border-y border-border">
        <ol className="-mx-1 flex overflow-x-auto py-1">
          {FLOW_STEPS.map((step, index) => {
            const active = index === currentIndex;
            const done = currentIndex > index;
            return (
              <li key={step} className="shrink-0">
                <Link
                  to={`/campaigns/$campaignId/${step}`}
                  params={{ campaignId }}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex h-12 items-center gap-2.5 px-3 text-sm transition-colors sm:px-4",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-full border text-[0.6875rem] tabular-nums",
                      active && "border-foreground bg-foreground text-background",
                      done && "border-brand text-brand",
                    )}
                  >
                    {done ? <Check className="size-3" /> : index + 1}
                  </span>
                  <span className={cn(active && "font-medium")}>{m.flow.steps[step]}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      {isLocked(campaign) && (
        <p className="mb-8 flex items-start gap-3 rounded-sm border border-border bg-secondary px-4 py-3 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-brand" /> {m.flow.locked}
        </p>
      )}

      <Outlet />
    </PageContainer>
  );
}

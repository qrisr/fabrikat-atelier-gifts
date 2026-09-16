import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { CostSummary } from "@/components/cost-summary";
import { TemplateCard } from "@/components/template-card";
import { Button } from "@/components/ui/button";
import { GIFT_TEMPLATES } from "@/lib/catalog";
import { isLocked } from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import { actions } from "@/lib/store";
import { useCampaign } from "@/lib/use-campaign";

export const Route = createFileRoute("/campaigns/$campaignId/template")({
  component: TemplateStep,
});

function TemplateStep() {
  const { m } = useI18n();
  const { campaignId } = Route.useParams();
  const { campaign, recipients } = useCampaign(campaignId);
  if (!campaign) return null;
  const locked = isLocked(campaign);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-brand">{m.gallery.eyebrow}</p>
        <h1 className="font-display text-4xl">{m.gallery.title}</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">{m.gallery.intro}</p>
        <ul className="mt-10 grid gap-6 xl:grid-cols-2">
          {GIFT_TEMPLATES.map((template) => {
            const selected = campaign.templateId === template.id;
            return (
              <li key={template.id}>
                <TemplateCard
                  template={template}
                  selected={selected}
                  budget={campaign.budgetPerRecipient}
                  action={
                    <Button
                      className="w-full"
                      variant={selected ? "primary" : "outline"}
                      disabled={locked}
                      aria-pressed={selected}
                      onClick={() => actions.selectTemplate(campaign.id, template.id)}
                    >
                      {selected ? m.gallery.selected : m.gallery.select}
                    </Button>
                  }
                />
              </li>
            );
          })}
        </ul>
      </section>
      <div>
        <CostSummary
          campaign={campaign}
          actualRecipients={recipients.length}
          footer={
            campaign.templateId && (
              <Button asChild size="lg" className="w-full">
                <Link to="/campaigns/$campaignId/personalize" params={{ campaignId }}>
                  {m.flow.continue} <ArrowRight className="size-4" />
                </Link>
              </Button>
            )
          }
        />
      </div>
    </div>
  );
}

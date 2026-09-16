import { createFileRoute } from "@tanstack/react-router";
import { FileCheck2 } from "lucide-react";

import { EmptyState, PageContainer, PageIntro } from "@/components/empty-state";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/quote-review")({
  head: () => ({ meta: [
    { title: "Quote Review — Fabrikat Gift Atelier" },
    { name: "description", content: "Review the details and quotation for your Fabrikat gifting campaign." },
    { property: "og:title", content: "Quote Review — Fabrikat Gift Atelier" },
    { property: "og:description", content: "Review the details and quotation for your Fabrikat gifting campaign." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Page,
});

function Page() {
  const { m } = useI18n();
  const t = m.pages.quoteReview;
  return (
    <PageContainer>
      <PageIntro eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <EmptyState
        icon={FileCheck2}
        eyebrow={t.emptyEyebrow}
        title={t.emptyTitle}
        description={t.emptyBody}
        action={{ label: t.emptyAction, to: "/" }}
      />
    </PageContainer>
  );
}

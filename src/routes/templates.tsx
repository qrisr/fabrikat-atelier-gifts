import { createFileRoute } from "@tanstack/react-router";
import { Gift } from "lucide-react";

import { EmptyState, PageContainer, PageIntro } from "@/components/empty-state";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [
    { title: "Gift Templates — Fabrikat Gift Atelier" },
    { name: "description", content: "Explore curated Swiss gift sets for your company recipients." },
    { property: "og:title", content: "Gift Templates — Fabrikat Gift Atelier" },
    { property: "og:description", content: "Explore curated Swiss gift sets for your company recipients." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Page,
});

function Page() {
  const { m } = useI18n();
  const t = m.pages.templates;
  return (
    <PageContainer>
      <PageIntro eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <EmptyState
        icon={Gift}
        eyebrow={t.emptyEyebrow}
        title={t.emptyTitle}
        description={t.emptyBody}
        action={{ label: t.emptyAction, to: "/" }}
      />
    </PageContainer>
  );
}

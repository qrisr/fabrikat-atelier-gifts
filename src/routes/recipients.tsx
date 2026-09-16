import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { EmptyState, PageContainer, PageIntro } from "@/components/empty-state";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/recipients")({
  head: () => ({ meta: [
    { title: "Recipient Manager — Fabrikat Gift Atelier" },
    { name: "description", content: "Organize employees, clients, and partners for your Fabrikat gifting campaign." },
    { property: "og:title", content: "Recipient Manager — Fabrikat Gift Atelier" },
    { property: "og:description", content: "Organize employees, clients, and partners for your Fabrikat gifting campaign." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Page,
});

function Page() {
  const { m } = useI18n();
  const t = m.pages.recipients;
  return (
    <PageContainer>
      <PageIntro eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <EmptyState
        icon={Users}
        eyebrow={t.emptyEyebrow}
        title={t.emptyTitle}
        description={t.emptyBody}
        action={{ label: t.emptyAction, to: "/" }}
      />
    </PageContainer>
  );
}

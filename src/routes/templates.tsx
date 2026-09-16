import { Link, createFileRoute } from "@tanstack/react-router";

import { PageContainer, PageIntro } from "@/components/empty-state";
import { TemplateCard } from "@/components/template-card";
import { Button } from "@/components/ui/button";
import { GIFT_TEMPLATES } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Geschenksets — Fabrikat Gift Atelier" },
      {
        name: "description",
        content: "Kuratierte Geschenksets aus Schweizer Manufakturen für Ihre Empfänger.",
      },
      { property: "og:title", content: "Geschenksets — Fabrikat Gift Atelier" },
      {
        property: "og:description",
        content: "Kuratierte Geschenksets aus Schweizer Manufakturen für Ihre Empfänger.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { m } = useI18n();
  const t = m.pages.templates;
  return (
    <PageContainer>
      <PageIntro eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <ul className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
        {GIFT_TEMPLATES.map((template) => (
          <li key={template.id}>
            <TemplateCard
              template={template}
              action={
                <Button asChild variant="outline" className="w-full">
                  <Link to="/campaigns/new" search={{ template: template.id }}>
                    {m.gallery.startWith}
                  </Link>
                </Button>
              }
            />
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Gift } from "lucide-react";

import { EmptyState, PageIntro } from "@/components/empty-state";

export const Route = createFileRoute("/templates")({
  head: () => ({ meta: [
    { title: "Gift Templates — Fabrikat Gift Atelier" },
    { name: "description", content: "Explore curated Swiss gift sets for your company recipients." },
    { property: "og:title", content: "Gift Templates — Fabrikat Gift Atelier" },
    { property: "og:description", content: "Explore curated Swiss gift sets for your company recipients." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: TemplatesPage,
});

function TemplatesPage() {
  return <div className="mx-auto max-w-[90rem] px-5 py-12 sm:px-10 sm:py-16 xl:px-16 xl:py-20">
    <PageIntro eyebrow="Curated collection" title="Gift Templates" description="Considered objects, assembled in Zurich. Choose a starting point and make it distinctly yours." />
    <EmptyState icon={Gift} eyebrow="Collection arriving soon" title="A quieter kind of gifting." description="Our atelier is preparing this season’s selection of enduring objects and thoughtful editions." action="Notify me when ready" />
  </div>;
}
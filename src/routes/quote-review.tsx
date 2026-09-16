import { createFileRoute } from "@tanstack/react-router";
import { FileCheck2 } from "lucide-react";

import { EmptyState, PageIntro } from "@/components/empty-state";

export const Route = createFileRoute("/quote-review")({
  head: () => ({ meta: [
    { title: "Quote Review — Fabrikat Gift Atelier" },
    { name: "description", content: "Review the details and quotation for your Fabrikat gifting campaign." },
    { property: "og:title", content: "Quote Review — Fabrikat Gift Atelier" },
    { property: "og:description", content: "Review the details and quotation for your Fabrikat gifting campaign." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: QuoteReviewPage,
});

function QuoteReviewPage() {
  return <div className="mx-auto max-w-[90rem] px-5 py-12 sm:px-10 sm:py-16 xl:px-16 xl:py-20">
    <PageIntro eyebrow="Final consideration" title="Quote Review" description="A clear view of your chosen gifts, personal details, quantities, and atelier services." />
    <EmptyState icon={FileCheck2} eyebrow="Nothing to review" title="Your quote begins with a campaign." description="Once your selection is ready, Fabrikat will review every detail and prepare a considered proposal." action="Create a campaign" />
  </div>;
}
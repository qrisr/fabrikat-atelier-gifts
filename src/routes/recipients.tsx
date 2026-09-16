import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { EmptyState, PageIntro } from "@/components/empty-state";

export const Route = createFileRoute("/recipients")({
  head: () => ({ meta: [
    { title: "Recipient Manager — Fabrikat Gift Atelier" },
    { name: "description", content: "Organize employees, clients, and partners for your Fabrikat gifting campaign." },
    { property: "og:title", content: "Recipient Manager — Fabrikat Gift Atelier" },
    { property: "og:description", content: "Organize employees, clients, and partners for your Fabrikat gifting campaign." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: RecipientsPage,
});

function RecipientsPage() {
  return <div className="mx-auto max-w-[90rem] px-5 py-12 sm:px-10 sm:py-16 xl:px-16 xl:py-20">
    <PageIntro eyebrow="People & delivery" title="Recipient Manager" description="Keep every name, address, and personal detail considered and in one place." />
    <EmptyState icon={Users} eyebrow="No recipients yet" title="Begin with the people." description="Add recipients individually or bring in your prepared list to begin planning delivery." action="Add recipients" />
  </div>;
}
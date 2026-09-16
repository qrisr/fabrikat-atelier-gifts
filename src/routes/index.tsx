import { createFileRoute } from "@tanstack/react-router";
import { Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Campaign Dashboard — Fabrikat Gift Atelier" },
      { name: "description", content: "Plan and manage premium year-end gifting campaigns with Fabrikat." },
      { property: "og:title", content: "Campaign Dashboard — Fabrikat Gift Atelier" },
      { property: "og:description", content: "Plan and manage premium year-end gifting campaigns with Fabrikat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="mx-auto max-w-[90rem] px-5 py-12 sm:px-10 sm:py-16 xl:px-16 xl:py-20">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6 border-b border-border pb-12">
        <div className="min-w-0">
          <p className="mb-5 text-xs font-semibold uppercase text-brand">Campaign dashboard</p>
          <h1 className="font-display text-4xl font-medium text-foreground sm:text-5xl">Good evening, Anna.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            Shape your next gesture of appreciation with objects made to last.
          </p>
        </div>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <Sparkles className="size-4 text-brand" /> Year-end 2026
        </div>
      </header>

      <section className="grid min-h-[31rem] place-items-center py-16 text-center">
        <div className="max-w-lg">
          <div className="mx-auto mb-8 grid size-16 place-items-center rounded-full border border-border bg-secondary">
            <Plus className="size-6 text-primary" strokeWidth={1.4} />
          </div>
          <p className="mb-4 text-xs font-semibold uppercase text-brand">Your first campaign</p>
          <h2 className="font-display text-3xl font-medium text-foreground sm:text-4xl">Begin with a thoughtful brief.</h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-muted-foreground">
            Select a curated gift set, refine the details, and invite Fabrikat to prepare your tailored quote.
          </p>
          <Button className="mt-8">
            <Plus className="size-4" /> Create campaign
          </Button>
        </div>
      </section>
    </div>
  );
}

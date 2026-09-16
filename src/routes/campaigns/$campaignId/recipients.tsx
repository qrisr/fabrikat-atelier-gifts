import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/campaigns/$campaignId/recipients")({
  component: () => null,
});

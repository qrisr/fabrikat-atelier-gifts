import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/campaigns/$campaignId/personalize")({
  component: () => null,
});

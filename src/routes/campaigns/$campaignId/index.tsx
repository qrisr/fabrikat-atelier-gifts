import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/campaigns/$campaignId/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/campaigns/$campaignId/details", params });
  },
});

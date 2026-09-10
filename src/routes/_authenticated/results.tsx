import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/results")({
  head: () => ({
    meta: [
      { title: "Results — Recurring Spend Detector" },
      {
        name: "description",
        content: "Recurring payments detected in your bank statement and your yearly total.",
      },
      { property: "og:title", content: "Results — Recurring Spend Detector" },
      {
        property: "og:description",
        content: "Recurring payments detected in your bank statement and your yearly total.",
      },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Your recurring payments
      </h1>
      <p className="mt-2 text-sm text-muted-foreground sm:text-base">
        Upload a statement first — detected subscriptions and your yearly total will appear here.
      </p>
    </main>
  );
}

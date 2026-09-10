import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Upload statement — Recurring Spend Detector" },
      {
        name: "description",
        content: "Upload your HDFC bank statement to detect recurring payments.",
      },
      { property: "og:title", content: "Upload statement — Recurring Spend Detector" },
      {
        property: "og:description",
        content: "Upload your HDFC bank statement to detect recurring payments.",
      },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Upload your bank statement
      </h1>
      <p className="mt-2 text-sm text-muted-foreground sm:text-base">
        Upload your HDFC statement (CSV or XLS). We'll find every recurring payment
        — subscriptions, auto-debits, SIPs, recharges — and total them up for you.
      </p>
      <div className="mt-10 rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground sm:p-16">
        Statement upload is coming next. This page is already protected — only
        signed-in users can see it.
      </div>
    </main>
  );
}

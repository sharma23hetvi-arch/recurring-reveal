import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Recurring Spend Detector — Find every subscription in your statement" },
      {
        name: "description",
        content:
          "Upload your HDFC bank statement and see every recurring payment — subscriptions, auto-debits, SIPs, recharges — and what they cost you per year.",
      },
      {
        property: "og:title",
        content: "Recurring Spend Detector — Find every subscription in your statement",
      },
      {
        property: "og:description",
        content:
          "Upload your HDFC bank statement and see every recurring payment and what they cost you per year.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
          How much do your subscriptions really cost you?
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          Upload your HDFC bank statement and we'll find every recurring payment —
          subscriptions, auto-debits, SIPs, phone recharges — and show you the total
          per year. The ₹119 and ₹649 charges add up.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/login">Get started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/login">Log in</Link>
          </Button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Your statement data is private and only visible to you.
        </p>
      </div>
    </main>
  );
}

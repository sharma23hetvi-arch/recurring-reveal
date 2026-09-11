import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

type RecurringRow = {
  merchant: string;
  n_charges: number;
  avg_gap: number;
  avg_amount: number;
  last_seen: string;
  annualized: number;
  status: "active" | "lapsed";
};

type RfmRow = {
  merchant: string;
  recency_days: number;
  frequency: number;
  monetary: number;
  r: number;
  f: number;
  m: number;
  segment: string;
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrExact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function ResultsPage() {
  const [recurring, setRecurring] = useState<RecurringRow[] | null>(null);
  const [rfm, setRfm] = useState<RfmRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [recRes, rfmRes] = await Promise.all([
          supabase.rpc("get_recurring"),
          supabase.rpc("get_rfm"),
        ]);

        if (recRes.error) throw recRes.error;
        if (rfmRes.error) throw rfmRes.error;

        if (cancelled) return;
        setRecurring((recRes.data as RecurringRow[]) ?? []);
        setRfm((rfmRes.data as RfmRow[]) ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = recurring?.filter((r) => r.status === "active") ?? [];
  const lapsed = recurring?.filter((r) => r.status === "lapsed") ?? [];
  const totalAnnual = active.reduce((sum, r) => sum + Number(r.annualized), 0);
  const monthly = totalAnnual / 12;

  const groupedSegments = rfm?.reduce<Record<string, RfmRow[]>>((acc, row) => {
    acc[row.segment] = acc[row.segment] ?? [];
    acc[row.segment].push(row);
    return acc;
  }, {}) ?? {};

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Your recurring payments
        </h1>
        <Link
          to="/upload"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Upload another statement
        </Link>
      </div>

      {loading ? (
        <div className="mt-10 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Analysing your transactions…
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-8 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : (
        <>
          <section className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-10">
            <p className="text-sm font-medium text-muted-foreground">
              Estimated yearly recurring spend
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {inr.format(totalAnnual)} per year
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span>≈ {inr.format(monthly)} / month</span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-green-600 dark:bg-green-500" />
                {active.length} active
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" />
                {lapsed.length} lapsed
              </span>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Recurring payments
            </h2>
            {recurring && recurring.length > 0 ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Merchant</th>
                      <th className="px-4 py-3 text-right font-medium">Amount per charge</th>
                      <th className="px-4 py-3 text-right font-medium">Every ~N days</th>
                      <th className="px-4 py-3 text-right font-medium">Charges seen</th>
                      <th className="px-4 py-3 font-medium">Last seen</th>
                      <th className="px-4 py-3 text-right font-medium">Annualized</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recurring.map((r, i) => (
                      <tr
                        key={`${r.merchant}-${i}`}
                        className="border-b border-border last:border-0"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                          {r.merchant}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-foreground">
                          {inrExact.format(r.avg_amount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                          ~{Math.round(r.avg_gap)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {r.n_charges}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {r.last_seen}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-foreground">
                          {inr.format(r.annualized)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              r.status === "active"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No recurring payments detected. Try uploading a statement with more transaction history.
              </p>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Merchant segments (RFM)
            </h2>
            {rfm && rfm.length > 0 ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(groupedSegments).map(([segment, rows]) => {
                  const segmentTotal = rows.reduce((sum, row) => sum + Number(row.monetary), 0);
                  return (
                    <div
                      key={segment}
                      className="rounded-xl border border-border bg-card p-5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{segment}</h3>
                        <span className="text-sm font-medium text-muted-foreground">
                          {inr.format(segmentTotal)}
                        </span>
                      </div>
                      <ul className="mt-3 space-y-2">
                        {rows.map((row, i) => (
                          <li
                            key={`${row.merchant}-${i}`}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span className="truncate text-foreground">{row.merchant}</span>
                            <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                              {inrExact.format(row.monetary)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No merchant segments available.
              </p>
            )}
          </section>

          <p className="mt-10 text-xs text-muted-foreground">
            Detection: PostgreSQL window functions (LAG over merchant partitions). Segmentation: RFM scoring with NTILE.
          </p>
        </>
      )}
    </main>
  );
}

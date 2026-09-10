import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseHdfcFile, uploadTxns, type Txn } from "@/lib/hdfcParser";

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

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function UploadPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    parsed: number;
    skipped: number;
    txns: Txn[];
  } | null>(null);

  async function handleUpload() {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { txns, skipped } = await parseHdfcFile(file);
      await uploadTxns(supabase, txns);
      setResult({ parsed: txns.length, skipped, txns });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Upload your bank statement
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        V1 supports HDFC Bank statements only.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-card p-6 sm:p-8">
        <label
          htmlFor="statement-file"
          className="block text-sm font-medium text-foreground"
        >
          Statement file
        </label>
        <input
          id="statement-file"
          ref={fileRef}
          type="file"
          accept=".csv,.txt,.xls,.xlsx"
          disabled={loading}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-2 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80 disabled:opacity-50"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Accepted formats: .csv, .txt, .xls, .xlsx
        </p>
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || loading}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Uploading…" : "Upload"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{result.parsed.toLocaleString("en-IN")}</span>{" "}
            rows parsed,{" "}
            <span className="font-semibold">{result.skipped.toLocaleString("en-IN")}</span>{" "}
            skipped.
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Merchant</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Direction</th>
                </tr>
              </thead>
              <tbody>
                {result.txns.slice(0, 20).map((t, i) => (
                  <tr
                    key={`${t.txn_date}-${i}`}
                    className="border-b border-border last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {t.txn_date}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-foreground">
                      {t.description}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-foreground">
                      {t.merchant}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-foreground">
                      {inr.format(t.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          t.direction === "debit"
                            ? "text-destructive"
                            : "text-green-600 dark:text-green-500"
                        }
                      >
                        {t.direction}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.txns.length > 20 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Showing first 20 of {result.txns.length.toLocaleString("en-IN")}{" "}
              transactions.
            </p>
          )}
        </div>
      )}
    </main>
  );
}

// hdfcParser.ts — HDFC Bank statement → normalized transactions → Supabase
// Deps: npm i papaparse xlsx @supabase/supabase-js  (+ @types/papaparse)
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Txn = {
  txn_date: string;          // ISO yyyy-mm-dd
  description: string;       // raw narration
  merchant: string;          // normalized
  amount: number;            // always positive
  direction: "debit" | "credit";
  source_bank: "HDFC";
  raw: Record<string, string>;
};

// ---------- 1. Read file into rows (handles .csv/.txt and .xls/.xlsx) ----------
async function readRows(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xls") || name.endsWith(".xlsx")) {
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" });
  }
  const text = await file.text();
  return Papa.parse<string[]>(text, { skipEmptyLines: true }).data;
}

// ---------- 2. Locate the header row (HDFC puts account info above it) ----------
const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");

function findColumns(rows: string[][]) {
  const headerIdx = rows.findIndex(
    (r) => r.some((c) => norm(c) === "date") && r.some((c) => norm(c).startsWith("narration"))
  );
  if (headerIdx === -1) throw new Error("Couldn't find HDFC header row (Date / Narration).");

  const h = rows[headerIdx].map(norm);
  const find = (...keys: string[]) => h.findIndex((c) => keys.some((k) => c.startsWith(k)));

  const cols = {
    date: h.indexOf("date"),
    narration: find("narration"),
    ref: find("chqref", "chq"),
    debit: find("withdrawal", "debit"),
    credit: find("deposit", "credit"),
  };
  if (cols.debit === -1 || cols.credit === -1)
    throw new Error("Couldn't find Withdrawal/Deposit (or Debit/Credit) columns.");
  return { headerIdx, cols, headers: rows[headerIdx] };
}

// ---------- 3. Field parsers ----------
function parseDate(s: string): string | null {
  const m = String(s).trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/);
  if (!m) return null; // skips "*****" separator rows and footer lines
  const [, d, mo, y] = m;
  const year = y.length === 2 ? 2000 + Number(y) : Number(y);
  return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function parseAmount(s: string): number {
  const n = Number(String(s ?? "").replace(/[,\s₹]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// ---------- 4. Merchant normalization ----------
// Known merchants: matched anywhere in the narration first. Extend from YOUR statements.
const ALIASES: [RegExp, string][] = [
  [/NETFLIX/, "NETFLIX"],
  [/SPOTIFY/, "SPOTIFY"],
  [/YOUTUBE|GOOGLE\s*PLAY|GOOGLEPLAY/, "GOOGLE / YOUTUBE"],
  [/APPLE\.COM|APPLE\s*SERVICES|ITUNES/, "APPLE"],
  [/PRIME\s*VIDEO|AMAZON\s*PRIME/, "AMAZON PRIME"],
  [/AMAZON|AMZN/, "AMAZON"],
  [/HOTSTAR|JIOCINEMA|JIOHOTSTAR/, "JIOHOTSTAR"],
  [/SWIGGY/, "SWIGGY"],
  [/ZOMATO/, "ZOMATO"],
  [/AIRTEL/, "AIRTEL"],
  [/\bJIO\b|RELIANCE\s*JIO/, "JIO"],
  [/CLAUDE|ANTHROPIC/, "ANTHROPIC"],
  [/OPENAI|CHATGPT/, "OPENAI"],
];

const clean = (s: string) =>
  s.toUpperCase()
    .replace(/[X\*]{4,}\d*/g, " ")          // masked card numbers
    .replace(/\d+/g, " ")
    .replace(/[^A-Z&\. ]/g, " ")
    .replace(/\b(PVT|LTD|PRIVATE|LIMITED|INDIA|IN|PAYU|RAZORPAY|CASHFREE|BILLDESK)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function normalizeMerchant(narration: string): string {
  const up = narration.toUpperCase();
  for (const [re, name] of ALIASES) if (re.test(up)) return name;

  // UPI-<PAYEE>-<VPA>-<IFSC>-<REF>-<REMARK>
  if (up.startsWith("UPI-")) {
    const payee = clean(up.split("-")[1] ?? "");
    if (payee) return payee;
    const vpa = up.split("-")[2] ?? "";
    return clean(vpa.split("@")[0]) || "UPI UNKNOWN";
  }
  // Card standing instructions (auto-debit subscriptions) and POS/card spends
  if (/^(ME DC SI|DC SI|SI |POS |ECOM)/.test(up))
    return clean(up.replace(/^(ME DC SI|DC SI|SI|POS|ECOM)\s*/, "")) || "CARD UNKNOWN";
  // NACH / ECS mandates (SIPs, insurance, loan EMIs)
  if (/^(ACH D-|NACH|ECS)/.test(up))
    return clean(up.replace(/^(ACH D-|NACH-?|ECS-?)/, "").split("-")[0]) || "MANDATE UNKNOWN";
  // Bank transfers
  const t = up.match(/^(NEFT|IMPS|RTGS)[ -]?(DR|CR)?-?/);
  if (t) {
    const parts = up.split("-").filter(Boolean);
    return "TRANSFER: " + (clean(parts[2] ?? parts[1] ?? "") || "UNKNOWN");
  }
  return clean(up).split(" ").slice(0, 3).join(" ") || "UNKNOWN";
}

// ---------- 5. Main parse ----------
export async function parseHdfcFile(file: File): Promise<{ txns: Txn[]; skipped: number }> {
  const rows = await readRows(file);
  const { headerIdx, cols, headers } = findColumns(rows);
  const txns: Txn[] = [];
  let skipped = 0;

  for (const r of rows.slice(headerIdx + 1)) {
    const date = parseDate(r[cols.date]);
    const narration = String(r[cols.narration] ?? "").trim();
    if (!date || !narration) { skipped++; continue; }

    const debit = parseAmount(r[cols.debit]);
    const credit = parseAmount(r[cols.credit]);
    if (!debit && !credit) { skipped++; continue; }

    txns.push({
      txn_date: date,
      description: narration,
      merchant: normalizeMerchant(narration),
      amount: debit || credit,
      direction: debit ? "debit" : "credit",
      source_bank: "HDFC",
      raw: Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? "")])),
    });
  }
  return { txns, skipped };
}

// ---------- 6. Upload (idempotent thanks to the unique constraint) ----------
export async function uploadTxns(supabase: SupabaseClient, txns: Txn[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const rows = txns.map((t) => ({ ...t, user_id: user.id }));

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase
      .from("transactions")
      .upsert(rows.slice(i, i + 500), {
        onConflict: "user_id,txn_date,description,amount",
        ignoreDuplicates: true,
      });
    if (error) throw error;
  }
  return rows.length;
}

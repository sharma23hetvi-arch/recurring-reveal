# Recurring Spend Detector

Upload an HDFC Bank statement and find every recurring payment hidden in it — subscriptions, card auto-debits, NACH mandates, SIPs, phone recharges — and see what they cost per year.

**Live app:** https://spend-spotter-io.lovable.app

## Why

Small recurring charges (₹119 here, ₹649 there) are spread across UPI, card standing instructions, and NACH mandates, so they're easy to lose track of. The app surfaces one number: **₹X per year on recurring payments**.

## Architecture

- **Frontend:** React (TanStack Router), built with Lovable
- **Backend:** PostgreSQL + Auth via Lovable Cloud (Supabase-based), with row-level security so each user only sees their own transactions
- **Parsing:** `src/lib/hdfcParser.ts` — finds the header row in HDFC exports (CSV/XLS), parses DD/MM/YY dates and comma-formatted amounts, and normalizes merchant names from UPI, card standing-instruction, NACH, and POS narrations. Uploads are idempotent via a unique constraint.
- **Detection:** `get_recurring()` (in `supabase/migrations/`) uses `LAG()` over merchant partitions to measure the gap between charges, then keeps merchants with regular ~monthly gaps, low gap variance, and stable amounts. "Active" vs "lapsed" is measured against the statement's last date, not today's date.
- **Segmentation:** `get_rfm()` applies RFM scoring with `NTILE(4)` to merchants rather than customers, since a single user's statement has no customer base to segment.
- **Results page:** `src/routes/_authenticated/results.tsx` calls both functions via `supabase.rpc()`; no analysis logic lives in the frontend.

## Key files

| Path | Contents |
|---|---|
| `src/lib/hdfcParser.ts` | Statement parser, merchant normalizer, upload |
| `supabase/migrations/` | Table, RLS policy, recurring detection and RFM functions |
| `src/routes/_authenticated/upload.tsx` | Upload flow |
| `src/routes/_authenticated/results.tsx` | Results dashboard |
| `data/` | Synthetic test statement and answer key |

## Validation

Tested on a **synthetic** HDFC-format statement (648 transactions over 12 months) with planted recurring payments; `data/SYNTHETIC_answer_key.csv` lists what the detector should find. Parser verified: 648 rows parsed, 3 non-data rows skipped, and re-uploading the same file does not create duplicates.

## Status

- [x] Auth, HDFC parsing, storage
- [x] Recurring detection and RFM functions in PostgreSQL
- [x] Results dashboard
- [ ] Validation on a real statement
- [ ] Claude API layer for categorizing unmatched merchants

V1 supports HDFC Bank only.

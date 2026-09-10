# Recurring Reveal

PROJECT CONTEXT — read this and keep it in mind for every future prompt. Do not build anything from this message; just confirm you understand.

App: Recurring Spend Detector

What it does: A user uploads their bank statement, and the app finds every recurring payment hidden in it (subscriptions, auto-debits, SIPs, phone recharges) and shows how much they spend on them per year. Many people underestimate this number because small charges like ₹119 or ₹649 are spread across UPI, card auto-debits, and NACH mandates.

Target user: Indian students and young professionals using UPI and cards, who have lost track of what they're subscribed to.

The core insight shown to the user: "You spend ₹X per year on recurring payments" — this one number is the heart of the app and should be the most prominent thing on the results page.

V1 scope (do not expand beyond this):

- One bank only: HDFC Bank statement exports (CSV/XLS).

- Email/password login via Supabase Auth.

- Upload → parse → store in Supabase → show results.

- No bank account linking, no payments, no notifications, no mobile app, no AI features yet.

Architecture rules:

- Supabase is the backend. The `transactions` table already exists with row-level security. Never create, alter, or migrate tables unless I explicitly ask.

- Parsing logic lives in src/lib/hdfcParser.ts, which I will provide. Never rewrite it.

- Detection and segmentation logic lives in PostgreSQL functions (get_recurring, get_rfm). The frontend only calls them via supabase.rpc() and displays results. Never reimplement analysis logic in the frontend.

Design:

- Clean, minimal, trustworthy — like a fintech app, not a flashy dashboard.

- Money always in ₹ with Indian number formatting (₹1,23,456).

- Neutral background, one accent color, clear typography, generous spacing.

- Works on both desktop and mobile widths.

Current data: the demo uses a synthetic HDFC-format test statement with planted subscriptions. Never present it as real user data.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cebcdd5b-96fd-4266-9971-9ddbf0dec9ea).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

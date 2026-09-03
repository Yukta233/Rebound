# Rebound — AI Revenue Recovery Console
Track 3: AI Revenue Recovery · Razorpay Hackathon

## What it is
Rebound is a live ops console, not a one-shot batch demo. Start the stream and it continuously
generates at-risk revenue events — failed payments, abandoned checkouts, failed subscriptions,
overdue invoices — at a configurable pace, diagnoses each one's root cause with Claude, decides
on ONE bounded action through a deterministic rules layer, simulates executing it, and logs
every step to an auditable trail. Four views: **Overview** (funnel + live feed), **Analytics**
(trend/root-cause/recovery-rate/outcome charts), **Ledger** (full transaction history + audit
trail), **Settings** (configurable stopping rules + an honest Razorpay test-mode connection panel).

## Is the data real?
Be precise about this in front of judges: the individual transactions are synthetic — no live
merchant data exists to pull from in a sandboxed demo, and there's no way around that honestly.
What **is** real: the root-cause *distribution* is calibrated to NPCI's published UPI
failure-cause split (~82% business decline — wrong PIN, insufficient funds, limit exceeded —
vs ~18% technical decline — timeouts, system issues), and the overall failure volume sits in
NPCI's reported 7–9% monthly failed-transaction band. The Claude diagnosis calls are genuine
AI reasoning on that synthetic-but-realistically-shaped data, not scripted responses.

## Why single-file HTML
For a 3–4 day build with no backend infra needed, one HTML file (`rebound.html`) that calls the
Claude API directly from the browser is the fastest path to a fully working, demoable product —
no server to host, no deploy step, works the moment it's opened. This is intentional, not a
shortcut: the judging bar is "does it work end-to-end and show real numbers," not "how many
services does it use."

## Pipeline (matches the track's own framing)
```
DETECT  →  DIAGNOSE  →  DECIDE  →  ACT  →  LOG  →  MEASURE
```

1. **Detect** — `generateBatch()` creates a synthetic batch (6–48 records) across four loss
   types, each with a realistic failure reason, amount, and customer/business name.
2. **Diagnose** — `diagnoseChunk()` sends transactions to Claude (chunks of 6, to stay inside a
   1000-token response) and gets back root cause, confidence, reasoning, a recommended action,
   and — where relevant — a Hinglish customer reminder message. If the API call fails for any
   reason, `localFallbackDiagnose()` kicks in so the demo never breaks mid-run.
3. **Decide** — `decideAction()` is pure deterministic code, not the LLM. It enforces the
   bounded/gated rules regardless of what the model recommends:
   - Auto-escalate anything over ₹50,000 to a human
   - Auto-escalate anything the model is under 55% confident about
   - Stop (never retry again) after 3 retry attempts on the same case
   - One action per case per run — no repeat contact
4. **Act** — `successProbability()` simulates a realistic outcome per (root cause, action) pair
   and resolves each case to recovered / escalated / stopped.
5. **Log** — every case keeps a full timestamped `trail[]`: detected → diagnosed → decided →
   acted, including the reasoning text and, where sent, the actual customer message.
6. **Measure** — the dashboard reports total at-risk ₹, recovered ₹, recovery rate %, escalated
   count, stopped count, and a by-loss-type breakdown, live as the batch runs.

## Files
- `rebound.html` — the whole app (open directly in a browser, or use it as a Claude Artifact)
- `README.md` — this file

## Why it can't call the real Razorpay API from here
A Razorpay secret key must never sit in client-side code — anyone who views source could take
it. The Settings view has a Razorpay test-mode panel that's deliberately disabled, with the
reason stated in the UI. Making it live needs a small backend (Node/Express) that holds the key
server-side and relays calls; the diagnosis/decision engine here would plug into it unchanged.

## What to extend if you have time left
- Stand up that backend relay and swap the synthetic event generator for real test-mode webhooks
- Wire `send_reminder` / `retrigger_mandate` to an actual test-mode notification/mandate call
- Add a CSV export of the ledger + audit trail for the judge packet
- Persist the session across page reloads (currently resets on "Reset session", by design)

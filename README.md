# Rebound — AI Revenue Recovery Console
**Track 3: AI Revenue Recovery · Razorpay Hackathon**

## Problem / Objective

Revenue rarely leaks in one clean step — a payment degrades, a checkout gets abandoned, a
subscription mandate fails, or an invoice goes overdue. Rebound is an agent that detects this
at-risk revenue across a merchant's funnel, diagnoses *why* the money is at risk using AI,
decides on one bounded recovery action per case through a deterministic rules layer, and
executes a real multi-step recovery workflow — not a single guess — while logging every
decision to an auditable trail. The goal: don't just identify the problem, show measured money
recovered across a batch, with compliant escalation, stopping rules, and a full audit trail.

## What it actually does

```
DETECT → DIAGNOSE → DECIDE → ACT (sequenced) → LOG → MEASURE
```

1. **Detect** — pulls at-risk transactions across four loss types: failed payments, abandoned
   checkouts, failed subscriptions, and overdue invoices. Two data sources are supported (see
   below): a calibrated simulation, or your real Razorpay test-mode account via the backend.
2. **Diagnose** — Claude classifies the root cause (insufficient funds, bank timeout, mandate
   expired, invoice forgotten, etc.), assigns a confidence score, and recommends an action. If
   the diagnosis API is unreachable, a local rule-based fallback keeps the pipeline running so a
   network hiccup can never break a live demo.
3. **Decide** — a separate, deterministic rules engine — not the LLM — enforces hard bounds:
   auto-escalate above a configurable ₹ threshold, auto-escalate on low model confidence, and
   stop retrying after a configurable max attempts. Claude only recommends; it cannot act
   outside these limits.
4. **Act, as a real sequence** — reminders and mandate retries don't resolve in a single instant
   coin-flip. A case moves to **"Following up,"** and a live background timer re-checks it after
   a realistic delay, escalating through further rounds (a real mandate-retry-sequencer /
   promise-to-pay-tracker) until it either recovers or hits the retry limit and stops.
5. **Log** — every case keeps a full timestamped trail: detected → diagnosed → decided →
   follow-up round(s) → final outcome, each with the reasoning behind it.
6. **Measure** — a live dashboard reports total ₹ at risk, ₹ recovered, recovery rate, cases
   following up, escalated, and stopped — plus charts for root-cause mix, recovery rate by loss
   type, and outcome distribution.

## Project structure

```
rebound/
├── rebound.html         ← the dashboard — standalone, self-contained, open in any browser
├── README.md            ← this file
└── backend/
    ├── server.js         ← Express server, holds Razorpay test-mode keys, relays real data
    ├── package.json      ← dependencies (express, axios, cors, dotenv)
    ├── .env.example      ← template for your Razorpay test keys
    └── README.md         ← backend-specific setup instructions
```

## The dashboard (`rebound.html`)

Four views, sidebar navigation:
- **Overview** — live event feed, funnel (Detected → Diagnosed → Actioned → Recovered), KPIs,
  stream controls (start/stop, speed, loss-type mix)
- **Analytics** — cumulative recovered ₹ over time, root-cause mix, recovery rate by loss type,
  outcome distribution — all via Chart.js, **embedded directly in the file** (not loaded from a
  CDN), so it never breaks on a restricted network
- **Ledger** — every transaction, filterable by outcome, click any row for its full audit trail
- **Settings** — configurable stopping rules (escalation threshold, max retries, confidence
  floor) and the Simulated/Live data-source switch

## Simulated vs. Live — be precise about which is which

- **Simulated** (default): synthetic transactions, but not arbitrary — the root-cause
  *distribution* is calibrated to NPCI's published UPI failure-cause split (~82% "business
  decline": wrong PIN, insufficient funds, limit exceeded; ~18% "technical decline": timeouts,
  system issues), and overall failure volume sits in NPCI's reported 7–9% monthly band. The
  Claude diagnosis calls are genuine AI reasoning on this realistically-shaped data.
- **Live**: once `backend/` is running with your own Razorpay test-mode keys, switch the radio
  button in Settings and Rebound polls your real test account for actual failed payments,
  abandoned orders, halted subscriptions, and overdue invoices via `GET
  /api/at-risk-transactions`. Same diagnosis/decision/audit-trail pipeline, real source data.
  A fresh test account has nothing to find until you seed it with Razorpay's documented test
  card/UPI numbers — see `backend/README.md`.
- **Honest limit either way**: even in Live mode, only **Detect** pulls from the real API. Act
  (sending a real reminder, retriggering a real mandate) is still simulated — that write-side
  integration is the natural next step, not yet built.

## Setup

**Frontend only (simulated mode):** just open `rebound.html` in a browser. Nothing to install.

**Full setup with live Razorpay test-mode data:**
```bash
cd backend
npm install
cp .env.example .env
# open .env, add your Razorpay TEST-mode Key ID and Key Secret
npm start
```
Then in `rebound.html` → Settings → Data source → **Live**, set the backend URL
(`http://localhost:3001` by default), click **Test connection**, then Start live stream from
Overview.

## Why the backend exists at all

A Razorpay secret key can never sit in client-side code — anyone who views source could take it.
Detection therefore has two paths: Simulated runs entirely in the browser, and Live routes
through `backend/`, the only place your test-mode secret ever lives.

## Issues encountered while building, and how they were solved

- **Analytics charts rendered blank** — Chart.js measured its canvases while the Analytics tab
  was `display:none`, computing zero size and never recalculating. Fixed by forcing a
  `chart.resize()` the moment the tab becomes visible.
- **Ledger appeared frozen** — it only redrew after a full diagnosis batch completed, so newly
  detected transactions were invisible for several seconds. Fixed by redrawing immediately on
  detection, not just on resolution.
- **Charting library failed silently on a restricted network** — Chart.js was loading from a
  public CDN (cdnjs.cloudflare.com), which was blocked on the deployment network, breaking
  charts with no visible error. Solved two ways: embedded Chart.js's full source directly inside
  `rebound.html` so it needs zero internet access to draw charts, and added an on-screen warning
  banner for any future load failure instead of a silent one.
- **A Razorpay secret key can't live in the browser** — solved by splitting the architecture:
  the dashboard stays a standalone frontend, and a small separate Express backend is the only
  place the real key is ever held, relaying normalized data to the frontend.
- **Recovery outcomes were an instant coin-flip, not a real process** — didn't reflect how
  recovery actually happens over multiple touches. Solved by building a genuine scheduled
  follow-up state machine: a live background timer re-checks "following up" cases after a
  realistic delay, sequencing further rounds until recovery or a rule-bound stop.
- **Keeping AI reasoning and enforcement separable** — a recurring design discipline: Claude only
  diagnoses root cause and recommends an action; the actual bounded rules (escalation threshold,
  max retries, confidence floor) are enforced in plain deterministic code the model cannot
  override, so "bounded and gated" is a real, testable property, not a prompt-level promise.

## What to extend next
- Wire `send_reminder` / `retrigger_mandate` to real Razorpay test-mode write calls (SMS/WhatsApp
  notification, mandate re-trigger), so Act is live end-to-end, not just Detect
- Add a CSV export of the ledger + audit trail for a judge packet
- Persist the session across page reloads (currently resets on "Reset session," by design)
- Poll Live mode on a timer even when the stream is stopped, so new test-mode events surface
  without needing to click Start
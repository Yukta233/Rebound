Rebound — AI Revenue Recovery Console

Razorpay Hackathon · Track 3: AI Revenue Recovery

Rebound is an AI-powered revenue recovery console that detects at-risk transactions, diagnoses their root cause, decides a bounded recovery action, and tracks the outcome through an auditable pipeline.

DETECT → DIAGNOSE → DECIDE → ACT → LOG → MEASURE

✨ Features
🤖 AI-powered transaction diagnosis using Claude
💳 Failed payments, abandoned checkouts, subscriptions & overdue invoices
🛡️ Deterministic recovery rules and safety guardrails
📊 Real-time recovery analytics and revenue tracking
📒 Transaction ledger with complete audit trail
🔴 Simulated mode for demos
🟢 Live Razorpay Test Mode integration
🛠️ Tech Stack
Frontend: HTML, CSS, JavaScript, Chart.js
AI: Claude API
Backend: Node.js, Express
Payments: Razorpay Test Mode
📁 Structure
rebound/
├── rebound.html
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   └── README.md
├── .gitignore
└── README.md
🚀 Run Locally
Dashboard

Open rebound.html directly in your browser.

Backend
cd backend
npm install
cp .env.example .env
npm start

Backend runs on:

http://localhost:3001

Add your Razorpay Test Mode credentials to .env.

Never commit .env or live Razorpay keys.

🔄 Recovery Pipeline
Detect → Diagnose → Decide → Act → Log → Measure

AI recommendations are passed through deterministic rules such as:

Transactions > ₹50,000 → Human escalation
Confidence < 55% → Human escalation
3 retry attempts → Stop
Maximum one action per case per run
📊 Data Modes

Simulated: Synthetic transactions with realistic failure distributions. Claude diagnosis is real.

Live: Fetches real transactions from your Razorpay Test Mode account through the backend.

🔮 Future Improvements
Real recovery/notification actions
CSV export
Session persistence
Hosted backend
Continuous live polling
🔐 Security

Razorpay secret keys are stored only on the backend and are never exposed to the browser.

Built for the Razorpay Hackathon — AI Revenue Recovery Track.
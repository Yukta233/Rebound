/**
 * Rebound backend relay.
 * Holds Razorpay TEST-MODE keys server-side (never in the browser) and exposes
 * a single normalized endpoint the dashboard polls for at-risk transactions,
 * pulled from Razorpay's real Payments, Orders, Subscriptions and Invoices APIs.
 */
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const PORT = process.env.PORT || 3001;

if (!KEY_ID || !KEY_SECRET) {
  console.warn('⚠️  RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set in backend/.env');
  console.warn('    /api/at-risk-transactions will return an error until you add test-mode keys.');
}

const rzp = axios.create({
  baseURL: 'https://api.razorpay.com/v1',
  auth: { username: KEY_ID || '', password: KEY_SECRET || '' },
  timeout: 10000
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, keysConfigured: Boolean(KEY_ID && KEY_SECRET) });
});

app.get('/api/at-risk-transactions', async (req, res) => {
  if (!KEY_ID || !KEY_SECRET) {
    return res.status(400).json({ error: 'Razorpay test-mode keys not configured on the server. Add them to backend/.env and restart.' });
  }

  try {
    const [paymentsRes, ordersRes, subsRes, invoicesRes] = await Promise.allSettled([
      rzp.get('/payments', { params: { count: 50 } }),
      rzp.get('/orders', { params: { count: 50 } }),
      rzp.get('/subscriptions', { params: { count: 50 } }),
      rzp.get('/invoices', { params: { count: 50 } })
    ]);

    const out = [];

    // --- Failed payments ---
    if (paymentsRes.status === 'fulfilled') {
      (paymentsRes.value.data.items || [])
        .filter(p => p.status === 'failed')
        .forEach(p => out.push({
          id: p.id,
          type: 'payment_failed',
          amount: (p.amount || 0) / 100,
          name: p.email || p.contact || 'Customer',
          reason: p.error_description || p.error_reason || 'Payment failed',
          created_at: p.created_at
        }));
    } else {
      console.warn('Payments fetch failed:', paymentsRes.reason?.message);
    }

    // --- Abandoned checkouts: orders created but never paid, with at least one attempt ---
    if (ordersRes.status === 'fulfilled') {
      (ordersRes.value.data.items || [])
        .filter(o => o.status === 'created' && (o.attempts || 0) > 0)
        .forEach(o => out.push({
          id: o.id,
          type: 'checkout_abandoned',
          amount: (o.amount || 0) / 100,
          name: 'Customer',
          reason: 'Order created, checkout not completed',
          created_at: o.created_at
        }));
    } else {
      console.warn('Orders fetch failed:', ordersRes.reason?.message);
    }

    // --- Failed / halted subscriptions ---
    if (subsRes.status === 'fulfilled') {
      (subsRes.value.data.items || [])
        .filter(s => ['halted', 'pending'].includes(s.status))
        .forEach(s => out.push({
          id: s.id,
          type: 'subscription_failed',
          amount: (s.quantity && s.plan_id) ? 0 : 0, // Razorpay subscriptions don't expose amount directly here
          name: 'Customer',
          reason: `Subscription ${s.status}`,
          created_at: s.created_at
        }));
    } else {
      console.warn('Subscriptions fetch failed:', subsRes.reason?.message);
    }

    // --- Overdue invoices ---
    if (invoicesRes.status === 'fulfilled') {
      const nowSec = Date.now() / 1000;
      (invoicesRes.value.data.items || [])
        .filter(i => ['issued', 'partially_paid'].includes(i.status) && i.expire_by && i.expire_by < nowSec)
        .forEach(i => out.push({
          id: i.id,
          type: 'invoice_overdue',
          amount: (i.amount || 0) / 100,
          name: i.customer_details?.name || i.customer_details?.email || 'Customer',
          reason: `Invoice overdue since ${new Date(i.expire_by * 1000).toLocaleDateString()}`,
          created_at: i.created_at
        }));
    } else {
      console.warn('Invoices fetch failed:', invoicesRes.reason?.message);
    }

    res.json({ items: out, fetched_at: Date.now() });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch from Razorpay', detail: err?.response?.data || err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Rebound backend listening on http://localhost:${PORT}`);
  console.log(`Keys configured: ${Boolean(KEY_ID && KEY_SECRET)}`);
});
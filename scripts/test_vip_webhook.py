#!/usr/bin/env python3
"""Sends a correctly SIGNED fake "paid $1" Stripe event to your webhook, so you can test the VIP flow without paying.

What it proves: the webhook secret is right, the endpoint is reachable, the right subscriber is matched and marked VIP in the database,
and the admin list shows it. (It does not touch Stripe or move any money, and it cannot test the /?vip=thanks page: that needs a real
Checkout Session, so use Stripe TEST mode for that.)

  1. Sign up on the site with a test email (free signup is enough).
  2. Put the webhook signing secret in your shell, NOT in chat or a file that is committed:
       macOS/Linux:  export STRIPE_WEBHOOK_SECRET=whsec_...
       Windows PowerShell:  $env:STRIPE_WEBHOOK_SECRET = "whsec_..."
  3. python scripts/test_vip_webhook.py you@example.com                     (sends to https://jeemu.fun)
     python scripts/test_vip_webhook.py you@example.com --url https://jeemu.fun/api/v1/stripe/webhook

Expected: "200 {'received': True}" and that email shows as VIP in /admin. A 400 means the secret is wrong; 503 means the server has no
STRIPE_WEBHOOK_SECRET; 500 means it could not record the payment (see the Vercel function logs). The same email twice is safe: it is only
marked VIP (and the referrer credited) once.
"""
import argparse, hashlib, hmac, json, os, sys, time, urllib.error, urllib.request

ap = argparse.ArgumentParser()
ap.add_argument('email', help='the test subscriber (must already be signed up)')
ap.add_argument('--url', default='https://jeemu.fun/api/v1/stripe/webhook')
ap.add_argument('--ref', default='', help="optional: the subscriber's referral code (also sent as client_reference_id)")
a = ap.parse_args()
secret = os.environ.get('STRIPE_WEBHOOK_SECRET', '').strip()
if not secret.startswith('whsec_'):
    sys.exit('Set STRIPE_WEBHOOK_SECRET in your shell first (see the top of this file).')

ts = int(time.time())
event = {
    'id': f'evt_test_{ts}', 'object': 'event', 'type': 'checkout.session.completed',
    'data': {'object': {
        'id': f'cs_test_fake{ts}', 'object': 'checkout.session', 'payment_status': 'paid', 'amount_total': 100, 'currency': 'usd',
        'customer_email': None, 'customer_details': {'email': a.email}, 'client_reference_id': a.ref or None,
        'metadata': {}, 'payment_intent': f'pi_test_fake{ts}',
    }},
}
body = json.dumps(event)
sig = hmac.new(secret.encode(), f'{ts}.{body}'.encode(), hashlib.sha256).hexdigest()
req = urllib.request.Request(a.url, data=body.encode(), method='POST', headers={'Content-Type': 'application/json', 'Stripe-Signature': f't={ts},v1={sig}'})
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        print(r.status, r.read().decode())
except urllib.error.HTTPError as e:
    print(e.code, e.read().decode()[:300]); sys.exit(1)

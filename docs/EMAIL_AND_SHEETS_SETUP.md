# Jeemu Automated Email & Google Sheets Setup Guide

This guide walks you through connecting your Hostinger business email (**`info@jeemu.fun`**) and connecting a live Google Sheet to automatically sync your waitlist backers and VIP depositors.

---

## 1. Hostinger Email Setup (`info@jeemu.fun`)

Jeemu is pre-configured to use **Hostinger's secure SMTP servers** with direct TLS/SSL encryption and connection pooling.

### Step 1: Locate your Hostinger Email Password
1. Log in to your **[Hostinger Control Panel (hPanel)](https://hpanel.hostinger.com/)**.
2. Navigate to **Emails** > **Email Accounts**.
3. Locate **`info@jeemu.fun`**.
4. If you already know your password, proceed to Step 2. If not, click **Manage** > **Change Password** to set a new password.

### Step 2: Add your credentials to `.env`
Open your `.env` file (or set these in your hosting environment like Vercel):

```ini
# Hostinger SMTP Configuration
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@jeemu.fun
SMTP_PASS="YOUR_HOSTINGER_EMAIL_PASSWORD_HERE"
EMAIL_FROM="Jeemu Tabletop <info@jeemu.fun>"
SITE_URL=https://jeemu.fun
```

> **Note:** If `SMTP_PASS` is left blank, the app runs in **safe simulation mode** — it logs the emails and previews to the terminal console so testing and local development never fail.

### Step 3: Recommended Hostinger DNS Deliverability (SPF & DKIM)
To guarantee your emails land in the primary inbox (and never in Spam):
1. In Hostinger hPanel, go to **Domains** > `jeemu.fun` > **DNS / Nameservers**.
2. Ensure Hostinger Email's default **SPF** and **DKIM** TXT records are active:
   - **SPF TXT**: `v=spf1 include:_spf.mail.hostinger.com ~all`
   - **DMARC TXT**: `v=DMARC1; p=none; sp=none;`

---

## 2. Automated Email Triggers & Templates

Jeemu includes 3 responsive, styled HTML & plain-text email templates:

| Email Type | When Triggered | Recipient | What it contains |
| :--- | :--- | :--- | :--- |
| **1. Signup & Waitlist Confirmation** | When a user submits the waitlist form on the website. | The new subscriber | • Welcome to Batch 01 reservation<br>• Guaranteed 45% discount confirmation ($89 vs $159)<br>• **Unique personal referral link** (`?ref=CODE`)<br>• Referral milestone rewards ladder<br>• 1-Click WhatsApp, X, Facebook share links<br>• 1-Click Unsubscribe link |
| **2. Referral Usage & Milestone Update** | When a friend signs up using an existing backer's referral link. | The referring backer | • Real-time alert: "[Name] just joined with your link!"<br>• Updated referral counter<br>• **Milestone unlocked banner** (Early Access, Expansion Pack, Founder Block, or Free Shipping)<br>• Visual progress bar to next milestone<br>• 1-Click Unsubscribe link |
| **3. $1 VIP Deposit Receipt** | When a backer completes the $1 refundable deposit (via Stripe or `/api/subscribers/vip`). | The VIP backer | • Official itemized receipt ($1.00 USD, Ref ID, Date)<br>• 100% Refundable policy notice<br>• Guaranteed Founder perks (Locked $89 price, Batch 01 priority slot, Gold Founder Block)<br>• Referral link reminder<br>• 1-Click Unsubscribe link |

---

## 3. Google Sheets Live Integration (Zero Friction Setup)

You can automatically sync every backer to a Google Sheet without setting up complex Google Cloud Service Accounts.

### Step 1: Create a Google Sheet
1. Open a new Google Sheet at **[sheets.new](https://sheets.new)**.
2. Name the sheet (e.g. `Jeemu Backers & VIP Waitlist`).

### Step 2: Add the Google Apps Script
1. In the Google Sheet top menu, click **Extensions** > **Apps Script**.
2. Delete any boilerplate code inside the editor.
3. Open [`scripts/google-apps-script.js`](file:///d:/Projects/jeemu/jeemu-webapp/scripts/google-apps-script.js) from this repository, copy the entire code, and paste it into the Apps Script editor.
4. Click the **Save** disk icon (Ctrl + S).

### Step 3: Deploy as Web App
1. In the top-right corner of the Apps Script page, click **Deploy** > **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description**: `Jeemu Webhook`
   - **Execute as**: `Me`
   - **Who has access**: **`Anyone`** *(Crucial: Allows the website backend to append rows without manual OAuth prompts)*.
4. Click **Deploy**.
5. Click **Authorize access**, select your Google account, and grant permission (click "Advanced" > "Go to Untitled project (unsafe)" if prompted).
6. Copy the **Web app URL** (looks like `https://script.google.com/macros/s/AKfycbx.../exec`).

### Step 4: Add to `.env`
Add the URL to your `.env` file:
```ini
GOOGLE_SHEET_WEBHOOK_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
```

### What gets synced to Google Sheets?
- **Timestamp**
- **Full Name**
- **Email Address**
- **Referral Code**
- **Referred By**
- **Friends Referred** (automatically increments when friends join!)
- **VIP Backer ($1 Deposit)** (Highlighted in green when paid)
- **Deposit Amount**
- **Stripe Ref ID**
- **Unsubscribed** (Highlighted in red if user unsubscribes)
- **Last Updated**

*(Existing rows are updated automatically in-place when a backer pays their $1 deposit or earns new referrals).*

---

## 4. 1-Click Unsubscribe System (Compliance)

Every outgoing email includes a tamper-proof 1-click unsubscribe link generated with HMAC SHA-256:
- URL: `https://jeemu.fun/api/unsubscribe?email=USER&token=HMAC`
- Also includes standard `List-Unsubscribe` headers for native 1-click unsubscribe buttons in Gmail and Apple Mail.
- When clicked:
  1. The user's status is updated to `unsubscribed: true` in Supabase/local DB.
  2. The Google Sheet column `Unsubscribed` is automatically updated to `YES` (with red highlight).
  3. All future launch updates and referral alerts are automatically blocked from being sent to this email.
  4. The user sees a branded confirmation page with a 1-click "Undo" option.

---

## 5. Testing & Diagnostics

### Test 1: Verify Hostinger SMTP Connection
Visit or call the diagnostic endpoint:
```bash
curl http://localhost:3000/api/admin/smtp-status
```
Response:
```json
{
  "smtpConfigured": true,
  "googleSheetsWebhookConfigured": true,
  "diagnostics": {
    "connected": true,
    "mode": "live",
    "host": "smtp.hostinger.com",
    "port": 465,
    "user": "info@jeemu.fun",
    "message": "Successfully connected and authenticated with Hostinger SMTP (smtp.hostinger.com:465)"
  }
}
```

### Test 2: Send a Test Email
Send an immediate test email to your personal inbox:
```bash
curl -X POST http://localhost:3000/api/admin/test-email \
  -H "Content-Type: application/json" \
  -d '{"targetEmail": "your-personal-email@gmail.com"}'
```

### Test 3: Export Instant CSV
Download the full live backer list as a Google Sheet-ready CSV at any time:
```
http://localhost:3000/api/admin/subscribers/export
```

---

## 6. Troubleshooting Common Issues

### Issue: "554 5.7.1 Outbound sending is disabled for this account"
If you see this error or emails stop arriving:
Hostinger automatically triggers this safety lock when a brand new mailbox sends multiple emails in rapid succession to prevent automated abuse.
**To fix in 30 seconds:**
1. Log in to **[Hostinger hPanel](https://hpanel.hostinger.com/)**.
2. Go to **Emails** > **Mailboxes** (for `jeemu.fun`).
3. Next to **`info@jeemu.fun`**, click the three dots (**⋮**) > **Settings** or look for an alert banner.
4. Click **"Enable Outgoing Email"** (or toggle off "Suspend sending").
5. Alternatively, click **"Change Password"** to reset the password — changing the password in hPanel automatically unlocks outbound sending immediately. (If you change the password, update `SMTP_PASS` in your `.env` file).


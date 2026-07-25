# Email notifications for new support tickets

Sends an email to **macbright822@gmail.com** every time a customer submits a
new ticket through the Bank of America app.

Architecture: `support_tickets` INSERT → Supabase Database Webhook →
Edge Function (`notify-support`) → Resend → your inbox.

Total setup time: ~10 minutes. You only do this once.

---

## 1. Get a free Resend API key

Resend is a transactional email API with a generous free tier (100
emails/day, no credit card required to start).

1. Go to https://resend.com and sign up
2. Dashboard → **API Keys** → Create API Key → copy it (starts with `re_`)

Keep this key secret — never paste it into client-side code or commit it to
a public repo.

---

## 2. Install the Supabase CLI (if you don't have it)

```bash
npm install -g supabase
```

Log in and link your project:

```bash
supabase login
supabase link --project-ref noafkwgspyenzxjwyhzz
```

---

## 3. Deploy the Edge Function

From the folder containing this file:

```bash
supabase functions deploy notify-support --no-verify-jwt
```

`--no-verify-jwt` is required here because the Database Webhook that calls
this function isn't an end-user request with a login token — it's Supabase
itself calling out on the database's behalf.

---

## 4. Store your Resend key as a secret

```bash
supabase secrets set RESEND_API_KEY=re_your_key_here
```

This keeps the key out of your code entirely — it's only ever visible to
your deployed function at runtime.

---

## 5. Create the Database Webhook

In the Supabase Dashboard:

1. Go to **Database → Webhooks → Create a new webhook**
2. **Name:** `notify-support-on-new-ticket`
3. **Table:** `support_tickets`
4. **Events:** check only **Insert**
5. **Type:** HTTP Request
6. **Method:** POST
7. **URL:**
   ```
   https://noafkwgspyenzxjwyhzz.functions.supabase.co/notify-support
   ```
8. **HTTP Headers:** add
   ```
   Content-Type: application/json
   ```
9. Save

That's it — no code changes needed in the app itself. The moment a customer
submits a ticket via `submitComplaint()`, Postgres fires the webhook,
Supabase calls your function, and your function emails
macbright822@gmail.com.

---

## 6. Test it

In the customer app, log in and send a test support message. Within a few
seconds you should get an email at macbright822@gmail.com with the subject
line `New support ticket: ...`.

If it doesn't arrive:
- Check **Database → Webhooks → notify-support-on-new-ticket → Logs** in the
  Supabase Dashboard for delivery errors
- Check **Edge Functions → notify-support → Logs** for runtime errors
- Resend's free tier can only send to the email address you signed up with
  until you verify a sending domain — if `macbright822@gmail.com` isn't the
  account owner's Resend email, verify a domain first (Resend dashboard →
  Domains) or temporarily set `ADMIN_EMAIL` in `index.ts` to your Resend
  account email while testing

---

## Notes

- This only notifies on **new** tickets, not on customer replies (there's
  no reply-from-customer flow yet in this prototype — only the admin
  replies).
- The `FROM_EMAIL` in `index.ts` uses Resend's shared testing domain
  (`onboarding@resend.dev`). For a real product you'd verify your own
  domain in Resend so emails come from something like
  `support@yourdomain.com`.
- If you'd rather avoid the CLI entirely, Resend also supports triggering
  sends via a plain webhook-to-Zapier/Make.com flow with no code — ask if
  you'd like that no-code version instead.

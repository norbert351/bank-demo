/// <reference lib="deno.ns" />
// Supabase Edge Function: notify-support
//
// Triggered by a Database Webhook whenever a row is inserted into
// `support_tickets`. Sends an email alert to the support inbox via Resend
// (https://resend.com — free tier, no credit card needed for testing).
//
// Deploy with:
//   supabase functions deploy notify-support --no-verify-jwt
//
// Set your Resend API key as a secret (never hardcode it here):
//   supabase secrets set RESEND_API_KEY=your_resend_api_key_here
//
// Then create a Database Webhook in the Supabase Dashboard
// (Database -> Webhooks) that POSTs to this function on INSERT
// into support_tickets. See the setup guide for exact steps.

const ADMIN_EMAIL = "macbright822@gmail.com";
const FROM_EMAIL = "Bank of America Support <onboarding@resend.dev>"; // swap for your verified sending domain later

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();

    // Supabase Database Webhooks send: { type, table, record, schema, old_record }
    const record = payload.record;
    if (!record) {
      return new Response(JSON.stringify({ ok: false, error: "No record in payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ ok: false, error: "RESEND_API_KEY not set" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const subject = `New support ticket: ${record.subject ?? "(no subject)"}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="margin-bottom: 4px;">New support ticket</h2>
        <p style="color: #666; margin-top: 0;">Bank of America &mdash; a customer just wrote in.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #666;">From</td><td style="padding: 6px 0;">${escapeHtml(record.email ?? "unknown")}</td></tr>
          <tr><td style="padding: 6px 0; color: #666;">Subject</td><td style="padding: 6px 0;">${escapeHtml(record.subject ?? "")}</td></tr>
          <tr><td style="padding: 6px 0; color: #666; vertical-align: top;">Message</td><td style="padding: 6px 0;">${escapeHtml(record.message ?? "")}</td></tr>
        </table>
        <p style="margin-top: 20px;">
          <a href="#" style="color: #2F6F62;">Open the admin panel to reply</a>
        </p>
      </div>
    `;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        subject,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      return new Response(JSON.stringify({ ok: false, error: errText }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

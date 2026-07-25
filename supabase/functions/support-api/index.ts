/// <reference lib="deno.ns" />

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REST = `${SUPABASE_URL}/rest/v1/support_tickets`;

function headers(authToken?: string) {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Prefer": "return=representation",
  };
  return h;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-user-id",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (req.method === "POST" && action === "insert") {
      const body = await req.json();
      const r = await fetch(REST, {
        method: "POST",
        headers: { ...headers(), "Prefer": "return=representation" },
        body: JSON.stringify({
          user_id: body.user_id,
          email: body.email,
          subject: body.subject,
          message: body.message,
          status: "open",
        }),
      });
      const data = await r.json();
      return new Response(JSON.stringify({ ok: true, data }), {
        status: r.ok ? 200 : r.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && action === "list") {
      const userId = url.searchParams.get("user_id");
      let q = `${REST}?select=*&order=created_at.desc`;
      if (userId) q += `&user_id=eq.${encodeURIComponent(userId)}`;
      const r = await fetch(q, { headers: headers() });
      const data = await r.json();
      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && action === "list-all") {
      const r = await fetch(`${REST}?select=*&order=created_at.desc`, { headers: headers() });
      const data = await r.json();
      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "PATCH" && action === "update") {
      const body = await req.json();
      const ticketId = body.id;
      const update: Record<string, string> = {};
      if (body.response !== undefined) update.response = body.response;
      if (body.status !== undefined) update.status = body.status;
      const r = await fetch(`${REST}?id=eq.${encodeURIComponent(ticketId)}`, {
        method: "PATCH",
        headers: { ...headers(), "Prefer": "return=representation" },
        body: JSON.stringify(update),
      });
      const data = await r.json();
      return new Response(JSON.stringify({ ok: true, data }), {
        status: r.ok ? 200 : r.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

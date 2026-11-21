const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function databaseHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ message: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ message: "Enquiry notification service is not configured." }, 500);
  }

  let enquiryId: unknown;
  try {
    ({ enquiryId } = await request.json());
  } catch {
    return jsonResponse({ message: "Invalid request body." }, 400);
  }
  if (typeof enquiryId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(enquiryId)) {
    return jsonResponse({ message: "A valid enquiry ID is required." }, 400);
  }

  const baseUrl = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/customer_enquiries`;
  const headers = databaseHeaders(serviceRoleKey);
  let row: Record<string, string> | undefined;
  let claimed = false;

  try {
    const lookup = await fetch(`${baseUrl}?id=eq.${enquiryId}&select=id,request_type,name,email,business,service,budget,description,created_at,notification_status`, {
      headers,
    });
    if (!lookup.ok) throw new Error("Could not load the saved enquiry.");
    const rows = await lookup.json() as Array<Record<string, string>>;
    row = rows[0];
    if (!row) return jsonResponse({ message: "Enquiry not found." }, 404);
    if (row.notification_status === "sent") return jsonResponse({ status: "already_sent" });
    if (!["pending", "failed"].includes(row.notification_status)) {
      return jsonResponse({ status: row.notification_status, message: "Notification is already being processed." }, 409);
    }

    const claim = await fetch(`${baseUrl}?id=eq.${enquiryId}&notification_status=in.(pending,failed)`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ notification_status: "sending", notification_error: "" }),
    });
    if (!claim.ok) throw new Error("Could not claim the enquiry notification.");
    const claimedRows = await claim.json() as Array<Record<string, unknown>>;
    if (claimedRows.length === 0) return jsonResponse({ status: "sending", message: "Notification is already being processed." }, 409);
    claimed = true;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const emailFrom = Deno.env.get("EMAIL_FROM");
    const emailTo = Deno.env.get("WORKZENN_NOTIFICATION_EMAIL") || "workzenn7@gmail.com";
    if (!resendApiKey || !emailFrom) {
      throw new Error("Set RESEND_API_KEY and EMAIL_FROM in Supabase Edge Function secrets.");
    }

    const submittedAt = new Date(row.created_at).toISOString();
    const text = [
      `New WORKZENN ${row.request_type === "trial" ? "free trial request" : "customer enquiry"}`,
      "",
      `Name: ${row.name}`,
      `Email: ${row.email}`,
      `Selected service: ${row.service}`,
      `Budget: ${row.budget || "Not provided"}`,
      `Project description: ${row.description || "Not provided"}`,
      `Business: ${row.business || "Not provided"}`,
      `Submitted: ${submittedAt}`,
      `Enquiry ID: ${row.id}`,
    ].join("\n");

    const delivery = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `workzenn-enquiry-${row.id}`,
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [emailTo],
        reply_to: row.email,
        subject: `New WORKZENN ${row.request_type === "trial" ? "free trial request" : "customer enquiry"} — ${row.name}`,
        text,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!delivery.ok) {
      const details = await delivery.text();
      throw new Error(`Email provider returned ${delivery.status}: ${details.slice(0, 1000)}`);
    }

    const update = await fetch(`${baseUrl}?id=eq.${enquiryId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ notification_status: "sent", notification_error: "" }),
    });
    if (!update.ok) throw new Error("Email was accepted, but notification status could not be updated.");
    return jsonResponse({ status: "sent" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email notification failed.";
    if (claimed) {
      const failureUpdate = await fetch(`${baseUrl}?id=eq.${enquiryId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          notification_status: "failed",
          notification_error: message.slice(0, 1000),
        }),
      });
      if (!failureUpdate.ok) console.error("Could not record enquiry email failure:", await failureUpdate.text());
    }
    console.error("Enquiry email delivery failed:", message);
    return jsonResponse({ status: "failed", message: "The enquiry is saved, but its email notification could not be delivered." }, 502);
  }
});

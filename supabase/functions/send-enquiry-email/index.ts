const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Enquiry = {
  id: string;
  request_type: string;
  name: string;
  email: string;
  business: string;
  service: string;
  budget: string;
  description: string;
  instagram_username: string;
  reference_image_url: string;
  email_notification_token: string | null;
  notification_status: string;
  notification_attempted_at: string | null;
  created_at: string;
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

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (character) => entities[character] || character);
}

function formatEmail(enquiry: Enquiry) {
  const submittedAt = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeStyle: "long",
    timeZone: "Asia/Kolkata",
  }).format(new Date(enquiry.created_at));
  const username = enquiry.instagram_username ? `@${enquiry.instagram_username.replace(/^@+/, "")}` : "Not provided";
  const referenceImage = enquiry.reference_image_url || "Not provided";
  const safeReferenceImage = /^https:\/\/\S+$/i.test(referenceImage)
    ? `<a href="${escapeHtml(referenceImage)}" style="color:#f05a60;text-decoration:underline">View reference image</a><br><span style="color:#c8c3c0;word-break:break-all">${escapeHtml(referenceImage)}</span>`
    : escapeHtml(referenceImage);
  const rows = [
    ["Enquiry ID", enquiry.id],
    ["Customer Name", enquiry.name],
    ["Customer Email", enquiry.email],
    ["Instagram Username", username],
    ["Selected Service", enquiry.service],
    ["Selected Budget in INR", enquiry.budget],
    ["Project Description", enquiry.description],
    ["Reference Image URL", safeReferenceImage],
    ["Submission Date and Time", submittedAt],
  ];
  const htmlRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:12px 14px;border-bottom:1px solid #292929;color:#a8a29e;font-size:12px;vertical-align:top;width:190px">${escapeHtml(label)}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #292929;color:#f2efec;font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-word">${label === "Reference Image URL" ? value : escapeHtml(value)}</td>
    </tr>`).join("");
  const text = [
    `Enquiry ID: ${enquiry.id}`,
    `Customer Name: ${enquiry.name}`,
    `Customer Email: ${enquiry.email}`,
    `Instagram Username: ${username}`,
    `Selected Service: ${enquiry.service}`,
    `Selected Budget in INR: ${enquiry.budget}`,
    `Project Description: ${enquiry.description}`,
    `Reference Image URL: ${referenceImage}`,
    `Submission Date and Time: ${submittedAt}`,
  ].join("\n");
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:28px 12px;background:#090909;font-family:Arial,Helvetica,sans-serif;color:#f2efec">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:720px;margin:0 auto;border:1px solid #302c2b;background:#11100f">
      <tr>
        <td style="padding:24px 26px;border-bottom:2px solid #ef343b">
          <div style="font-size:20px;font-weight:800;letter-spacing:-1px">WORKZENN<span style="color:#ef343b">.</span></div>
          <h1 style="margin:24px 0 6px;font-size:22px;font-weight:600;letter-spacing:-.4px">New Customer Enquiry</h1>
          <p style="margin:0;color:#a8a29e;font-size:12px">A new enquiry was submitted on the WORKZENN website.</p>
        </td>
      </tr>
      <tr><td style="padding:12px 12px 18px">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">${htmlRows}</table>
      </td></tr>
      <tr><td style="padding:15px 26px;border-top:1px solid #292929;color:#8f8984;font-size:10px">WORKZENN · Digital, made to move you forward.</td></tr>
    </table>
  </body>
</html>`;
  return { html, text, submittedAt };
}

async function hashRequestKey(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function isAuthorizedAdmin(
  authorization: string | null,
  supabaseUrl: string,
  serviceRoleKey: string,
) {
  if (!authorization?.startsWith("Bearer ")) return false;

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: authorization,
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!userResponse.ok) return false;
  const user = await userResponse.json();
  const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  if (!email || !user.email_confirmed_at) return false;

  const allowlistResponse = await fetch(
    `${supabaseUrl}/rest/v1/admin_email_allowlist?email=eq.${encodeURIComponent(email)}&select=email&limit=1`,
    { headers: databaseHeaders(serviceRoleKey), signal: AbortSignal.timeout(8000) },
  );
  if (!allowlistResponse.ok) throw new Error("Could not verify admin authorization.");
  const allowlist = await allowlistResponse.json();
  return Array.isArray(allowlist) && allowlist.length === 1;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ message: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ message: "Email notification service is not configured." }, 500);
  }

  let body: Record<string, unknown>;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).length > 4096) {
      return jsonResponse({ message: "Request body is too large." }, 413);
    }
    const parsedBody: unknown = JSON.parse(rawBody);
    if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
      return jsonResponse({ message: "Invalid request body." }, 400);
    }
    body = parsedBody as Record<string, unknown>;
  } catch {
    return jsonResponse({ message: "Invalid request body." }, 400);
  }

  const enquiryId = body.enquiryId;
  const notificationToken = body.notificationToken;
  if (typeof enquiryId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(enquiryId)) {
    return jsonResponse({ message: "A valid enquiry ID is required." }, 400);
  }
  if (notificationToken !== undefined && (typeof notificationToken !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notificationToken))) {
    return jsonResponse({ message: "Invalid enquiry notification token." }, 400);
  }

  const baseUrl = `${supabaseUrl}/rest/v1/enquiries`;
  const headers = databaseHeaders(serviceRoleKey);
  let claimed = false;

  try {
    const lookup = await fetch(
      `${baseUrl}?id=eq.${enquiryId}&select=id,request_type,name,email,business,service,budget,description,instagram_username,reference_image_url,email_notification_token,notification_status,notification_attempted_at,created_at`,
      { headers, signal: AbortSignal.timeout(8000) },
    );
    if (!lookup.ok) throw new Error("Could not load the saved enquiry.");
    const rows = await lookup.json() as Enquiry[];
    const enquiry = rows[0];
    if (!enquiry) return jsonResponse({ message: "Enquiry not found." }, 404);

    const authorizedAdmin = await isAuthorizedAdmin(
      request.headers.get("authorization"),
      supabaseUrl,
      serviceRoleKey,
    );
    const ownsEnquiry = typeof notificationToken === "string"
      && notificationToken.toLowerCase() === enquiry.email_notification_token?.toLowerCase();
    if (!authorizedAdmin && !ownsEnquiry) {
      return jsonResponse({ message: "Not authorized to send this enquiry notification." }, 403);
    }

    if (enquiry.notification_status === "sent") return jsonResponse({ status: "already_sent" });
    const staleSending = enquiry.notification_status === "sending"
      && enquiry.notification_attempted_at !== null
      && Date.parse(enquiry.notification_attempted_at) < Date.now() - 10 * 60 * 1000;
    if (!["pending", "failed"].includes(enquiry.notification_status) && !staleSending) {
      return jsonResponse({ status: enquiry.notification_status, message: "Notification is already being processed." }, 409);
    }

    if (!authorizedAdmin) {
      const forwardedFor = request.headers.get("cf-connecting-ip")
        || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || "unknown";
      const hourBucket = Math.floor(Date.now() / 3600000);
      const requestKey = await hashRequestKey(`${forwardedFor}:${hourBucket}`);
      const rateLimitResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_enquiry_email_rate_limit`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          p_request_key: requestKey,
          p_limit: 5,
          p_window_seconds: 3600,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!rateLimitResponse.ok) throw new Error("Could not check the email notification rate limit.");
      if (await rateLimitResponse.json() !== true) {
        return jsonResponse({ message: "Too many email notification attempts. Please try again later." }, 429);
      }
    }

    const claimFilters = new URLSearchParams({
      id: `eq.${enquiryId}`,
      or: `(notification_status.in.(pending,failed),and(notification_status.eq.sending,notification_attempted_at.lt.${new Date(Date.now() - 10 * 60 * 1000).toISOString()}))`,
    });
    const claim = await fetch(
      `${baseUrl}?${claimFilters}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          notification_status: "sending",
          notification_error: "",
          notification_attempted_at: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!claim.ok) throw new Error("Could not claim the enquiry notification.");
    const claimedRows = await claim.json() as Array<Record<string, unknown>>;
    if (claimedRows.length === 0) {
      return jsonResponse({ status: "sending", message: "Notification is already being processed." }, 409);
    }
    claimed = true;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const emailFrom = Deno.env.get("EMAIL_FROM");
    const emailTo = Deno.env.get("WORKZENN_NOTIFICATION_EMAIL");
    if (!resendApiKey || !emailFrom || !emailTo) {
      throw new Error("Set RESEND_API_KEY, EMAIL_FROM, and WORKZENN_NOTIFICATION_EMAIL in Edge Function secrets.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo.trim())) {
      throw new Error("WORKZENN_NOTIFICATION_EMAIL must be a valid email address.");
    }

    const { html, text } = formatEmail(enquiry);
    const delivery = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `workzenn-enquiry-${enquiry.id}`,
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [emailTo.trim()],
        reply_to: enquiry.email,
        subject: `New Customer Enquiry – WORKZENN #${enquiry.id}`,
        html,
        text,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!delivery.ok) {
      console.error("Resend rejected an enquiry notification:", delivery.status);
      throw new Error(`Email provider returned status ${delivery.status}.`);
    }

    const update = await fetch(`${baseUrl}?id=eq.${enquiryId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        notification_status: "sent",
        notification_error: "",
        email_sent_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!update.ok) throw new Error("Email was accepted, but notification status could not be updated.");
    return jsonResponse({ status: "sent", enquiryId: enquiry.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email notification failed.";
    if (claimed) {
      try {
        const failureUpdate = await fetch(`${baseUrl}?id=eq.${enquiryId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            notification_status: "failed",
            notification_error: message.slice(0, 1000),
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (!failureUpdate.ok) console.error("Could not record enquiry email failure:", failureUpdate.status);
      } catch (failureError) {
        console.error("Could not record enquiry email failure:", failureError);
      }
    }
    console.error("Enquiry email delivery failed:", message);
    return jsonResponse({
      status: claimed ? "failed" : "error",
      message: claimed
        ? "The enquiry is saved, but its email notification could not be delivered."
        : "Email notification could not be processed.",
    }, claimed ? 502 : 500);
  }
});

# WORKZENN

Responsive React + Vite website with an optional Supabase-powered admin area.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project API settings. These are public client values; never put a service-role key or account password in frontend environment variables.
3. Apply the SQL migrations in `supabase/migrations/` in filename order using the Supabase SQL editor or Supabase CLI. The latest migrations seed INR service prices, move submissions to the `enquiries` table, and add idempotent submission tokens plus server-side email rate limits.
4. In Supabase Authentication settings:
   - Enable email/password sign-in and require email confirmation.
   - Disable public sign-ups. There is intentionally no admin registration page or sign-up API in the website.
   - Set the site URL and add `http://localhost:5173/admin/login?mode=reset` plus the production equivalent to the allowed redirect URLs.
   - Configure email delivery so confirmation and password-reset links reach the admin.
5. Create or invite `workzenn7@gmail.com` from the Supabase dashboard (or another trusted server-side process), then complete email verification. Do not create accounts through a public registration flow. The `20261122000002_secure_admin_content.sql` migration adds this one email to a private allowlist. Admin authorization is checked by a `SECURITY DEFINER` database function against the verified Supabase Auth user and is enforced by RLS; frontend checks only improve the sign-in experience.
6. Configure email notifications:
   - Verify a sender domain with Resend.
   - Set secrets only in Supabase: `supabase secrets set RESEND_API_KEY=... EMAIL_FROM="WORKZENN <enquiries@your-verified-domain>" WORKZENN_NOTIFICATION_EMAIL="admin@your-domain.com"`. Replace the sender and recipient with your verified sender and intended admin inbox. Do not put these secrets in `.env`, Vite variables, or browser code.
   - Deploy `supabase/functions/send-enquiry-email/` using `supabase functions deploy send-enquiry-email`.
   - Deploy `supabase/functions/send-enquiry-notification/` using `supabase functions deploy send-enquiry-notification` to retire the previous notification endpoint.
   - Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Do not copy the service-role key into frontend configuration.
7. Start the website with `npm run dev`.

The consultation form validates and inserts the customer details into `public.enquiries` before attempting notification. Each submission has a unique ID and idempotency key. The server-side Edge Function sends a WORKZENN-branded HTML email through Resend, records sent/failed status, and allows authorized admins to retry failures. Customer notifications require the one-time token returned by the insert RPC; retries require a verified allowlisted admin session. Public email sends are rate-limited. Enquiry details include the customer's Instagram username and optional HTTPS reference image URL.

To verify a deployment, submit one clearly marked test enquiry through the live form, confirm its ID and notification status in **Admin Dashboard → Customer Enquiries**, and check the configured admin inbox. To test failure handling, temporarily use an invalid Resend API secret in a non-production project, confirm the record remains and is marked failed, restore the valid secret, and use **Retry email**. Never use a real customer submission as a test.

The admin dashboard is available at `/admin` and includes portfolio media uploads, services, INR pricing, enquiries, trial requests, and contact settings. Edit service prices in **Manage Pricing** using `₹amount`, `Starting at ₹amount`, or `Custom quotation`. The public pricing list refreshes from Supabase; consultation enquiries save the selected service and INR budget, including custom budgets, for review in the dashboard. Portfolio media is stored in the `workzenn-portfolio` Supabase Storage bucket. RLS policies restrict dashboard data changes and uploads to the verified allowlisted admin; only published portfolio, services, and pricing are public. If Supabase is not configured, public pages still render with their built-in content; admin sign-in and enquiry submission require configuration.

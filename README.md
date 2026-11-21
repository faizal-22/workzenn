# WORKZENN

Responsive React + Vite website with an optional Supabase-powered admin area.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project API settings. These are public client values; never put a service-role key or account password in frontend environment variables.
3. Apply the SQL migrations in `supabase/migrations/` in filename order using the Supabase SQL editor or Supabase CLI. The latest migrations add the secure enquiry workflow and remove legacy contact fields from the database.
4. In Supabase Authentication settings:
   - Enable email/password sign-in and require email confirmation.
   - Disable public sign-ups. There is intentionally no admin registration page or sign-up API in the website.
   - Set the site URL and add `http://localhost:5173/admin/login?mode=reset` plus the production equivalent to the allowed redirect URLs.
   - Configure email delivery so confirmation and password-reset links reach the admin.
5. Create or invite `workzenn7@gmail.com` from the Supabase dashboard (or another trusted server-side process), then complete email verification. Do not create accounts through a public registration flow. The `20261122000002_secure_admin_content.sql` migration adds this one email to a private allowlist. Admin authorization is checked by a `SECURITY DEFINER` database function against the verified Supabase Auth user and is enforced by RLS; frontend checks only improve the sign-in experience.
6. Configure email notifications:
   - Verify a sender domain with Resend.
   - Deploy `supabase/functions/send-enquiry-notification/` with `supabase functions deploy send-enquiry-notification`.
   - Set function secrets with `supabase secrets set RESEND_API_KEY=... EMAIL_FROM="WORKZENN <enquiries@your-verified-domain>" WORKZENN_NOTIFICATION_EMAIL=workzenn7@gmail.com`. Replace the sender with an address on the verified domain. These values belong only in Supabase; never add them to Vite or frontend environment variables. Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions.
7. Start the website with `npm run dev`.

All contact and enquiry CTAs open the fixed WORKZENN Instagram profile in a new tab. Submitting the consultation form also saves the customer name, email, service, budget, project description, and submission time before requesting the email notification. Saved enquiries remain in Supabase if email delivery fails; the admin can review, update status, delete, or retry a failed notification. Email is sent by the server-side Supabase Edge Function through Resend to `workzenn7@gmail.com`.

The admin dashboard is available at `/admin` and includes portfolio media uploads, services, pricing, enquiries, trial requests, and contact settings. Portfolio media is stored in the `workzenn-portfolio` Supabase Storage bucket. RLS policies restrict dashboard data changes and uploads to the verified allowlisted admin; only published portfolio, services, and pricing are public. If Supabase is not configured, public pages still render with their built-in content; admin sign-in and enquiry submission require configuration.

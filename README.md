# WORKZENN

Responsive React + Vite website with an optional Supabase-powered admin area.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project API settings. These are public client values; never put a service-role key or account password in frontend environment variables.
3. Apply the SQL migrations in `supabase/migrations/` in filename order using the Supabase SQL editor or Supabase CLI. The latest migration sets the official Instagram username and URL while preserving the other saved contact settings.
4. In Supabase Authentication settings, disable public sign-ups and configure the site URL plus the redirect URL `http://localhost:5173/admin/login?mode=reset` (and the production equivalent).
5. Create the first admin account using the Supabase dashboard or another trusted server-side process. Then add its user UUID to `public.admin_users` from the SQL editor:

   ```sql
   insert into public.admin_users (user_id)
   values ('AUTH_USER_UUID');
   ```

   Do not add a public registration flow. Admin authorization is controlled by this table and enforced by Row Level Security, not by hiding the dashboard route.
6. Start the website with `npm run dev`.

The public website reads social settings from `public.social_media_settings`. If Supabase is not configured, public pages still render, while admin sign-in and settings require configuration.

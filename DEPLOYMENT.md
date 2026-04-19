# Questlog Deployment (Vercel + Supabase)

## 1) Supabase setup

1. Open your Supabase project dashboard.
2. Go to `SQL Editor`.
3. Run each migration from `supabase/migrations/` in order:
   - `002_badges_questlines.sql`
   - `003_user_quests_progress.sql`
   - `004_streaks_recap.sql`
4. In Supabase, open `Authentication` -> `URL Configuration`.
5. Set:
   - `Site URL`: your Vercel URL (for example `https://questlog.vercel.app`)
   - `Redirect URLs`: add both:
     - `https://questlog.vercel.app/auth`
     - `https://questlog.vercel.app/reset-password`

## 2) Vercel project setup

1. Open https://vercel.com/new
2. Import `owenaslin/questlog`.
3. Framework preset should auto-detect as `Next.js`.
4. Keep build command as `next build`.
5. Keep output directory empty/default.

## 3) Environment variables in Vercel

In Vercel project settings -> `Environment Variables`, add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (optional compatibility fallback)
- `GOOGLE_GEMINI_API_KEY`

Set each for `Production` (and optionally `Preview`, `Development`).

## 4) Deploy

1. Click `Deploy`.
2. Wait for first deployment to finish.
3. Open the deployed URL and test:
   - Sign up / log in
   - Quests page load
   - Profile page load
   - AI generation (if Gemini key is set)

## 5) If auth redirects fail

Double-check both sides:

- Supabase `Site URL` + `Redirect URLs`
- Your app URL in Vercel (Production domain)

Then redeploy from Vercel -> `Deployments` -> `Redeploy`.

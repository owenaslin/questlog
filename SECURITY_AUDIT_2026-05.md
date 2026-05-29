# Security Audit — Questlog (May 2026)

**Date:** 2026-05-29
**Scope:** Full-application penetration-test-style review focused on vulnerability
discovery and SQL injection.
**Branch:** `claude/security-audit-pentest-1zO9G`
**Methodology:** Static source review (auth, input handling, DB access, output
rendering, SSRF/CSRF/XSS surface) + **live read-only verification** against the
Supabase project (`get_advisors`, `list_tables`, read-only `execute_sql`) +
`npm audit` dependency scan. No production data was mutated.

## Summary

| # | Finding | Severity | CWE | Status |
|---|---------|----------|-----|--------|
| 1 | PostgREST filter injection via unescaped `questId` in OG route | High | CWE-89 / CWE-943 | **Fixed (code)** |
| 2 | `get_hero_dashboard(p_user_id)` SECURITY DEFINER exposes hero data without `auth.uid()` check | Info | CWE-639 | **Not a vuln — public-by-design (verify fields)** |
| 3 | IDOR/abuse: `check_and_increment_discovery_count(p_user_id)` no `auth.uid()` check | Medium | CWE-639 | **Fix provided (migration 023)** |
| 4 | Trigger-only SECURITY DEFINER functions EXECUTE-able by anon/authenticated | Low | CWE-732 | **Fix provided (migration 023)** |
| 5 | Weak password policy (6-char minimum) | Medium | CWE-521 | **Fixed (code)** |
| 6 | Leaked-password protection disabled in Supabase Auth | Medium | CWE-521 | **Recommended (dashboard)** |
| 7 | Public profile `handle` not validated at app layer | Low | CWE-20 | **Fixed (code)** |
| 8 | Prompt-injection surface in AI endpoints | Low | CWE-1427 | **Hardened (code)** |
| 9 | `spatial_ref_sys` has RLS disabled (PostGIS table) | Low | CWE-732 | **Documented** |
| 10 | Functions with mutable `search_path` | Low | CWE-426 | **Fix provided (migration 023)** |
| 11 | 6 moderate `npm audit` advisories | Low | — | **Documented** |
| 12 | No `npm audit`/secret-scanning in CI; no test framework | Info | — | **Recommended** |

Overall the application is well-built: Supabase SDK calls are parameterized,
inputs are validated with Zod, RLS is enabled on all 18 application tables, auth
uses Bearer-token validation, and React auto-escaping prevents reflected XSS. The
issues below are the concrete gaps found.

---

## Findings

### 1. PostgREST filter injection in OG triumph route — HIGH (Fixed)

`src/app/api/og/triumph/[questId]/route.tsx` interpolated the `questId` path
parameter directly into a Supabase REST URL:

```ts
`${SUPABASE_URL}/rest/v1/quests?id=eq.${questId}&select=*`
```

Because `questId` was neither validated nor URL-encoded, an attacker could inject
additional PostgREST query operators (e.g. `0&id=neq.0`, embedded `or`/filter
syntax) to manipulate the `WHERE` clause — a horizontal filter-injection
(SQL-injection-class) issue on a public, unauthenticated endpoint. Impact was
bounded by the anon key + RLS, but the query shaping was attacker-controlled.

**Fix:** validate `questId` with `isUuid()` (reject non-UUIDs before any fetch)
and `encodeURIComponent()` the value. The shared validators live in
`src/lib/og-utils.ts` (`isUuid`, `isValidHandle`) and are re-exported from
`src/lib/api-utils.ts`. The companion `user`/`handle` param is now validated in
`fetchHeroByHandle()`.

### 2. `get_hero_dashboard(p_user_id)` exposes hero data without `auth.uid()` check — INFO (not a vuln)

The RPC is `SECURITY DEFINER` (bypasses RLS), executable by `anon`, and contains
no `auth.uid()` check, so any caller can read a given user's pinned quests, badge
IDs, completed-quest count, and longest streak. Initially flagged as IDOR, but
this is **public-by-design**: the public hero page (`src/app/hero/[handle]/...`)
calls `getHeroDashboard(heroData.id)` with the *viewed* hero's id from an
anonymous/third-party browser client (`HeroPageClient.tsx:59`). The function
deliberately exposes a curated public subset of otherwise RLS-protected tables.

An earlier draft of migration 023 added an `auth.uid()` guard here — that guard
was **removed**, because it would break a logged-in user viewing *another* user's
public hero page (`auth.uid() <> p_user_id → RAISE`). No code fix is applied.
**Action:** confirm every field returned is intended to be public; if any (e.g.
in-progress quest titles) should be private, scope them in the function instead
of adding an auth check that breaks public viewing.

### 3. IDOR/abuse in `check_and_increment_discovery_count(p_user_id)` — MEDIUM (migration 023)

Same pattern as #2, but this function **UPDATEs `profiles`** (`discovery_count_today`,
`last_discovery_at`). With no `auth.uid()` check and anon EXECUTE, an attacker
could repeatedly call it with a victim's UUID to exhaust that user's daily
discovery quota (integrity/availability abuse of a rate-limited feature). Fixed
with the same owner-only guard in migration 023.

### 4. Trigger-only SECURITY DEFINER functions exposed as RPC — LOW (migration 023)

Nine `SECURITY DEFINER` functions that return `trigger` (e.g. `handle_new_user`,
`award_habit_xp`, `update_habit_streak`, `on_quest_completion_tracking`) retained
EXECUTE for `anon`/`authenticated`, exposing them as PostgREST RPC endpoints.
Triggers run as the table owner regardless of grants, so revoking EXECUTE is safe
and removes the unnecessary surface. Migration 023 revokes these plus the
operational `reset_daily_discovery_counts()`.

### 5. Weak password policy — MEDIUM (Fixed)

Client-side minimum was 6 characters (`src/app/reset-password/page.tsx`,
`src/app/auth/page.tsx`). Raised the enforced minimum to **8** on signup and
password reset, and updated the error-message mapping.
**Note:** the authoritative minimum is a server-side Supabase Auth setting — set
the project's minimum password length to ≥ 8 in the dashboard to match.

### 6. Leaked-password protection disabled — MEDIUM (Recommended)

The Supabase security advisor reports `auth_leaked_password_protection` is off.
Enable HaveIBeenPwned checking in **Auth → Policies** so compromised passwords
are rejected. Pairs with finding #5.

### 7. Public `handle` not validated at app layer — LOW (Fixed)

`src/app/hero/[handle]/page.tsx` used the URL `handle` in PostgREST calls and OG
meta tags without app-layer validation (the DB enforced the format, the app did
not). Added `isValidHandle()` (mirrors the DB regex
`^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$`, case-insensitive since handles are stored
lowercase and `get_profile_by_handle` lower()s its input, so mixed-case URLs must
still resolve): `generateMetadata` returns a neutral title and the page calls
`notFound()` for malformed handles, `fetchHeroByHandle` rejects them before
issuing a request, and the OG image routes fall back to a safe handle rather than
reflecting a malformed one.

### 8. Prompt-injection surface in AI endpoints — LOW (Hardened)

`/api/generate` and `/api/quests/evaluate` embed user `topic`/`location` into LLM
prompts. The existing `sanitize()` stripped `<>` and control chars but not
newline-based instruction overrides. Added `sanitizePromptInput()`
(`src/lib/api-utils.ts`), which additionally collapses whitespace/newlines, and
applied it to the short free-text fields (`topic`, `location`, `title`).
Multi-line `description` keeps regular `sanitize()` to preserve formatting.
Residual risk is accepted: output is not persisted as trusted content.

### 9. `spatial_ref_sys` RLS disabled — LOW (Documented)

The PostGIS reference table `public.spatial_ref_sys` is exposed via PostREST with
RLS disabled. This is a PostGIS-managed system table; enabling RLS without
policies can break PostGIS functionality. Decide explicitly whether to enable RLS
or restrict access — see the commented block in migration 023. Related advisor:
PostGIS extension installed in the `public` schema.

### 10. Mutable `search_path` functions — LOW (migration 023)

`update_daily_adventures_timestamp()` and `update_user_settings_timestamp()` did
not pin `search_path`. Migration 023 sets `search_path = public`.

### 11. Dependency advisories — LOW (Documented)

`npm audit` reports **6 moderate** issues: `brace-expansion` (DoS),
`postcss` (XSS in stringify; pulled via `next`), and `ws` (memory disclosure).
`npm audit fix` resolves `brace-expansion` and `ws` non-destructively; the
`postcss`/`next` chain requires a Next.js upgrade and should be planned
separately. None are known to be remotely exploitable in this app's usage.

### 12. CI / testing gaps — INFO (Recommended)

CI runs SonarCloud only. Recommended: add `npm audit`/Dependabot and GitHub
secret scanning to CI, add a CSP header in `next.config.mjs` (other security
headers are already present), and introduce a test framework with regression
tests for the routes fixed here.

---

## Remediation status

- **Applied in code (this branch):** #1, #5, #7, #8.
- **Migration provided (`supabase/migrations/023_security_audit_hardening.sql`,
  review before applying — not auto-applied):** #3, #4, #10.
- **Reclassified as not-a-vuln after review:** #2 (public-by-design).
- **Operational / dashboard:** #6 (leaked-password protection), #5 server-side
  minimum, #9 decision, #11 `npm audit fix`, #12 CI hardening.

## Verification performed

- `npm run lint` — passes (one pre-existing unrelated warning in `trophies/page.tsx`).
- `npm run build` — succeeds.
- Live Supabase advisors + `list_tables`: confirmed RLS enabled on all 18
  application tables; enumerated the SECURITY DEFINER/RPC exposure that produced
  findings #2–#4 and #9–#10.
- `npm audit`: recorded in finding #11.
- Finding #1: confirmed non-UUID `questId` is now rejected before the fetch.

> Migration 023 is intentionally **not** applied to the live project; apply it
> via the normal Supabase migration workflow after review in staging.

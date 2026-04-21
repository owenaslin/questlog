# Security Incident Response Runbook

This runbook covers urgent response steps for credential exposure or provider-side incidents (for example, a cloud platform breach).

## 0) Trigger Conditions

Use this runbook when any of the following happen:

- A provider reports possible environment variable exposure.
- You detect suspicious deployment, account, or API activity.
- A secret appears in logs, screenshots, chat tools, or issue threads.

## 1) Immediate Containment (First 30 Minutes)

1. Freeze production deploys until triage is complete.
2. Enable/verify MFA for all org admins and maintainers.
3. Review provider activity logs for unknown users, OAuth grants, or deploys.
4. Revoke suspicious sessions and provider access tokens.

## 2) Credential Rotation Order (Priority)

Rotate in this order to minimize blast radius:

1. High privilege credentials
   - `SUPABASE_SERVICE_ROLE_KEY` (if present anywhere)
   - Deployment protection bypass tokens
   - Any signing keys or webhook secrets
2. Third-party API keys
   - `GOOGLE_GEMINI_API_KEY`
3. Data/infrastructure credentials
   - KV/Redis integration credentials
4. Public/edge credentials (defense in depth)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

After each rotation:

- Update values in all environments (`Production`, `Preview`, `Development`).
- Mark secrets as sensitive in your deployment platform.
- Redeploy and verify health checks.

## 3) Application Verification

After rotation, run these checks:

1. Authentication flows (sign in, sign up, password reset)
2. Protected API routes (`/api/generate`, `/api/quests/evaluate`, `/api/quests/save`)
3. Rate limiting behavior and error handling
4. Database writes under RLS
5. Deployment protection gates for preview/production

## 4) Threat Hunting Checklist

Investigate:

- Unexpected deploys or build hooks
- Spikes in API usage or 429/5xx patterns
- Unknown OAuth app grants in admin accounts
- New environment variable edits outside change windows

## 5) Recovery Completion Criteria

Incident response can be closed when:

- All affected credentials are rotated and confirmed.
- Sensitive flag is enabled for all private env vars.
- No suspicious sessions remain active.
- Monitoring and alerting are back to baseline.
- A short post-incident summary is documented.

## 6) Post-Incident Hardening

- Keep service-role credentials out of baseline app setup docs.
- Keep API abuse telemetry enabled for key routes.
- Run quarterly secret inventory and least-privilege review.
- Keep dependency and provider security notices monitored.

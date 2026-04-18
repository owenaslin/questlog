# Security Policy

## Reporting Security Vulnerabilities

We take security seriously at Questlog. If you discover a security vulnerability, please follow the responsible disclosure process below.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please email security concerns to: **security@questlog.app** (or contact the repository owner directly if this email is not yet configured).

### What to Include

When reporting a vulnerability, please include:

- **Description** — A clear description of the vulnerability
- **Steps to Reproduce** — Detailed steps to reproduce the issue
- **Impact** — What could an attacker accomplish with this vulnerability?
- **Affected Versions** — Which versions or components are affected
- **Possible Mitigations** — Any suggestions for fixing the issue (optional)

### Response Timeline

| Timeframe | Action |
|-----------|--------|
| **Within 48 hours** | Acknowledgment of your report |
| **Within 7 days** | Initial assessment and response |
| **Within 30 days** | Resolution or mitigation plan |

We will keep you informed of our progress throughout the process.

## Security Best Practices

### For Contributors

- Never commit API keys, passwords, or secrets to the repository
- Use environment variables for all sensitive configuration
- Follow the principle of least privilege in database queries
- Validate all user inputs
- Keep dependencies up to date

### For Users

- Keep your Supabase credentials secure
- Use strong passwords for your accounts
- Enable two-factor authentication where available
- Report any suspicious activity immediately

## Security Features

Questlog implements the following security measures:

- **Row Level Security (RLS)** — Database policies ensure users can only access their own data
- **PKCE Authentication Flow** — Secure OAuth implementation
- **Input Validation** — Zod schemas validate all user inputs
- **Parameterized Queries** — Supabase ORM prevents SQL injection
- **Environment Variable Isolation** — Secrets never exposed in client-side code

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest main branch | ✅ Yes |
| Previous releases | ⚠️ Best effort |

## Acknowledgments

We thank the security researchers and community members who help keep Questlog secure.

---

*Last updated: April 2026*

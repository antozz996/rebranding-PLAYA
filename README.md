# Playa Luna — Website and Fior d'Acqua VIP Club

Static multilingual website for the Playa Luna network, deployed on Vercel, with a Supabase-backed VIP Club and staff operations area.

## Main areas

- Playa Luna: beach, restaurant and events
- Damai Event Garden
- Culto
- Fior d'Acqua
- Italian and English pages
- VIP customer card, booking and referral flows
- Staff authentication, customer management, booking map and QR check-in
- Local visual editor for authorised development use

## Architecture

- `frontend/`: production HTML, JavaScript, CSS and optimised assets
- `supabase/`: database schema, RLS policies, tests and Edge Functions
- `editor/`: local-only FastAPI visual editor
- `execution/`: asset-processing utilities
- `docs/`: operational and technical handoff documents
- `vercel.json`: routes, cache policy and security headers

Vercel deploys from the repository root and rewrites public routes to `frontend/`.

## Local preview

A basic static preview can be started from the repository root:

```bash
python -m http.server 8080 --directory frontend
```

Open `http://localhost:8080`.

## Local visual editor

The editor must remain bound to localhost and must not be exposed publicly.

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r editor/backend/requirements.txt
python editor/backend/main.py
```

Open `http://127.0.0.1:8000`.

## Supabase

Apply the files in this order to a test project before production:

1. `supabase/schema.sql`
2. `supabase/policies.sql`
3. `supabase/storage-policies.sql`
4. `supabase/seed.sql` only in non-production environments
5. `supabase/tests.sql`

Never commit service-role keys, Resend keys or local `.env` files. The public Supabase anon key in the browser configuration is expected; access control is enforced by RLS and server-side RPC checks.

## Validation

Repository checks run automatically on pull requests through `.github/workflows/repository-audit.yml`.

Run them locally with:

```bash
python scripts/repository_audit.py
python editor/backend/test_endpoints.py
```

## Deployment checklist

- repository audit passes;
- SQL/RLS tests pass in the target Supabase project;
- VIP login, booking, QR email and staff check-in are tested end to end;
- privacy text and contact details are reviewed by the business owner;
- Resend and Supabase secrets are configured only in their hosting environments;
- mobile QA is completed on iOS and Android.

## Contact configuration

The generic public contact currently used by the site is `+39 347 718 3803`. Event-planner requests use `+39 366 397 2133`. Update all language variants together when business contacts change.

## Security

See `SECURITY.md`. Do not publish the local editor or database secrets.

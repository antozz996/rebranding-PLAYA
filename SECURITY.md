# Security Policy

## Reporting

Report suspected security or privacy issues privately to `info@playaluna.it`. Do not include customer photographs, phone numbers, session tokens or database exports in public issues.

## Supported deployment

Only the latest commit deployed from the protected default branch is supported.

## Security boundaries

- Vercel serves the static frontend only.
- Supabase RLS and RPC checks are the authoritative access controls.
- Service-role and Resend keys must exist only as environment secrets.
- The FastAPI visual editor is a local development tool and must remain on `127.0.0.1`.
- The `client-photos` bucket must remain private.
- Production data must never be added to `seed.sql`, tests, screenshots or repository assets.

## Release checks

Before deployment:

1. run the repository audit;
2. run Supabase SQL tests in a non-production project;
3. verify staff and client access with separate accounts;
4. test expired and invalid sessions;
5. verify security headers on the deployed domain;
6. review third-party services and privacy disclosures.

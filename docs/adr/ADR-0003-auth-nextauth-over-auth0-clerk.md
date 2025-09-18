# ADR-0003 – Auth: NextAuth over Auth0/Clerk/Supabase Auth

**Status:** Accepted

## Context
We need simple OAuth login for a personal project without monthly fees.

## Decision
Use **NextAuth** (GitHub/Google providers) for authentication.

## Options Considered
- **NextAuth (chosen):** Free, local-session control, integrates smoothly with Next.js.
- Auth0/Clerk: Great UX but paid tiers and vendor coupling.
- Supabase Auth: Part of a larger platform we aren’t using.

## Consequences
+ No recurring auth cost; straightforward integration.
− You manage some session details; that’s fine for our scope.

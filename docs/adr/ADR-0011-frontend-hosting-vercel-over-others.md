# ADR-0011 – Frontend Hosting: Vercel over Netlify/Cloudflare Pages

**Status:** Accepted

## Context
We need the best hosting for Next.js with minimal config and free/credit options.

## Decision
Host the **Next.js** app on **Vercel** (Hobby or trial).

## Options Considered
- **Vercel (chosen):** First-class Next.js support (builds, server functions, images, edge), excellent DX and previews.
- Netlify: Strong, but Next.js features are second-class compared to Vercel.
- Cloudflare Pages: Very fast edge, but different runtime constraints; more friction for our stack.

## Consequences
+ Fastest path to a polished Next.js deployment.
− Vendor-specific features; acceptable for a personal project.

# ADR-0010 – Frontend Framework: React over Vue/Angular

**Status:** Accepted

## Context
We need a fast, modern UI with strong hiring signal and ecosystem.

## Decision
Use **React** with **Next.js (App Router)**.

## Options Considered
- **React/Next.js (chosen):** Largest ecosystem, first-class Next.js features (server components, routing, image, caching), strong interviewer familiarity.
- Vue: Great DX, but smaller enterprise adoption in our target market.
- Angular: Powerful, more opinionated; heavier learning curve for our timeline.

## Consequences
+ Many libraries, examples, and integrations (NextAuth, OTel links, etc.).
− React ergonomics can be verbose; mitigated with shadcn/ui and small components.

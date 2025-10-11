# Web App

> The Search Hub frontend is a Next.js 15 (App Router) application. It acts as the **presentation layer** and a **BFF** (backend-for-frontend): UI components talk to server-side API routes that proxy requests through `@search-hub/sdk`, keeping browser traffic free of CORS and credentials handling.

---

## 1. Quickstart

```bash
pnpm install
pnpm --filter web dev         # http://localhost:3001 (Turbopack)

# optional scripts
pnpm --filter web build
pnpm --filter web start       # production server
pnpm --filter web lint
```

The app expects the API to be reachable at `http://localhost:3000` by default. Override by setting `API_URL` in `.env.local`.

```ini
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=change-me-please
API_URL=http://localhost:3000          # Express API base
```

> `NEXTAUTH_SECRET` can be generated with `openssl rand -base64 32`.

---

## 2. Directory Map

```
app/
├─ layout.tsx               # root layout + header/toast
├─ page.tsx                 # marketing / landing
├─ dashboard/page.tsx       # protected view (requires auth)
├─ auth/
│  ├─ sign-in/              # credentials form + provider buttons
│  └─ sign-up/              # registration flow
└─ api/
   └─ auth/…                # Next.js server actions (proxy to API)
components/
├─ app-header.tsx
├─ sign-out-button.tsx
└─ ui/…                     # shadcn primitives
lib/
└─ utils.ts                 # shared helpers
middleware.ts               # NextAuth-powered route protection
```

---

## 3. Auth Flow (Browser ↔ NextAuth ↔ API)

1. **Credential Sign-in**
   - `/auth/sign-in` renders `SignInForm` (client component). It calls `signIn('credentials')` with `redirect: false`.
   - NextAuth’s credentials provider (`app/api/auth/[...nextauth]/route.ts`) forwards the payload to `SearchHubClient.signIn`, which hits `POST /v1/auth/sign-in` on the API. The custom fetcher attaches `credentials: 'include'` so the browser carries the `connect.sid` cookie.
   - On success the user is issued a NextAuth JWT session and the Express session now stores `userId`.
2. **Sign-up**
   - `/auth/sign-up` posts to `app/api/auth/sign-up/route.ts`. The proxy validates against the shared `AuthPayload` Zod schema, forwards to `SearchHubClient.signUp`, and returns structured validation errors (400) or conflict responses (409) for inline feedback.
   - After account creation the client attempts automatic sign-in with the same credentials.
3. **Sign-out**
   - Clicking “Sign out” triggers a POST to `app/api/auth/sign-out/route.ts` which calls `SearchHubClient.signOut()` (destroying the Express session) and then `next-auth`’s `signOut({ callbackUrl: '/' })` to clear the NextAuth session.
4. **Route protection**
   - `middleware.ts` wraps `withAuth` to guard `/dashboard` and server API routes. Unauthenticated users are redirected to `/auth/sign-in`.
   - Server components (`AppHeader`, `dashboard/page.tsx`) use `getServerSession(authOptions)` to tailor UI based on session state.

This split keeps secrets (session cookies, API base URLs) server-side while React components remain focused on presentation.

---

## 4. Styling & UI

- **Tailwind CSS 4** powers utility classes. Global styles live in `app/globals.css`.
- Reusable UI primitives come from shadcn/ui, wrapped in `components/ui/*`. When you add new components run `pnpm dlx shadcn-ui@latest add <component>` and commit the generated files under `components/ui`.
- Icons are provided by `lucide-react`.

---

## 5. Working with Data

- **API access** should go through `app/api/*` routes, never directly from client components. This keeps credentials off the browser and allows request fan-out, caching, and error handling in one place.
- When adding a new backend endpoint, expose it via the `SearchHubClient` (update OpenAPI → regenerate SDK) and then consume it from a Next.js route handler.
- Prefer **Server Components** for data fetching pages (dashboard, search results) so you can call the SDK directly without extra API hops.

---

## 6. Testing & QA Tips

- Use `npm run lint` (pnpm equivalent above) to catch accessibility, hooks, and TypeScript issues.
- Storybook is not wired yet. When component complexity grows, plan to add `apps/web/.storybook` so UI pieces can be exercised in isolation.
- Manual auth smoke test:

```bash
# Sign up new user
curl -s -X POST http://localhost:3001/api/auth/sign-up \
  -H "content-type: application/json" \
  -d '{"email":"demo@example.com","password":"changeme123"}'

# Sign in (credentials come back as 200 with set-cookie in responses proxied from NextAuth)
curl -i -X POST http://localhost:3001/api/auth/callback/credentials \
  -H "content-type: application/x-www-form-urlencoded" \
  -d 'email=demo@example.com&password=changeme123'
```

---

## 7. Deployment Notes

- Deploy to Vercel or another Next.js-friendly platform.
- Set `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and `API_URL` in the hosting environment. The API must allow requests from the web origin (CORS is already configured to `origin: true`).
- If you enable OAuth providers (Google, etc.), re-enable the provider block in `[...nextauth]/route.ts` and ensure callback URLs include the deployed domain.

This README should be the quick reference for wiring new routes, debugging auth, or onboarding a teammate to the frontend stack.

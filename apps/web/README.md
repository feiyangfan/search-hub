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
├─ layout.tsx                    # root layout + Providers
├─ page.tsx                      # landing page
├─ default.tsx                   # parallel route fallback
├─ not-found.tsx                 # 404 page
├─ globals.css                   # Tailwind imports + custom CSS
├─ dashboard/                    # authenticated area
│  └─ page.tsx                   # dashboard landing
├─ doc/[id]/                     # document detail pages
│  ├─ layout.tsx                 # prefetch document data (SSR)
│  └─ page.tsx                   # document viewer
├─ auth/
│  ├─ sign-in/page.tsx           # sign-in form
│  └─ sign-up/page.tsx           # registration form
├─ @chrome/                      # parallel routes for chrome UI
└─ api/                          # Next.js API routes (BFF pattern)
   ├─ auth/                      # auth proxies to Express API
   ├─ documents/                 # document CRUD proxies
   ├─ search/                    # search proxies
   ├─ tags/                      # tag management proxies
   ├─ tenants/                   # tenant management proxies
   ├─ reminders/                 # reminder proxies
   └─ health/                    # health check proxy
components/
├─ search-bar.tsx                # global search component
├─ dashboard/                    # dashboard-specific components
├─ document/                     # document list/card components
├─ document-editor/              # dual-mode editor (Milkdown/CodeMirror)
│  ├─ editor.tsx                 # main editor component
│  ├─ command-dropdown.tsx       # AI command palette
│  └─ reminder-plugin/           # custom Milkdown plugin
├─ document-explorer/            # document graph visualization
├─ layout/                       # layout components
│  ├─ app-header.tsx             # main header with context
│  ├─ sidebar.tsx                # navigation sidebar
│  └─ footer.tsx
├─ navigation/                   # navigation components
├─ tags/                         # tag management UI
│  ├─ tag-chip.tsx               # tag display component
│  ├─ tag-selector.tsx           # tag picker
│  └─ tag-manager.tsx            # tag CRUD dialog
├─ workspace/                    # workspace/tenant UI
└─ ui/                           # shadcn/ui primitives
   ├─ button.tsx
   ├─ input.tsx
   ├─ dialog.tsx
   └─ ...                        # other shadcn components
hooks/
├─ useDocument.ts                # React Query hook for documents
├─ useDocumentsList.ts           # React Query hook for document list
├─ useTags.ts                    # React Query hook for tags
└─ useAuth.ts                    # auth state hook
lib/
├─ utils.ts                      # utility functions
└─ api-client.ts                 # SearchHubClient initialization
queries/
├─ documents.ts                  # document query functions
├─ tags.ts                       # tag query functions
└─ search.ts                     # search query functions
types/
└─ ...                           # shared TypeScript types
middleware.ts                    # NextAuth route protection
next.config.ts                   # Next.js configuration
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

---

## 8. Document Editor Architecture

The document editor is a sophisticated dual-mode editor supporting both WYSIWYG and Markdown editing:

### Editor Modes

1. **WYSIWYG Mode (Milkdown)**
   - Rich text editing with visual formatting
   - CommonMark + GFM (GitHub Flavored Markdown) support
   - Custom reminder plugin for natural language date parsing
   - Block-level editing with drag-and-drop support
   - Real-time Markdown sync

2. **Markdown Mode (CodeMirror 6)**
   - Raw Markdown editing with syntax highlighting
   - Auto-height adjustment (min 560px)
   - GitHub Light theme
   - Keyboard-friendly with Vim support (optional)
   - Instant preview toggle

### Key Features

#### Reminder System
- Natural language parsing via `chrono-node`
- Examples: "tomorrow at 3pm", "next friday", "in 2 weeks"
- Visual indicators for scheduled/overdue reminders
- Status tracking: scheduled, overdue, done

#### Command Palette
- `/` trigger for AI commands
- Inline command execution
- Command history tracking in `DocumentCommand` table
- Context-aware suggestions

#### State Synchronization
- Bidirectional sync between WYSIWYG ↔ Markdown
- Debounced save to prevent excessive API calls
- Optimistic updates for instant feedback
- Conflict resolution for concurrent edits

### Component Structure

```typescript
<DocumentEditor
    initialMarkdown={content}
    onMarkdownChange={handleSave}
    onViewModeChange={handleModeSwitch}
    onRemindersChange={handleReminders}
    configureEditor={async (editor) => {
        // Custom editor configuration
    }}
/>
```

### Integration with Backend

- Auto-saves trigger `PATCH /v1/documents/:id` via SDK
- Content changes queue re-indexing jobs
- Reminders stored as JSON in `DocumentCommand` table
- Version history via `updatedAt` timestamps

---

## 9. Data Flow Strategy (SSR + React Query)

When a user lands on `/doc/:id`, we lean on a two-layer data approach:

1. **Server Layout Prefetch**
   - `app/doc/[id]/layout.tsx` runs on the server with access to session cookies.
   - Instantiate `SearchHubClient`, fetch the current document, tags, and any sidebar lists directly (no extra API hop).
   - Create a `QueryClient`, `prefetchQuery` the needed keys, then `dehydrate` and pass that state into `<AppProviders dehydratedState={...}>`.

2. **Client Hooks with TanStack Query**
   - Components call hooks like `useDocument(id)` / `useDocumentsList()` that internally use `useQuery`.
   - Because the layout already prefetched the query keys, the hooks hydrate instantly on the client; React Query handles background revalidation.

3. **Mutations + Invalidations**
   - `useDocumentActions` uses `useMutation` to rename, delete, favorite, or edit tags via Next.js API routes.
   - On success we `invalidateQueries` for the affected keys (`['document', id]`, `['documents']`, etc.), so the editor, sidebar, and header context stay in sync—no custom window events needed.

This pattern keeps secure data fetching on the server (leveraging SSR for first paint) while the hydrated React Query cache handles client updates and cache invalidation in a modern, interview-ready architecture.

### Putting it together (mini example)

```
app/doc/[id]/layout.tsx  (Server Component)
├─ create QueryClient
├─ await queryClient.prefetchQuery(['document', id], fetchDocumentViaSDK)
├─ await queryClient.prefetchQuery(['documents', { favoritesOnly: true }], fetchFavoritesViaSDK)
├─ return (
│    <HydrationBoundary state={dehydrate(queryClient)}>
│      <DocumentHeaderProvider>{children}</DocumentHeaderProvider>
│    </HydrationBoundary>
│  )

app/doc/[id]/page.tsx (Client Component)
└─ const { data } = useQuery(['document', id], () =>
       fetch(`/api/documents/${id}`, { credentials: 'include' }).then(res => res.json())
   )

api/documents/[id]/route.ts (Next API Route)
└─ Uses SearchHubClient server-side to call the upstream API and returns JSON to the browser.
```

> Layouts focus on prefetching via the SDK (server-to-server), API routes expose browser-friendly endpoints, hooks provide ergonomic `useQuery` wrappers, and React Query ties everything together with cache hydration + invalidation.

---

## 9. Tag Page Extensibility & Roadmap

The **Tag Sidebar / Tag Manager** is intentionally scoped to a small feature set today so we can ship iteratively while keeping hooks and UI primitives reusable. The current focus is on two high-value actions:

- **Edit tag:** opens a dialog to rename a tag and adjust its color/metadata via the same `SearchHubClient` mutations used in document editors.
- **Delete tag:** permanently removes a tag (with confirmation), automatically refetching affected queries so counts stay accurate.

### Extensibility Principles

- **Composable triggers:** Tag actions are exposed through a lightweight `TagActionsMenu` so we can add buttons, dropdown items, or context menus without rewriting state logic.
- **Dialog-driven workflows:** Forms (edit, merge, bulk apply) live in dedicated dialog components and receive tag data via props, keeping sidebar buttons stateless.
- **Query-driven state:** All tag mutations go through React Query hooks (`useWorkspaceTagsQuery`, future `useTagMutations`) so every UI that displays tags rehydrates automatically.
- **Permission-aware UI:** Hooks surface capability flags (e.g., `canDeleteTag`) allowing the same components to power read-only, admin, or shared workspaces.

### Future Features

1. **Bulk operations:** select multiple tags to delete, merge, or re-color in one dialog.
2. **Merge / duplicate tags:** consolidate similar labels or spin up a copy as a starting point.
3. **Pinning & ordering:** let users favorite tags so they float to the top or appear in quick filters.
4. **Tag insights:** show usage stats (document count trend, last applied) with drill-down links.
5. **Access controls:** restrict who can edit/delete workspace tags, or mark tags as private/public.

Documenting the roadmap here keeps the team aligned on where to plug in new tag capabilities without reworking the sidebar foundation.


change document list to be a complete graph
# Part 2: How I’d Build the Dashboard (Human-Friendly Version)

This doc describes how I’d approach building a modern admin dashboard for a funnels + checkout product (funnels, orders, customers, subscriptions, analytics, disputes, settings, permissions). The goal: keep it fast, easy for multiple engineers to work on, avoid big rewrites, and meet WCAG standards.

---

## 1. How We’d Structure the App (Architecture)

**The big idea:** Organize by feature, not by file type. Each area of the product (funnels, orders, customers, etc.) owns its own slice of the app.

**Folder structure:**

```
src/
  app/           ← Shell: layout, router, auth
  features/
    funnels/     ← Everything for funnels: routes, components, hooks
    orders/
    customers/
    analytics/
    disputes/
    settings/
  shared/        ← Stuff everyone uses: design system, API client, utils
  routes.tsx     ← One place that defines all routes (lazy-loaded)
```

**Why this helps:**

- **Feature modules** own their routes and data. Features don’t reach into each other’s internals—they use shared code or public APIs. That keeps boundaries clear and avoids spaghetti.
- **Each page is lazy-loaded.** The first load stays small, and teams can ship “funnels” or “orders” without stepping on each other.
- **Domain boundaries** stay obvious: “funnel” vs “order” vs “customer” so we don’t duplicate logic or mix concerns.

**Routing:** One config (e.g. React Router). Layout (sidebar, header) lives in `app/`. Feature routes sit under `/funnels`, `/orders`, and so on.

---

## 2. How We’d Keep the UI Consistent (Design System)

**Build vs buy:** I’d start with a **headless or lightweight component library** (e.g. Radix UI, Ark UI) and style it ourselves with design tokens. That gives us good accessibility and behaviour without locking into a heavy framework. We can add more later if the team wants.

**Keeping things consistent:**

- **Design tokens:** One place for colours, spacing, typography, border radius (e.g. CSS variables or a token file). Tailwind (or similar) uses those so we have a single source of truth.
- **Theming:** Tokens support light/dark and future themes. Components rely on tokens, not random hard-coded values.
- **Typography and spacing:** A shared scale (e.g. 4px base) and type scale so everything feels consistent.
- **Accessibility:** WCAG 2.1 AA as the baseline. Contrast and focus come from tokens; interactive bits use the headless primitives (keyboard, ARIA). We document a11y in Storybook and in PR guidelines.

**Documentation:** Storybook for all shared components—variants, states, and a11y notes. Design and engineering share the same component catalog.

---

## 3. How We’d Handle Data (Data Fetching + State)

**Server data:** **TanStack Query (React Query)** for everything that comes from the server. It gives us caching, deduplication, background refetch, and built-in loading/error/empty handling. Each feature uses its own query keys (e.g. `['funnels']`, `['orders', filters]`) so cache invalidation is predictable.

**Client state:**

- **URL for “view” state:** When something affects what the user sees (filters, sort, pagination, tab), put it in the URL. Links are shareable, back/forward works, and we don’t hand-sync URL and local state.
- **React state or Zustand** for local UI only (modals, sidebar open, form drafts) that doesn’t need to be shareable.

**Loading, errors, and empty states:**

- TanStack Query’s `isLoading`, `isError`, `isFetching` drive skeletons, error boundaries, and empty states.
- We reuse the same patterns everywhere: skeleton for tables/lists, inline error with retry, empty state with a clear CTA. Implementation lives in shared components.

**Tables (filters, sort, pagination):**

- Encode filters/sort/pagination in the URL (e.g. `?page=2&status=active&sort=createdAt`).
- Query keys include those params so the cache is per “view”.
- Use server-side pagination (and sort/filter) from day one for large lists—we don’t load everything and filter on the client.

**Validation:** **Zod** (or similar) for runtime validation of API responses and forms. Shared schemas per feature so types and validation stay in sync.

---

## 4. How We’d Keep It Fast (Performance)

**Bundle size:**

- **Route-based code splitting:** Lazy load each page. Heavy stuff (charts, rich editors) only loads where it’s used.
- **Bundle checks:** Use something like `vite-bundle-visualizer` regularly so we notice bloat early.

**Long lists and tables:**

- **Virtualization** (e.g. TanStack Virtual or react-window) for long lists and big tables.
- Combine pagination and virtualization when we have thousands of rows.

**Rendering:**

- Memoize expensive list/table items where profiling shows it’s worth it.
- Keep component trees reasonable—split by route and feature instead of one giant page.
- Use React DevTools Profiler to make sure filters/sorts aren’t causing unnecessary rerenders.

**Measuring “dashboard feels slow”:**

- **Web Vitals** (LCP, FID/INP, CLS) plus custom marks like “time to first table row” or “time to interactive table” on key pages.
- **RUM** (e.g. Vercel Analytics or a dedicated tool) to see p75/p95 by route and device.
- Optionally use feature flags to A/B test heavy changes and compare metrics before full rollout.

---

## 5. How We’d Scale to a Team (DX & Conventions)

**Onboarding:**

- README with setup, scripts, and env vars.
- An architecture doc (like this) plus a short “how we add a new feature” guide.
- Storybook as the single place to see and use shared UI.
- One or two reference features (e.g. funnels list + detail) that new engineers can copy.

**Conventions:**

- **ESLint + Prettier** in CI; pre-commit hook (e.g. lint-staged) so main stays clean.
- **PR template:** Checklist for tests, a11y, and “no one-off styles”; link to Storybook when UI changes.
- **Component guidelines:** New UI uses shared components or design tokens; one-off styles need a short justification in the PR.
- **Naming:** Feature folders and route names match the product (funnels, orders, etc.) so everyone knows where code lives.

**Keeping UI from drifting:**

- Design or design-system review for bigger UI work.
- Storybook required for new or changed shared components.
- In PR review, ask: “Could this use a shared component or token?”

---

## 6. How We’d Test (Testing Strategy)

**Unit tests:**

- Pure logic: validation (Zod schemas), formatters, reducers, small hooks.
- Critical calculations (e.g. pricing, totals) if we have them.
- We don’t unit test every component—we focus on behaviour and logic that’s painful to catch in E2E.

**Integration tests:**

- Feature-level: e.g. “load funnels list and show first row”, “apply filter and see updated list” with Testing Library and mocked API (MSW).
- Covers data flow and main paths without spinning up the full app.
- Run in CI on every PR.

**E2E:**

- **Playwright** (or Cypress) for a small set of critical flows: login, open a funnel, create/edit an order, view analytics.
- Run on a schedule or on release; optionally on main after merge.
- Keep the E2E suite small and stable so it stays fast and reliable.

**Minimum to move fast:**

- Lint + typecheck + unit tests for shared utils and validation in CI.
- At least one integration flow per major feature (e.g. “list + filter” for funnels and orders).
- E2E for 3–5 critical user journeys.
- Add tests when we hit regressions or touch risky areas (payments, permissions).

---

## 7. How We’d Ship Safely (Release & Quality)

**Feature flags:**

- Use a simple feature-flag service (e.g. LaunchDarkly, PostHog, or in-house) for big or risky changes.
- New sections or reworked flows can ship behind a flag, then turn on for internal → beta → everyone.

**Rollouts:**

- Deploy to staging first; run smoke tests or a short checklist.
- Production with canary or percentage rollout if the platform supports it.
- Roll back on error rate or key metric degradation (alerts + runbooks).

**Error monitoring:**

- **Sentry** (or similar) for front-end errors: unhandled rejections, React error boundary.
- Tag by feature/route so we can see what’s breaking.
- Alerts on error spikes or new error types.

**Ship fast but safe:**

- Small, frequent PRs; main is always deployable.
- Feature flags for large changes.
- Good coverage on “money paths” (funnels, orders, permissions).
- Clear ownership: each feature area has an owner who reviews and can revert if needed.

---

## Quick Reference

| Area          | Approach in short                                                                |
| ------------- | -------------------------------------------------------------------------------- |
| Architecture  | Feature folders, route-level code split, clear domain boundaries                 |
| Design system | Headless components + tokens, Storybook, WCAG in tokens and docs                 |
| Data          | TanStack Query for server state; URL for view state; Zod for validation          |
| Performance   | Code splitting, virtualization, Web Vitals + RUM, optional feature-flag A/B      |
| DX / team     | Conventions, PR template, Storybook, “how to add a feature” doc                  |
| Testing       | Unit for logic/validation; integration per feature; small E2E for critical paths |
| Release       | Feature flags, staged rollout, Sentry, small PRs, clear ownership                |

**What I’d do first:** Invest early in route splitting, TanStack Query, and URL-driven filters so the dashboard stays fast and maintainable as we grow. I’d skip building a custom design system from scratch (use headless + tokens) and defer heavy E2E until we have stable critical paths.

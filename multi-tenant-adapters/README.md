# multi-tenant-adapters

Build-time multi-tenancy for frontend apps. One codebase, many tenant builds, **zero runtime branching**. Distilled from a production broker-platform monorepo serving 20+ tenants from a single React codebase.

Two sample tenants included: **acme** and **globex**.

---

## TL;DR

- App code imports from a stable facade path: `~/services/adapterServices/Header`.
- That facade contains `import Header from '__TENANT_ADAPTERS__/Header'`.
- A webpack/babel string-replace rewrites `__TENANT_ADAPTERS__` → `~/adapters/<tenant>` at build time.
- Each tenant's folder under `src/adapters/<tenant>/` exports the same shape (Header, Footer, constants, featureFlags…).
- `BROKER=acme webpack` produces an Acme bundle. `BROKER=globex webpack` produces a Globex bundle. Same source.

No runtime tenant detection. No `if (tenant === 'acme')`. No bundled-but-dead tenant code.

---

## Why this approach (vs. alternatives)

| Approach | Bundle size | Branching | Type safety | Verdict |
| --- | --- | --- | --- | --- |
| `if (tenant === 'x')` everywhere | All tenants in every bundle | Everywhere | Hard | Doesn't scale past 2 tenants |
| Runtime config object | All tenants | Centralized | OK for data, painful for components | Fine for small text/flag overrides; breaks down for big component differences |
| Dynamic `import()` per tenant | Lazy chunks shipped | At dynamic-import sites | OK | Works, but every tenant's code still ships to the CDN |
| **Build-time token rewrite (this repo)** | **Only the active tenant's code** | **None at runtime** | **Enforced via contract type** | **Scales to 20+ tenants, smallest bundle, simplest call sites** |

The win compounds: the 21st tenant doesn't make tenant #1's bundle larger or slower. Tenant code is fully isolated; a bug in one can't crash another.

---

## Architecture overview

```
                ┌────────────────────────────────────┐
                │        App / page code             │
                │  imports from a STABLE facade path │
                │   ~/services/adapterServices/X     │
                └─────────────────┬──────────────────┘
                                  │
                ┌─────────────────▼──────────────────┐
                │   Adapter service facade           │
                │  one-line files like:              │
                │     import X from                  │
                │     '__TENANT_ADAPTERS__/X';       │
                │     export default X;              │
                └─────────────────┬──────────────────┘
                                  │ (build time)
                                  │ string-replace-loader (webpack)
                                  │ search-and-replace plugin (babel/jest)
                                  ▼
                ┌────────────────────────────────────┐
                │   ~/adapters/<tenant>/X            │
                │   tenant-specific implementation   │
                │   reuses ~/components/Shell        │
                └────────────────────────────────────┘
```

Three layers. Each has one responsibility:

1. **`~/components/`** — *shared* primitives (HeaderShell, FooterShell). Layout, behavior, a11y. **No brand**.
2. **`~/adapters/<tenant>/`** — tenant implementations. Brand, copy, links, flags. **No layout primitives**.
3. **`~/services/adapterServices/`** — facade indirection. Where the token lives. **No logic**.

Why three layers and not two: a tenant might need to override layout for one specific component (Globex hides Discover; Acme has it). Adapter implementations CAN do that, but most reuse the shell. Without a shell, every tenant duplicates layout. Without a facade, every page imports `~/adapters/...` directly and you've reintroduced runtime branching.

---

## File layout

```
multi-tenant-adapters/
├── README.md
├── package.json
├── tsconfig.json
├── webpack.common.js                ← string-replace-loader rule
├── babel.config.js                  ← jest equivalent of the rule
└── src/
    ├── index.ts
    ├── components/                  ← shared, brand-agnostic
    │   ├── HeaderShell.tsx
    │   └── FooterShell.tsx
    ├── adapters/
    │   ├── contracts.ts             ← TenantAdapter type — the contract
    │   ├── acme/
    │   │   ├── index.ts             ← typed manifest
    │   │   ├── Header/Header.tsx
    │   │   ├── Footer/Footer.tsx
    │   │   ├── constants/index.ts
    │   │   └── featureFlags/index.ts
    │   └── globex/
    │       ├── index.ts
    │       ├── Header/Header.tsx
    │       ├── Footer/Footer.tsx
    │       ├── constants/index.ts
    │       └── featureFlags/index.ts
    ├── services/adapterServices/    ← facades — token lives here
    │   ├── Header.ts
    │   ├── Footer.ts
    │   ├── constants.ts
    │   └── featureFlags.ts
    └── pages/Layout.tsx             ← consumer — no tenant awareness
```

---

## How `__TENANT_ADAPTERS__` actually works

### The token in the facade

[src/services/adapterServices/Header.ts](src/services/adapterServices/Header.ts):

```ts
// @ts-expect-error - token resolved at build time
import Header from '__TENANT_ADAPTERS__/Header';
export default Header;
```

That import path is intentionally invalid. The TS compiler complains; we suppress with one expected-error directive (which is itself a useful safety net — if the rewrite ever stops happening, the build fails loudly instead of producing a broken bundle).

### Webpack rewrite

[webpack.common.js](webpack.common.js):

```js
{
  test: /\.(t|j)sx?$/,
  include: [path.resolve(__dirname, 'src/services/adapterServices')],
  loader: 'string-replace-loader',
  options: {
    search: '__TENANT_ADAPTERS__',
    replace: `~/adapters/${tenant}`,
    flags: 'g',
  },
}
```

After this loader, the import string is `~/adapters/acme/Header` (or `globex`). The `~` alias resolves through webpack's `resolve.alias` to `src/`. Compilation continues normally — no runtime cost, no extra chunk, nothing.

### Why scope the loader to one folder

`include: [src/services/adapterServices]` is critical. Without it the rewrite runs over the whole codebase and:

- `__TENANT_ADAPTERS__` in a comment, doc string, or test fixture gets rewritten silently.
- Build time goes up because every file passes through string-replace.
- An accidental match in a third-party module is impossible to debug.

Keep the rewrite narrow. The token should appear in exactly one folder.

### Babel does the same thing for tests

Jest can't run webpack loaders. [babel.config.js](babel.config.js) uses `babel-plugin-search-and-replace` to apply the identical rewrite during test runs. **Drift between webpack and babel rules is the #1 source of "tests pass, build is broken" bugs** — keep them in sync.

### Run a tenant build

```bash
BROKER=acme   webpack --config webpack.common.js
BROKER=globex webpack --config webpack.common.js

BROKER=acme   jest      # tests against acme adapters
BROKER=globex jest      # tests against globex adapters
```

Same source tree, two completely different bundles. The Globex bundle does not contain Acme code, and vice versa.

---

## How the two sample tenants differ (to show what adapters can do)

| Surface | Acme | Globex |
| --- | --- | --- |
| Brand name | Acme Invest | Globex |
| Logo | image | wordmark text |
| Primary color | `#0B5FFF` | `#10B981` |
| Header links | Discover, Portfolio, Orders | My Holdings, Orders *(no Discover for compliance reasons)* |
| Header CTAs | Profile button (logged-in shape) | Sign in + Open account (logged-out shape) |
| Footer disclosures | Adviser disclosure shown | Hidden — Globex isn't an adviser |
| `enableAutoSip` | true | false |
| `enableLandingPageV2` | true | false |
| Order REJECTED copy | "Order couldn't go through. Please try again." | "We could not place this order. Contact support if needed." |

Compare [adapters/acme/Header/Header.tsx](src/adapters/acme/Header/Header.tsx) and [adapters/globex/Header/Header.tsx](src/adapters/globex/Header/Header.tsx) — they're independent files, both reusing [HeaderShell](src/components/HeaderShell.tsx). Identical structure, different brand surface.

---

## The TenantAdapter contract — keeping tenants honest

[src/adapters/contracts.ts](src/adapters/contracts.ts) declares the shape every tenant must export. Each tenant's `index.ts` is a typed manifest:

```ts
import type { TenantAdapter } from '../contracts';
const adapter: TenantAdapter = { Header, Footer, constants, featureFlags };
export default adapter;
```

What this gives you:

- **Onboarding a new tenant is a checklist.** Drop a folder, run `tsc`, fix what's red. No tribal knowledge required.
- **Adding a new contract surface fails every tenant build until they implement it.** This is the lever — the team can ship a new shared feature once and every tenant build is forced to opt in (with their own copy/color/flag).
- **Removing a deprecated surface is symmetric** — drop it from the contract, every tenant immediately gets a TS error pointing at dead code.

The manifest itself is never imported by application code. It exists purely for the type check.

---

## Adapter service patterns from the source codebase

Real production facades are just one-liners. The point is uniformity — every adapter service file is the same shape, no clever logic creeps in:

```ts
// src/services/adapterServices/Header.ts
import Header from '__TENANT_ADAPTERS__/Header';
export default Header;

// src/services/adapterServices/featureFlags.ts
import { featureFlags } from '__TENANT_ADAPTERS__/featureFlags';
export default featureFlags;

// src/services/adapterServices/constants.ts
import * as brokerConstants from '__TENANT_ADAPTERS__/constants';
export default brokerConstants;
```

Common adapter surfaces in a real broker platform: `Header`, `Footer`, `Login`, `LoginButton`, `SignupButton`, `Landing`, `Disclaimer`, `Disclosures`, `IFrameModal`, `HoldingsAuth`, `UserMeta`, `featureFlags`, `brokerConstants`, `brokerLogo`, `brokerLogout`, `brokerParams`, `loginRedirection`, `orderModalTextMap`, `confirmationWidgetTextMap`, `supportedPaymentMethodsText`, `getDealerOrderRowArray`. Pattern repeats — every tenant-variable surface gets one facade file and matching folder under each tenant.

---

## Important points to remember while implementing

### 1. The token must be a literal string

`'__TENANT_ADAPTERS__'` works. `` `__TENANT_${'ADAPTERS'}__` `` doesn't — string-replace-loader operates on raw source. Don't try to compute the token name dynamically.

### 2. The `~` alias must resolve in webpack, jest, and tsconfig

Three places, kept in sync:

- webpack `resolve.alias`
- jest `moduleNameMapper`
- tsconfig `paths`

Drift here breaks one tool while the others keep working — the worst class of bug.

### 3. Don't put logic in adapter service files

A facade is one import + one export. The moment you add `if (env === 'prod')` or `useMemo` you've moved branching back into shared code. If you need conditional logic, put it inside the tenant adapter (where it lives within one tenant's folder) or in a shared component (where it applies to everyone).

### 4. Static flags here, dynamic flags elsewhere

`featureFlags` returned from a tenant adapter is a **build-time** decision. It's fine for "Globex hasn't rolled out auto-SIP." It's wrong for "20% rollout of new payment flow" — that's a runtime flag service (LaunchDarkly, GrowthBook, etc.). Don't conflate the two; they have different lifetimes and different operational concerns.

### 5. Shared components must accept everything via props

If [HeaderShell](src/components/HeaderShell.tsx) imports from `~/services/adapterServices/...`, you've created a cycle: adapter → shared → adapter. Shared components take `ReactNode` slots and constants via props. They never reach for tenant data themselves.

### 6. Tenant folders should NOT cross-import each other

`adapters/acme/Header.tsx` must never `import 'adapters/globex/...'`. Even if "just for a constant." The day Globex's adapter changes, you'll have a stale Acme. Each tenant folder is a sealed unit.

### 7. Tenant-specific routes go through the same facade

If only Acme has a `/legal/adviser` page, expose it via `~/adapters/<tenant>/routes` and have a single facade list at `~/services/adapterServices/routes`. Globex returns an empty array, Acme returns the route. The router itself stays generic.

### 8. CI must build every tenant on every PR

A PR that compiles cleanly under `BROKER=acme` can break `BROKER=globex` if it adds a new contract surface that Globex didn't implement. Run a matrix build (`acme`, `globex`, …) in CI. The build-time approach trades runtime flexibility for compile-time strictness — lean into the strictness.

### 9. Use the `@ts-expect-error` line in the facade — don't suppress globally

That one comment in each facade file is useful: if the build-time rewrite ever fails to run (misconfigured loader, wrong include path), the compile error surfaces immediately. A global suppression would hide it.

### 10. Don't co-locate test fixtures with the token

`describe('__TENANT_ADAPTERS__')` in a test file gets rewritten if you forget the `include` scope on the loader. Keep the token search restricted, and avoid mentioning the literal string outside facades and docs.

### 11. Storybook and dev server need the env too

`BROKER=acme storybook dev` — the rewrite happens at compile time, so devtools that bypass webpack (rare) won't see it. Stick to the configured webpack-based dev server.

### 12. Adding a new tenant is a 4-step ritual

1. Create `src/adapters/<new>/` mirroring an existing tenant's tree.
2. Create `src/adapters/<new>/index.ts` exporting the typed manifest — TS will scream until everything is implemented.
3. Add `<new>` to the CI matrix.
4. Run `BROKER=<new> tsc --noEmit && BROKER=<new> webpack` locally before opening the PR.

No other file in the repo should change. If onboarding a tenant requires touching shared code, the contract is wrong — fix the contract, not the tenant.

### 13. Removing a tenant is `rm -rf`

Drop the folder, drop it from CI. No hunting for `if (tenant === 'x')` calls across the codebase, because there are none.

---

## When **not** to use this

- **You have one customer.** All this machinery is overhead for a single brand. Use environment variables and a config file.
- **You truly need multi-tenancy at runtime** (one bundle serving multiple tenants, e.g. on the same domain). Then go runtime config or dynamic imports — this approach assumes one bundle = one tenant.
- **Tenants are nearly identical.** If 90% of "tenant difference" is a logo and a primary color, that's a CSS-variable + JSON-config job, not an adapter folder per tenant.

---

## Pairing notes

Pairs naturally with the [http-handler](../http-handler/) boilerplate — different tenants often have different API base URLs / auth schemes; expose them through a `tenantHttpConfig` adapter surface and pass into `configureHttpHandler` at bootstrap.

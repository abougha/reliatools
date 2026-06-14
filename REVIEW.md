# Reliatools Pre-Deployment Review

**Reviewed:** 2026-06-14  
**Branch:** main  
**Build result:** ✅ Passes cleanly (zero errors, zero TypeScript errors)  
**Test result:** ✅ 6/6 unit tests pass (arrhenius, coffin-manson, electromigration, rbd, samplesize)

---

## 🔴 Blockers

### B1 — Cloudflare deployment: `.vercel/output/static` never generated
**File:** `wrangler.toml`, `package.json`  
**Why it matters:** `wrangler.toml` sets `pages_build_output_dir = ".vercel/output/static"`. This directory is only created by `@cloudflare/next-on-pages` (or `vercel build`). Running `npm run build` produces `.next/` output only. Any deployment via `wrangler pages deploy` will push an empty directory — the site will not be reachable. Even Cloudflare Pages Git Integration requires the build command to be `npx @cloudflare/next-on-pages@1`, not `npm run build`.

**Current state:** `@cloudflare/next-on-pages` is NOT in `package.json`. No build script calls it. `ls .vercel/output/static` returns empty after `npm run build`.

**Recommended fix:**
```
npm install --save-dev @cloudflare/next-on-pages
```
Add a deploy script to `package.json`:
```json
"build:cf": "next build && npx @cloudflare/next-on-pages"
```
Configure Cloudflare Pages dashboard build command to `npm run build:cf`.  
Note: Dynamic routes (`/app/projects/[projectId]`, `/app/projects/[projectId]/[step]`, `/resources/[slug]`, `/api/derating-rules`) require `nodejs_compat` Workers — this is already set in `wrangler.toml`. They will not function at all without the adapter.

---

### B2 — P-Diagram tool defaults to "ECU Connector"
**File:** `app/tools/p-diagram/page.tsx:21,35,37,66`  
**Why it matters:** The requirement explicitly prohibits connector-related demo examples. The P-Diagram tool uses `"ECU Connector"` as its only preset, default initial state, and reset target. Every user who opens the P-Diagram tool sees a connector example.

**Exact lines:**
```typescript
// line 21
"ECU Connector": { title: "ECU Connector – P Diagram", ... }
// line 35
const [presetKey, setPresetKey] = useState<string>('ECU Connector');
// line 37
const [data, setData] = useState<PDState>(PRESETS['ECU Connector']);
// line 66
const resetAll = () => setData(PRESETS['ECU Connector']);
```

**Recommended fix:** Replace the "ECU Connector" preset with a generic cross-industry example such as "Industrial Motor Controller" or "HVAC Control Module" to match the /app workspace demo data. Update `resetAll` accordingly.

---

### B3 — Test Plan Generator knowledge base: connector products and USCAR-2 standards
**File:** `lib/testPlanWizard/knowledgeBase.ts:196-197, 301-319, 776, 803, 814`  
**Why it matters:** The Test Plan Generator surfaces these products to users as selectable options. Two named products violate the no-connector policy: `"Low-voltage Connector"` (id: `connector-lv`) and (less directly) the connector-tagged material/test entries. USCAR-2 is a connector-specific standard that also appears as a test reference.

**Affected entries:**
- `id: "connector-lv"` — product named "Low-voltage Connector" with `domainTags: ["connector", ...]`
- Material entries tagged `["plating", "connector"]` (lines 301, 309, 317)
- Tests with `applicableProductTags: ["connector", ...]` (lines 492, 501, 510, 519, 528, 546)
- `references: [{ standard: "USCAR-2", note: "Connector durability/retention..." }]` (lines 803, 814)

**Recommended fix:** Replace `connector-lv` with a generic product such as "Industrial Sensor Assembly". Replace USCAR-2 references with general endurance/mechanical standards (IEC, MIL-STD). Remove or re-tag materials/tests whose only `applicableProductTags` entry is `"connector"`.

---

## 🟡 Should-Fix

### S1 — `demoProjectCards` all share `id: "demo-project"` — clicking any card opens same project
**File:** `lib/appWorkspace/projectStore.ts:55-78`  
**Why it matters:** Eight named demo project cards (Industrial Motor Controller, Medical Wearable, Data Center PSU, etc.) are shown on the Projects page and Dashboard. All eight have `id: "demo-project"`. Clicking "Open Project" on any of them navigates to `/app/projects/demo-project/overview` and displays only the Industrial Motor Controller. The other project names shown on the cards are misleading.

```typescript
export const demoProjectCards: StoredProject[] = demoProjects.map((project) => ({
  id: "demo-project",   // ← hardcoded for ALL 8 projects
  name: project.name,
  ...
}));
```

**Recommended fix:** Either assign each demo project a unique stable ID (e.g., `project.slug + "-" + index`) and add corresponding entries in `getProjectFromStorage`, OR mark all demo cards with a `viewOnly: true` flag and show a "Demo only — create your own project" state when clicked. The simplest fix is unique IDs with each returning a tailored `StoredProject` object.

---

### S2 — `resources/[slug]/page.tsx` uses sync `params` (not `Promise<>`)
**File:** `app/resources/[slug]/page.tsx:28-36, 42-50`  
**Why it matters:** In Next.js 15+, `params` in App Router pages is a `Promise`. Both `generateMetadata` and `ResourceDetailPage` in this file use `params: { slug: string }` (not `Promise<{ slug: string }>`), while the project-level routes correctly use `Promise<>`. The build passes because Next.js 16 accepts both patterns, but this is explicitly deprecated and will become a hard error in a future release.

Compare to the correct pattern used in:
- `app/app/projects/[projectId]/layout.tsx:8` — `params: Promise<{ projectId: string }>`
- `app/app/projects/[projectId]/[step]/page.tsx:5` — `params: Promise<{ projectId: string; step: string }>`

**Recommended fix:** Update both functions in `[slug]/page.tsx` to accept `params: Promise<{ slug: string }>` and `await params` at the top of each function, matching the pattern in `layout.tsx`.

---

### S3 — Mobile sidebar in `/app` shell has no open/close logic
**File:** `components/appWorkspace/AppShell.tsx:94-100`  
**Why it matters:** The AppShell renders a hamburger button for mobile that has `aria-label="Open navigation"` but no `onClick` handler. The sidebar is `hidden ... lg:flex`. On screens narrower than 1024px, the navigation is completely inaccessible; users can't reach Dashboard, Projects, AI Advisor, Settings, etc.

```typescript
// line 94-100
<button
  type="button"
  className="inline-flex h-10 w-10 ... lg:hidden"
  aria-label="Open navigation"
  title="Open navigation"
>
  <Menu className="h-4 w-4" aria-hidden="true" />
</button>
```

**Recommended fix:** Add `useState` for `sidebarOpen`, toggle it on button click, and conditionally show/hide the `<aside>` on mobile using `sidebarOpen` state. The public-site `Navbar` component already has a working drawer pattern to follow.

---

### S4 — "Save Draft" button in StepContent has no handler
**File:** `components/appWorkspace/StepContent.tsx:66-70`  
**Why it matters:** Every workflow step page shows a "Save Draft" button. It has `type="button"` but no `onClick`. Clicking it does nothing. Users trying to save their work mid-workflow will be confused.

```typescript
<button
  type="button"
  className="..."
>
  Save Draft
</button>
```

**Recommended fix:** Wire to `localStorage`-persisted step data (or at minimum show a toast "Draft saved" with a localStorage write of the current step's form values). At a minimum, add a `disabled` state or tooltip explaining "Auto-saved locally" if no persistence is implemented.

---

### S5 — Arrhenius article mentions "connectors" in application context
**File:** `app/resources/arrhenius-article.tsx:66`  
**Why it matters:** The task requires no connector-related content. The article includes: "Validating ECUs, sensors, **and connectors** to withstand years of harsh thermal exposure."

**Recommended fix:** Remove "and connectors" from line 66 — change to "Validating ECUs and sensors to withstand years of harsh thermal exposure."

---

### S6 — WorkflowNav `complete` state is navigation-position-only, not persistence-based
**File:** `components/appWorkspace/WorkflowNav.tsx:28-29`  
**Why it matters:** `complete = index < currentIndex` marks any step before the current URL step as "Complete" (green checkmark). If a user jumps directly to step 8 without touching steps 1-7, steps 1-7 all show as complete. This creates false confidence in workflow progress.

**Recommended fix:** Only mark a step complete if the project has actual saved data for that step. A simple fix is to check a `completedSteps: string[]` field on the `StoredProject` type, updated when the user explicitly saves a step.

---

## 🟢 Nice-to-Have

### N1 — RBD tool missing k-out-of-n configuration
**File:** `app/tools/rbd/page.tsx:22-23, 40`  
**Why it matters:** The task requires verification of k-out-of-n. The RBD only supports `"Block"`, `"Series"`, `"Parallel"`. K-out-of-n (e.g., 2-of-3 redundancy) is a standard reliability architecture. Formula: `R_sys = Σ_{i=k}^{n} C(n,i) * R^i * (1-R)^(n-i)`.

**Recommended fix:** Add `"KofN"` as a fourth type with fields `k` (required votes) and `n` (total). `computeRbdNodeReliability` in `lib/reliabilityMath.ts` would need a new case using the binomial sum.

---

### N2 — GA4 script loaded as blocking `<script>` in root layout
**File:** `app/layout.tsx:51-60`  
**Why it matters:** The GA4 `<script async src="...gtag/js?...">` and inline `<script>` tags are injected into `<head>` as raw HTML rather than via Next.js `<Script>` component. This bypasses Next.js performance optimizations. The inline script is also not escaped (uses `dangerouslySetInnerHTML`).

**Recommended fix:** Move GA4 loading into `PublicSiteChrome` using `<Script id="ga" strategy="afterInteractive">` alongside the existing AdSense script. For `/app` routes, skip GA entirely.

---

### N3 — `next-sitemap.config.js` additionalSitemaps self-references the sitemap index
**File:** `next-sitemap.config.js:15-17`  
**Why it matters:** `additionalSitemaps: ['https://www.reliatools.com/sitemap.xml']` adds the sitemap index file to itself. The sitemap index at `/sitemap.xml` will list itself as an additional sitemap, creating a circular reference. Crawlers may error or loop.

**Recommended fix:** Remove the `additionalSitemaps` array. The generated `/sitemap.xml` index already references `/sitemap-0.xml` automatically.

---

### N4 — "Finalize Report" and "Export PDF/Excel" buttons have no handlers
**File:** `components/appWorkspace/StepContent.tsx:79-82, 385-392`  
**Why it matters:** The final workflow step ("Report") shows export buttons and a "Finalize Report" button. All are `type="button"` with no `onClick`. Users at the end of the workflow have no way to export anything.

**Recommended fix:** At minimum add placeholder `alert("Export coming soon")` handlers or `disabled` + tooltip. For real functionality, PDF export via `jspdf` (already in `package.json`) and Excel via `exceljs` (also installed) could be wired.

---

### N5 — Unused import `BarChart3` in /app dashboard
**File:** `app/app/page.tsx:6`  
**Why it matters:** `BarChart3` is imported from `lucide-react` but never referenced in the component. Minor bundle bloat, treeshaking handles it, but clean code.

---

## Build & Test Summary

| Check | Result |
|---|---|
| `npm run build` | ✅ Clean — 0 errors, 0 warnings |
| TypeScript check | ✅ Passed |
| `npm test` | ✅ 6/6 tests pass |
| `.vercel/output/static` populated | ❌ Empty — build does not generate this directory |
| Edge runtime warning | ⚠️ `Using edge runtime disables static generation for /resources/[slug]` (expected) |

---

## Formula Audit

| Calculator | Formula Correct? | Notes |
|---|---|---|
| Arrhenius | ✅ CORRECT | `exp((Ea/k)*(1/Tuse_K - 1/Tstress_K))`. °C→K conversion via `toKelvinFromCelsius`. `kB_eV = 8.617333262145e-5`. All solvers (Tstress, Tuse, Ea, testHours, useHours) are algebraically correct. |
| Coffin-Manson | ✅ CORRECT | `Nf = A * Δε^(−c)`. `c` is forced positive via `Math.abs(c)`. Inverse solvers for A, Δε, c are all algebraically consistent. Higher strain → fewer cycles ✓ |
| Electromigration (Black's) | ✅ CORRECT | `MTTF = A * j^(−n) * exp(Ea/(k*T))`. `n` forced positive. Higher j → lower MTTF ✓. Temperature in Kelvin ✓. Solver for j and T are correct. |
| Sample Size (binomial) | ✅ CORRECT | `Σ_{i=0}^{f} C(n,i)*(1-R)^i*R^(n-i) = 1-CL`. Log-sum-exp numerics. Bisection for R solve. The previously reported "0.1% absurd result" bug is **not present** in current code — verified by test. |
| RBD | ✅ CORRECT | Series: product ✓. Parallel: `1-Π(1-rᵢ)` ✓. Mixed: tree traversal ✓. K-of-N: not implemented (see N1). |
| Weibull | ✅ CORRECT | CDF: `1-exp(-(t/η)^β)` ✓. R(t): `exp(-(t/η)^β)` ✓. MTTF: `η*Γ(1+1/β)` ✓. B-quantiles correct ✓. MLE handles suspensions via log-reliability terms ✓. Nelder-Mead optimizer ✓. Self-test passes ✓. |

---

## /app Route Inventory

All 15 required routes exist and render:

| Route | File | Status |
|---|---|---|
| `/app` | `app/app/page.tsx` | ✅ Static |
| `/app/projects` | `app/app/projects/page.tsx` | ✅ Static |
| `/app/projects/new` | `app/app/projects/new/page.tsx` | ✅ Static |
| `/app/projects/[projectId]` | `app/app/projects/[projectId]/page.tsx` | ✅ Redirects to `/overview` |
| `/app/projects/[projectId]/[step]` | `app/app/projects/[projectId]/[step]/page.tsx` | ✅ Dynamic |
| `/app/templates` | `app/app/templates/page.tsx` | ✅ Static (placeholder) |
| `/app/reports` | `app/app/reports/page.tsx` | ✅ Static (placeholder) |
| `/app/ai-advisor` | `app/app/ai-advisor/page.tsx` | ✅ Static (placeholder) |
| `/app/settings` | `app/app/settings/page.tsx` | ✅ Static (placeholder) |

All 12 workflow steps are defined in `lib/appWorkspace/mockData.ts` and dispatched in `StepContent.tsx`. The `/app/projects/[projectId]/overview` step correctly uses `[step]` as the catch-all.

---

## New Project Flow Audit

| Check | Result |
|---|---|
| "New Project" button on Dashboard | ✅ Links to `/app/projects/new` |
| "New Project" button on Projects page | ✅ Links to `/app/projects/new` |
| Form captures all required fields | ✅ name, industry, productType, application, targetLife, targetLifeUnit, reliabilityTarget, confidenceTarget, owner, launchDate, customerProgram, designRevision, warrantyPeriod, notes |
| Form validation on submit | ✅ Required field checks, numeric range checks |
| `StoredProject` has future-ready fields | ✅ `userId`, `organizationId`, `createdAt`, `updatedAt` |
| `readStoredProjects` SSR-safe | ✅ Guards `typeof window === "undefined"` |
| `writeStoredProject` SSR-safe | ⚠️ No guard — but only called from browser event handlers so safe in practice |
| Redirect after submit | ✅ `router.push(\`/app/projects/${projectId}/overview\`)` |
| New project appears in project list | ✅ `useProjects()` reads localStorage on mount |
| Demo data has no connector examples | ✅ Projects: Industrial Motor Controller, Medical Wearable, Data Center PSU, Solar Inverter, HVAC, Appliance, Pump Controller, Battery Monitoring — all generic |

---

## Case-Sensitive Route Audit (Cloudflare)

All routes in `data/tools.json` match their actual filesystem directories (Next.js is case-sensitive on Cloudflare):

| Route in tools.json | Directory | Match |
|---|---|---|
| `/tools/Arrhenius` | `app/tools/Arrhenius/` | ✅ |
| `/tools/BurnInWizard` | `app/tools/BurnInWizard/` | ✅ |
| `/tools/CoffinManson` | `app/tools/CoffinManson/` | ✅ |
| `/tools/Derating` | `app/tools/Derating/` | ✅ |
| `/tools/Electromigration` | `app/tools/Electromigration/` | ✅ |
| `/tools/HALTHASSWizard` | `app/tools/HALTHASSWizard/` | ✅ |
| `/tools/MissionProfile` | `app/tools/MissionProfile/` | ✅ |
| `/tools/Psychrometrics` | `app/tools/Psychrometrics/` | ✅ |
| `/tools/Samplesize` | `app/tools/Samplesize/` | ✅ |
| `/tools/Weibull` | `app/tools/Weibull/` | ✅ |
| `/tools/VibrationWizard` | `app/tools/VibrationWizard/` | ✅ |
| `/tools/SoftwareBRP` | `app/tools/SoftwareBRP/` | ✅ |
| `/tools/rbd` | `app/tools/rbd/` | ✅ |
| `/tools/p-diagram` | `app/tools/p-diagram/` | ✅ |
| `/tools/testplangenerator` | `app/tools/testplangenerator/` | ✅ |

No case mismatches detected.

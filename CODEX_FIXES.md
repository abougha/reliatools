# Codex Fix Instructions — Reliatools

Fixes are ordered by priority (blockers first). Each block is self-contained.
**Applies to every block:** Do not change unrelated files. Verify the formula before changing it; fix only if confirmed wrong.

---

## Fix 1 — Remove ECU Connector from P-Diagram default preset

### 1. Objective
Replace the "ECU Connector" preset in the P-Diagram tool with a generic cross-industry example that does not reference connectors, per the product policy.

### 2. Files to inspect
- `app/tools/p-diagram/page.tsx` — entire file, especially the `PRESETS` object and state initialization

### 3. Files to modify or create
- `app/tools/p-diagram/page.tsx`

### 4. Required behavior
The P-Diagram tool must not display any connector-related content at initial load or after reset. The default preset name, title, and all data fields must refer to a generic industrial or cross-industry product.

### 5. Calculation logic
N/A — this is data/content only, no formulas involved.

### 6. UI requirements
- The preset selector (if one exists) must not include "ECU Connector" as an option.
- The default `useState` initial value for both `presetKey` and `data` must use the new generic preset name.
- The `resetAll()` function must reset to the new generic preset, not "ECU Connector".
- Suggested replacement preset key: `"Industrial Motor Controller"`.
- Suggested preset content: signals = motor speed command, load torque; noise factors = ambient temperature, supply voltage variation, vibration; control factors = PID tuning, thermal protection threshold; output = shaft speed accuracy, thermal stability.

### 7. Validation requirements
- After save, open `/tools/p-diagram` and verify the page loads with the new generic example.
- Click Reset and verify it returns to the new generic example (not the ECU Connector).
- Confirm the string "connector" (case-insensitive) does not appear in any rendered text.

### 8. Graph/export requirements
N/A — P-diagram does not have a graph.

### 9. Testing checklist
- [ ] Page loads without "connector" text visible
- [ ] Reset returns to generic industrial example
- [ ] No reference to ECU, USCAR, or connector in the default preset data
- [ ] The tool still renders correctly with the new preset

### 10. Acceptance criteria
`grep -i "connector\|ECU" app/tools/p-diagram/page.tsx` returns zero matches in the PRESETS data and state initialization. Default and reset state show a generic industrial product.

---

## Fix 2 — Add `@cloudflare/next-on-pages` to build pipeline

### 1. Objective
Ensure `npm run build` (or a dedicated deploy script) generates the `.vercel/output/static` directory that `wrangler.toml` references as `pages_build_output_dir`. Without this, `wrangler pages deploy` deploys an empty directory.

### 2. Files to inspect
- `package.json` — scripts section
- `wrangler.toml` — confirm `pages_build_output_dir = ".vercel/output/static"`
- `.vercel/output/` — should exist and contain `static/` after a successful CF build

### 3. Files to modify or create
- `package.json` — add devDependency and `build:cf` script

### 4. Required behavior
Running `npm run build:cf` must:
1. Execute `next build` (already works via `prebuild` + `build` scripts)
2. Execute `npx @cloudflare/next-on-pages` which reads `.next/` and writes `.vercel/output/static/`
3. Result: `.vercel/output/static/` directory is non-empty and contains all static pages and Workers function bundles.

The Cloudflare Pages dashboard build command must be set to `npm run build:cf` (not `npm run build`).

### 5. Calculation logic
N/A — deployment infrastructure only.

### 6. UI requirements
N/A — deployment infrastructure only.

### 7. Validation requirements
After running `npm run build:cf` locally:
- `ls .vercel/output/static/` must show files (HTML pages, `_worker.js` or similar)
- Dynamic routes (`/app/projects/[projectId]`, `/resources/[slug]`) must be present as Worker bundles, not missing

### 8. Graph/export requirements
N/A.

### 9. Testing checklist
- [ ] `npm install --save-dev @cloudflare/next-on-pages` completes without conflict
- [ ] `npm run build:cf` exits 0
- [ ] `.vercel/output/static/` is non-empty after build
- [ ] `wrangler pages deploy .vercel/output/static` (dry run) does not error
- [ ] Cloudflare Pages CI configured to run `npm run build:cf`

### 10. Acceptance criteria
After `npm run build:cf`, `ls -la .vercel/output/static | wc -l` is greater than 5. Dynamic routes resolve correctly when deployed to a Cloudflare Pages preview URL.

---

## Fix 3 — Remove connector products and USCAR references from Test Plan Generator

### 1. Objective
Remove or replace the "Low-voltage Connector" product entry, connector-tagged materials, and USCAR-2 connector standard references from the Test Plan Generator knowledge base. All user-facing demo products must be generic cross-industry.

### 2. Files to inspect
- `lib/testPlanWizard/knowledgeBase.ts` — `MATERIAL_LIBRARY`, `FAILURE_MODE_LIBRARY`, `TESTS`, product type entries near lines 196-320, 776-814
- `lib/testPlanWizard/logic.ts` — how product tags filter tests and materials (no change needed if only data is modified)
- `app/tools/testplangenerator/page.tsx` — to verify no hardcoded connector references

### 3. Files to modify or create
- `lib/testPlanWizard/knowledgeBase.ts`

### 4. Required behavior
- `id: "connector-lv"` product entry (lines 196-199) must be replaced with a generic product, e.g., `id: "sensor-module"`, `name: "Industrial Sensor Module"`, with appropriate domain tags (e.g., `["sensor", "industrial", "electronics", "polymer"]`).
- Material entries with `tags: ["plating", "connector"]` (lines 301, 309, 317) must have `"connector"` removed from their tags. If their remaining tags are still valid, keep the material; otherwise remove it.
- Test entries with `applicableProductTags` arrays whose only industrial-example tag is `"connector"` must add broader tags or be removed.
- USCAR-2 standard references in test `references` arrays (lines 803, 814) must be replaced with generic standards (e.g., IEC 60068-2-6 for vibration, IEC 60068-2-29 for mechanical shock, or simply removed).

### 5. Calculation logic
N/A — data only, no formulas.

### 6. UI requirements
The Test Plan Generator's product type dropdown must not include any entry with "Connector" in its name. The generated test plan output must not reference USCAR-2 for any product type.

### 7. Validation requirements
- `grep -i "connector\|uscar" lib/testPlanWizard/knowledgeBase.ts` returns zero matches after the fix.
- Run through the Test Plan Generator wizard with the Industrial product type and verify the generated DVP&R does not mention connectors.

### 8. Graph/export requirements
N/A — test plan outputs (tables, CSV export) must not include connector-specific content.

### 9. Testing checklist
- [ ] No "connector" text in `knowledgeBase.ts` (case-insensitive)
- [ ] No "uscar" text in `knowledgeBase.ts` (case-insensitive)
- [ ] Replacement product `"sensor-module"` appears correctly in the product type dropdown
- [ ] Tests previously tagged `["plating", "connector"]` still appear for valid cross-industry products
- [ ] Build passes after changes

### 10. Acceptance criteria
`grep -ri "connector\|uscar" lib/testPlanWizard/` returns zero matches. The Test Plan Generator generates a coherent plan for the replacement industrial product with no connector-specific test methods or standards.

---

## Fix 4 — Give each demo project card a unique ID

### 1. Objective
All 8 demo project cards in `demoProjectCards` share `id: "demo-project"`. Clicking "Open Project" on any of them navigates to the same Industrial Motor Controller workspace. Give each card a unique stable ID so future per-project routing is possible.

### 2. Files to inspect
- `lib/appWorkspace/projectStore.ts` — `demoProjectCards` (lines 55-78), `getProjectFromStorage` (lines 98-109)
- `lib/appWorkspace/mockData.ts` — `demoProjects` array (lines 154-186) — note each entry already has a unique `id` field
- `components/appWorkspace/AppUi.tsx` — `ProjectCard` component — reads `project.id` for href

### 3. Files to modify or create
- `lib/appWorkspace/projectStore.ts`

### 4. Required behavior
Each entry in `demoProjectCards` must use the corresponding `demoProject.slug`-derived unique ID (the `demoProjects` array already has unique IDs: `project_industrial_motor_controller`, `project_medical_wearable_device`, etc.). `getProjectFromStorage` must return the corresponding demo project when one of these IDs is requested.

Specific changes:
1. Change the `id` field in the `demoProjectCards.map()` from `"demo-project"` to `project.id` (from `demoProjects`).
2. In `getProjectFromStorage`, handle all demo project IDs, not just `"demo-project"`. A simple approach: look up in `demoProjectCards` first, then fall back to localStorage, then to `demoWorkspaceProject`.

### 5. Calculation logic
N/A.

### 6. UI requirements
- Clicking "Open Project" on any of the 8 demo cards must navigate to `/app/projects/{unique-id}/overview`.
- The workspace header must show the correct project name for each demo card.
- The demo-project ID (`"demo-project"`) must still resolve correctly for the Industrial Motor Controller card.

### 7. Validation requirements
- Navigate to `/app/projects` and verify 8 cards are shown with 8 distinct hrefs.
- Click each card and verify the workspace title matches the card's project name.

### 8. Graph/export requirements
N/A.

### 9. Testing checklist
- [ ] `demoProjectCards.map(c => c.id)` returns 8 distinct values
- [ ] Each distinct ID resolves in `getProjectFromStorage` to the correct project name
- [ ] `/app/projects/project_medical_wearable_device/overview` renders "Medical Wearable Device" in the header
- [ ] Build and TypeScript pass after changes

### 10. Acceptance criteria
No two entries in `demoProjectCards` share the same `id`. Navigating to each project's URL via the card shows the correct project name in the workspace header.

---

## Fix 5 — Upgrade `resources/[slug]/page.tsx` to async `params`

### 1. Objective
Bring `app/resources/[slug]/page.tsx` into line with Next.js 15+ App Router requirements by awaiting `params` in both `generateMetadata` and `ResourceDetailPage`. The file currently uses the deprecated sync pattern while other dynamic routes in the project already use the async pattern.

### 2. Files to inspect
- `app/resources/[slug]/page.tsx` — both exported functions
- `app/app/projects/[projectId]/layout.tsx` — reference for correct pattern
- `app/app/projects/[projectId]/[step]/page.tsx` — reference for correct pattern

### 3. Files to modify or create
- `app/resources/[slug]/page.tsx`

### 4. Required behavior
Both exported functions must:
- Accept `params: Promise<{ slug: string }>` as their type
- Begin with `const { slug } = await params;`
- Behave identically otherwise — same routing logic, same article component returns

### 5. Calculation logic
N/A — routing logic only.

### 6. UI requirements
All article pages under `/resources/[slug]` must render identically before and after the change.

### 7. Validation requirements
- `generateMetadata` must be an `async function`
- `ResourceDetailPage` must be an `async function`
- Both must `await params` before accessing `slug`
- Build and TypeScript check must pass after the change

### 8. Graph/export requirements
N/A.

### 9. Testing checklist
- [ ] `/resources/arrhenius-article` still renders the Arrhenius article
- [ ] `/resources/halt` still renders the HALT article
- [ ] Page title meta tag is correct (tests `generateMetadata`)
- [ ] TypeScript passes with no `params` type errors
- [ ] Build passes

### 10. Acceptance criteria
`grep "params: {" app/resources/[slug]/page.tsx` returns zero matches (all usages now use `Promise<>`). The page renders correctly for all known slugs.

---

## Fix 6 — Wire mobile hamburger menu in AppShell

### 1. Objective
The `/app` section's mobile hamburger button (visible only at `< lg` breakpoint) has no `onClick` handler. Users on phones and tablets cannot access the sidebar navigation.

### 2. Files to inspect
- `components/appWorkspace/AppShell.tsx` — mobile button (lines 94-100) and aside element (line 42)
- `components/Navbar.tsx` — reference implementation of mobile drawer with overlay

### 3. Files to modify or create
- `components/appWorkspace/AppShell.tsx`

### 4. Required behavior
- Add `const [sidebarOpen, setSidebarOpen] = useState(false)` state.
- The hamburger button's `onClick` must call `setSidebarOpen(true)`.
- The `<aside>` element must gain a mobile-visible variant controlled by `sidebarOpen`: either a slide-in drawer (same pattern as `Navbar.tsx`) or by changing from `hidden ... lg:flex` to conditionally visible.
- An overlay (semi-transparent backdrop) must close the sidebar on tap.
- Each nav link click must close the sidebar.

### 5. Calculation logic
N/A.

### 6. UI requirements
- Sidebar slides in from the left on mobile when the hamburger is tapped.
- Backdrop darkens the content behind the sidebar.
- Tapping the backdrop or any nav link closes the sidebar.
- At `lg` and above, the sidebar is always visible (existing behavior unchanged).

### 7. Validation requirements
- Test at 375px viewport width (iPhone SE) — hamburger must be visible, tap must open sidebar.
- All nav links (`/app`, `/app/projects`, `/app/templates`, etc.) must be reachable on mobile.

### 8. Graph/export requirements
N/A.

### 9. Testing checklist
- [ ] Sidebar invisible by default on mobile
- [ ] Hamburger click opens sidebar
- [ ] Backdrop tap closes sidebar
- [ ] Nav link click closes sidebar and navigates
- [ ] Desktop layout unchanged (sidebar always visible at `lg`)

### 10. Acceptance criteria
On a 375px-wide viewport, all 6 nav items in `appNav` are reachable. At `lg+`, behavior is unchanged.

---

## Fix 7 — Remove "connectors" from Arrhenius article text

### 1. Objective
Remove the word "connectors" from the Arrhenius article's application example list, per the no-connector content policy.

### 2. Files to inspect
- `app/resources/arrhenius-article.tsx` — line 66

### 3. Files to modify or create
- `app/resources/arrhenius-article.tsx`

### 4. Required behavior
Line 66 currently reads:
```
"Validating ECUs, sensors, and connectors to withstand years of harsh thermal exposure."
```
After the fix it must read:
```
"Validating ECUs and sensors to withstand years of harsh thermal exposure."
```

### 5. Calculation logic
N/A.

### 6. UI requirements
The article renders the corrected sentence. No other text on the page changes.

### 7. Validation requirements
`grep -i "connector" app/resources/arrhenius-article.tsx` returns zero matches after the fix.

### 8. Graph/export requirements
N/A.

### 9. Testing checklist
- [ ] Article renders with no mention of "connector"
- [ ] No other content on the page changes

### 10. Acceptance criteria
`grep -i "connector" app/resources/arrhenius-article.tsx` returns zero matches.

---

## Fix 8 — Add k-out-of-n type to RBD calculator

### 1. Objective
The RBD tool supports Series, Parallel, and Block. Add a fourth type, `KofN`, to model k-out-of-n redundancy: the system succeeds if at least k of n children succeed.

### 2. Files to inspect
- `lib/reliabilityMath.ts` — `computeRbdNodeReliability` function (lines 202-224)
- `app/tools/rbd/page.tsx` — `ALLOWED_TYPES`, `Row`, `Node` interfaces, input table, summary, diagram

### 3. Files to modify or create
- `lib/reliabilityMath.ts`
- `app/tools/rbd/page.tsx`

### 4. Required behavior
A `KofN` node must require two additional inputs: `k` (minimum votes, integer ≥ 1) and `n` (total children; must equal the number of child rows). The computed reliability is the binomial tail sum.

### 5. Calculation logic
```
R_KofN = Σ_{i=k}^{n} C(n,i) * r^i * (1-r)^(n-i)
```
where `r` is the (assumed equal) reliability of each child block.

If children have different reliabilities, the exact formula requires inclusion-exclusion (complex). For the MVP, restrict `KofN` to children that are all `Block` type with the same stated reliability. If reliabilities differ, show an error: "KofN computation requires children with equal Block reliability."

In `computeRbdNodeReliability`, add:
```typescript
if (type === "KofN") {
  const kVotes = kRequired; // passed from the node
  const n = childReliabilities.length;
  if (kVotes <= 0 || kVotes > n) throw new Error("k must be between 1 and n.");
  // Assume equal reliability — use first child's value
  const r = childReliabilities[0];
  let sum = 0;
  for (let i = kVotes; i <= n; i++) {
    sum += binomialCoeff(n, i) * Math.pow(r, i) * Math.pow(1 - r, n - i);
  }
  return sum;
}
```

### 6. UI requirements
- Add `"KofN"` to `ALLOWED_TYPES` array.
- Add a `k` input column in the input table that appears only when `type === "KofN"`.
- The Summary table must show `k` and `n` for KofN nodes.
- The SVG diagram must label KofN nodes with `k-of-n` text.

### 7. Validation requirements
- A 2-of-3 system where each block has R=0.9: R_sys = C(3,2)*0.9²*0.1 + C(3,3)*0.9³ = 3*0.81*0.1 + 0.729 = 0.243 + 0.729 = **0.972**
- A 1-of-2 system where each block has R=0.9: 1 - (1-0.9)² = 1 - 0.01 = **0.99** (same as Parallel, verify KofN(k=1) matches Parallel result)

### 8. Graph/export requirements
KofN nodes must appear in the SVG diagram and CSV export with their `k` and `n` values.

### 9. Testing checklist
- [ ] 2-of-3 with R=0.9 returns 0.972 ± 1e-6
- [ ] 1-of-2 with R=0.9 returns 0.99 (matches Parallel)
- [ ] n-of-n with R=0.9 returns 0.9^n (matches Series)
- [ ] Input table shows `k` field only for KofN rows
- [ ] Error shown when k > number of children

### 10. Acceptance criteria
The 2-of-3 benchmark (0.972) passes. KofN appears in ALLOWED_TYPES and the input table type selector. Do not change unrelated files. Verify the formula before changing it; fix only if confirmed wrong.

---

## Fix 9 — Replace blocking GA4 `<script>` with `next/script`

### 1. Objective
The root layout injects GA4 as a raw render-blocking `<script>` tag in `<head>`. Replace with Next.js `<Script>` component using `strategy="afterInteractive"` to avoid blocking initial paint.

### 2. Files to inspect
- `app/layout.tsx` — lines 51-60
- `components/PublicSiteChrome.tsx` — existing AdSense `<Script>` usage (reference pattern)

### 3. Files to modify or create
- `app/layout.tsx`

### 4. Required behavior
Remove the raw `<script>` tags from `<head>`. Add GA4 tracking using `next/script`:
```tsx
import Script from "next/script";
// Inside RootLayout, after <body>:
<Script
  id="ga-init"
  strategy="afterInteractive"
  src="https://www.googletagmanager.com/gtag/js?id=G-9TMY964ETQ"
/>
<Script
  id="ga-config"
  strategy="afterInteractive"
  dangerouslySetInnerHTML={{
    __html: `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-9TMY964ETQ');
    `,
  }}
/>
```

### 5. Calculation logic
N/A.

### 6. UI requirements
GA4 tracking must still fire on all public pages. The `/app` routes may be excluded from GA if desired (check `pathname` in `PublicSiteChrome`, which already differentiates app vs. public routes).

### 7. Validation requirements
- Build passes after change
- GA4 events still appear in the GA dashboard (manual verification)
- Lighthouse performance score should improve (no render-blocking script)

### 8. Graph/export requirements
N/A.

### 9. Testing checklist
- [ ] `grep "script async" app/layout.tsx` returns zero matches
- [ ] `grep "Script" app/layout.tsx` shows the `next/script` import
- [ ] Build passes
- [ ] Page renders in browser without console errors

### 10. Acceptance criteria
`app/layout.tsx` contains no raw `<script>` or `<Script>` tags in the `<head>` JSX section. GA tracking fires via `strategy="afterInteractive"`. Do not change unrelated files. Verify the formula before changing it; fix only if confirmed wrong.

---

## Fix 10 — Remove self-referencing entry from next-sitemap additionalSitemaps

### 1. Objective
`next-sitemap.config.js` includes `https://www.reliatools.com/sitemap.xml` in `additionalSitemaps`. This makes the sitemap index reference itself, creating a circular reference that confuses search engine crawlers.

### 2. Files to inspect
- `next-sitemap.config.js` — lines 14-17

### 3. Files to modify or create
- `next-sitemap.config.js`

### 4. Required behavior
Remove the `additionalSitemaps` key entirely. The generated `sitemap.xml` index already references `sitemap-0.xml` automatically without needing the `additionalSitemaps` array.

### 5. Calculation logic
N/A.

### 6. UI requirements
N/A — sitemap is machine-readable.

### 7. Validation requirements
After `npm run build`, verify `public/sitemap.xml` does not include a self-reference to `/sitemap.xml`. It should only list `/sitemap-0.xml`.

### 8. Graph/export requirements
N/A.

### 9. Testing checklist
- [ ] `next-sitemap.config.js` has no `additionalSitemaps` key
- [ ] After build, `sitemap.xml` does not contain `sitemap.xml` as a listed sitemap
- [ ] `sitemap-0.xml` still lists all expected public routes
- [ ] `/app` and `/app/*` routes are still excluded from the sitemap

### 10. Acceptance criteria
`grep "additionalSitemaps" next-sitemap.config.js` returns zero matches. Built `public/sitemap.xml` contains only `/sitemap-0.xml` as a child sitemap entry. Do not change unrelated files. Verify the formula before changing it; fix only if confirmed wrong.

---
name: Reliatools
description: Physics-based reliability-engineering calculators with an instrument-panel visual language
colors:
  signal-blue: "#2563eb"
  signal-blue-deep: "#1d4ed8"
  signal-blue-pale: "#eff6ff"
  signal-blue-tint: "#dbeafe"
  signal-blue-line: "#bfdbfe"
  ink: "#0f172a"
  ink-deep: "#020617"
  slate-body: "#475569"
  slate-muted: "#64748b"
  slate-line: "#e2e8f0"
  slate-surface: "#f8fafc"
  paper: "#ffffff"
  warn-surface: "#fffbeb"
  warn-line: "#f59e0b"
  warn-ink: "#92400e"
  danger-surface: "#fef2f2"
  danger-line: "#ef4444"
  danger-ink: "#b91c1c"
typography:
  display:
    fontFamily: "var(--font-geist-sans), Geist Sans, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 4vw, 3.75rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "var(--font-geist-sans), Geist Sans, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "var(--font-geist-sans), Geist Sans, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "var(--font-geist-sans), Geist Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "var(--font-geist-sans), Geist Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.05em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "40px"
  xl: "56px"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.signal-blue-deep}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.signal-blue-deep}"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  callout-result:
    backgroundColor: "{colors.signal-blue-pale}"
    textColor: "{colors.signal-blue-deep}"
    rounded: "{rounded.sm}"
    padding: "16px"
  callout-warning:
    backgroundColor: "{colors.warn-surface}"
    textColor: "{colors.warn-ink}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  callout-error:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.danger-ink}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  nav-item-active:
    backgroundColor: "{colors.signal-blue-pale}"
    textColor: "{colors.signal-blue-deep}"
    rounded: "{rounded.md}"
---

# Design System: Reliatools

## Overview

**Creative North Star: "The Diagnostic Instrument"**

Reliatools reads like the display panel of a piece of lab test equipment: precise, calm, and built to be trusted under scrutiny rather than to impress. Most of the interface is deliberately quiet — white surfaces, restrained slate type, thin hairline borders — so that when the accent color appears, it means something: a value being measured, a state being flagged, an action being offered. Signal Blue (`#2563eb`) is that instrument's single active signal color, echoing an oscilloscope trace or a status LED. The homepage's animated logo (concentric rings, a scanning sweep line, pulsing circuit nodes, all in blue) is this identity's one permitted piece of literal theater; it names the metaphor the rest of the system stays quiet about.

The system is not neutral-flat everywhere. Interactive surfaces — cards, nav items, primary actions — are meant to feel physically liftable: a resting `shadow-sm` state that promotes to a deeper, cooler-toned shadow with a real upward translation on hover/focus, closer to a confident SaaS product than a static spec sheet. Inline calculation output, by contrast (results, warnings, errors), stays flat — colored left-border callout strips, not cards — because that content behaves like an instrument readout, not an interactive object.

**Key Characteristics:**
- One accent color (Signal Blue) carrying all interactivity, emphasis, and brand signal; nothing else competes with it.
- Neutral scale is **slate**, not gray — cooler, slightly blue-leaning, consistent with the accent (see Named Rule below).
- Flat, left-border callout strips for calculated results/warnings/errors; shadowed, lifting cards for everything the user can click or navigate.
- Geist Sans throughout; no serif, no display-only webfont.
- KaTeX-rendered formulas are a first-class visual element on every tool page, not an afterthought.
- One expressive motion signature (the diagnostic-pulse logo); everywhere else motion is a state-transition utility (hover lift, drawer slide), not a decoration.

## Colors

The palette is almost monochrome by design: slate neutrals, a white canvas, one blue accent, and three semantic status colors reserved strictly for calculator feedback.

### Primary
- **Signal Blue** (`#2563eb`): the only accent. Links, primary buttons, active nav state, chart trace lines, focus rings, the logo's glow and pulse nodes. Also the fill for result callouts at low opacity (`#eff6ff` background, `#1d4ed8` text).

### Neutral
- **Ink** (`#0f172a`, slate-900): primary heading and body text.
- **Ink Deep** (`#020617`, slate-950): reserved for hero-scale display headlines only.
- **Slate Body** (`#475569`, slate-600): secondary/paragraph copy.
- **Slate Muted** (`#64748b`, slate-500): tertiary copy, captions, metadata (dates, byline text).
- **Slate Line** (`#e2e8f0`, slate-200): borders, dividers, card edges, table rules.
- **Slate Surface** (`#f8fafc`, slate-50): section backgrounds, formula/reference boxes, alternating page bands.
- **Paper** (`#ffffff`): the base canvas — cards, header, sidebar.

### Semantic (calculator feedback only — not for decoration)
- **Warning** (surface `#fffbeb`, line `#f59e0b`, ink `#92400e`): non-fatal calculator conditions (e.g. "AF is not accelerating", cross-check mismatches).
- **Danger** (surface `#fef2f2`, line `#ef4444`, ink `#b91c1c`): field validation errors and invalid physical results.

### Named Rules
**The One-Signal Rule.** Signal Blue is the only accent color in the system. It never shares emphasis duty with a second brand hue; when a second color appears, it is always semantic (warning amber, danger red), never decorative.

**The Slate-Not-Gray Rule.** Neutrals are drawn from the slate scale, not gray. Some older tool-calculator pages still use Tailwind's `gray-*` scale (a documented inconsistency, not the standard) — treat any `gray-*` neutral found in existing code as drift to converge toward `slate-*` on next touch, not as a second accepted register.

## Typography

**Body & Display Font:** Geist Sans (variable), falling back to system-ui sans-serif.
**Mono Font:** Geist Mono (variable), loaded for tabular/numeric contexts.

**Character:** A single geometric, engineering-grade sans for everything — no serif for warmth, no separate display face for drama. Weight and size carry all the hierarchy; the typeface itself stays neutral, like the labeling on a piece of test equipment.

### Hierarchy
- **Display** (800, `clamp(2.25rem, 4vw, 3.75rem)`, 1.1 line-height, -0.01em tracking): hero headline only (homepage H1).
- **Headline** (700, 1.875rem/30px, 1.25 line-height): page-level H1 on tool and resource pages ("Arrhenius Acceleration Factor Calculator").
- **Title** (600, 1.25rem/20px, 1.3 line-height): section headers, card titles, H2/H3 within articles.
- **Body** (400, 1rem/16px, 1.6 line-height): paragraph copy; target 65–75ch measure in article content.
- **Label** (600, 0.75rem/12px, 0.05em tracking, often uppercase): eyebrow labels above headlines, category chips, form field labels.

### Named Rules
**The Formula-Is-Type Rule.** KaTeX-rendered equations are treated as first-class typographic elements, not images — they sit inline with body copy at matching visual weight, inside the same `slate-surface` reference boxes as their variable-definition lists.

## Layout

Content is constrained to `max-w-3xl` on calculator/article pages (readable single-column working width) and `max-w-7xl` on marketing surfaces (homepage, tools index, resources index) with responsive grid breakdowns (1 column mobile → 2–3 columns `md`/`lg`).

A fixed 200px-wide sidebar (`SIDEBAR_WIDTH`) occupies the left edge on desktop (`md:` and up), always visible, holding the logo, a "Buy Me a Coffee" link, and primary nav; content is offset with `padding-left: 200px` on `body` at `md:` breakpoints. Below `md`, the sidebar collapses into a slide-in drawer (overlay + `translate-x` transition) triggered by a hamburger button. A sticky top header (~40–100px, housing an AdSense unit) sits above the sidebar in z-order.

Section rhythm on marketing pages runs in alternating `paper` / `slate-surface` horizontal bands, each with generous vertical padding (`py-8` to `py-14`) and a consistent `max-w-7xl` inner container. Calculator pages are denser and more form-like: a formula reference box, a responsive input grid (1 column mobile, 2 columns `sm:`), then a result callout stack, then an optional chart, then static educational prose below a horizontal rule.

## Elevation & Depth

Depth is used deliberately, not ambiently: **flat elements read as data, shadowed elements read as objects you can act on.**

- **Flat by default**: result/warning/error callouts, formula reference boxes, table rows — anything presenting calculated output stays flat, distinguished by a colored left border and tinted background rather than a shadow.
- **Tactile for interactive surfaces**: cards, nav items, and buttons rest at a soft `shadow-sm` and promote to a visibly deeper shadow plus a small upward translation (`-translate-y-0.5` to `-translate-y-1`) on hover/focus — closer to a modern SaaS product's "liftable" card than a flat instrument face. This is the resolved standard going forward; some current cards under-commit to only `shadow` → `shadow-md` and should be pulled up to this stronger hover contrast on next touch.
- **Signature glow**: the homepage logo is the one place elevation gets expressive — `shadow-xl` tinted blue (`shadow-blue-100/60`) plus layered radial glows behind the mark. This tinted-shadow treatment is reserved for that one hero moment; don't reuse it on ordinary cards.

### Shadow Vocabulary
- **Rest** (`box-shadow: 0 1px 2px rgba(0,0,0,0.05)` / Tailwind `shadow-sm`): default state for cards, header, sidebar.
- **Hover/Lift** (`box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` / Tailwind `shadow-lg`, paired with a small upward translate): interactive card and button hover/focus.
- **Signature** (`box-shadow: 0 20px 25px -5px rgba(37,99,235,0.15)` / Tailwind `shadow-xl shadow-blue-100/60`): reserved for the hero diagnostic-logo treatment only.

### Named Rules
**The Readout-Stays-Flat Rule.** Anything the calculator computed (a result, a warning, an error) is presented flat with a colored left border, never inside a shadowed card. Shadows are earned by interactivity, not by importance.

## Shapes

Corners scale with a component's weight: small interactive chips and status pills go fully round (`rounded-full`, e.g. the wizard step dots, nav pills, category tags); cards and panels use a moderate `12px`–`16px` radius (`rounded-lg`/`rounded-xl`); inline form controls and callout strips use a tighter `4px`–`8px` radius so they read as precise, not soft. Borders are consistently 1px, hairline `slate-line`, with 4px-wide colored left borders used specifically to flag callout type (blue = result, amber = warning, red = danger) — a left-border accent is this system's way of saying "read this line differently," reused nowhere else.

## Components

### Buttons
- **Shape:** `rounded-md` (8px).
- **Primary:** Signal Blue background (`#2563eb`), white text, `12px 24px` padding, `shadow-sm` at rest.
- **Hover/Focus:** background deepens to `#1d4ed8`; focus state adds a 2px Signal Blue ring with offset.
- **Secondary/Ghost:** white or transparent background, Signal Blue border and text (`border-blue-200 text-blue-700`), same radius and padding; hover fills with `signal-blue-pale`.

### Cards
- **Corner Style:** `rounded-lg` to `rounded-xl` (12–16px).
- **Background:** `paper` (#ffffff).
- **Shadow Strategy:** rests at `shadow-sm`; promotes to `shadow-lg` + upward lift on hover (see Elevation).
- **Border:** 1px `slate-line`, sometimes shifting to a pale Signal Blue border on hover to reinforce interactivity.
- **Internal Padding:** 24px (`p-6`).

### Callouts (result / warning / error)
- **Style:** flat tinted background, 4px colored left border, matching-hue text; no shadow, no full border.
- **Result:** blue surface/border/text.
- **Warning:** amber surface/border/text.
- **Error/Danger:** red surface/border/text, paired with inline field-level error text below the offending input.

### Inputs / Fields
- **Style:** 1px `slate-line` border, `rounded-sm`/`rounded-md`, white background, `8px` internal padding.
- **Focus:** border and ring shift to Signal Blue.
- **Error:** border shifts to Danger red; an inline red caption explains the validation failure directly beneath the field.
- **Radio-linked fields** (the "solve for" pattern on calculators): the actively-solved field's wrapping label gets a `border-l-4 border-yellow-400 bg-yellow-50` highlight and disables its input, visually distinguishing "what you're solving for" from "what you're providing."

### Navigation
- **Style:** fixed 200px sidebar, `paper` background, `slate-line` right border; nav items are text links with generous click targets (`px-3 py-2`), `rounded-md` corners.
- **Active state:** `signal-blue-pale` background, `signal-blue-deep` text, thin Signal Blue border (`border-blue-200`) — the same "pale fill + deep text + hairline border" formula the Primary color uses everywhere else it needs to look "selected."
- **Hover (inactive):** `slate-50`/`gray-100` background wash, no border.
- **Mobile:** sidebar becomes a left-anchored slide-in drawer (`-translate-x-full` → `translate-x-0`) with a dark overlay scrim (`bg-black/40`), triggered by a hamburger button in the sticky header.

### Diagnostic Pulse Mark (signature component)
The homepage's animated logo: concentric dashed rings rotating at different speeds (28s/42s, opposing directions), a translucent horizontal "scan sweep" line traveling vertically through the mark on a 4.8s cycle, four pulsing circuit nodes at staggered delays, and a soft breathing glow behind the centered logotype. All motion respects `prefers-reduced-motion: reduce` (rings and pulses freeze; sweep line hides). This is the system's one literal expression of "The Diagnostic Instrument" and should not be diluted by reuse as generic decoration elsewhere — its rarity is what makes the homepage read as the brand's home base.

## Do's and Don'ts

### Do:
- **Do** keep Signal Blue (`#2563eb`) as the only accent color; every other hue in the system is semantic (amber warning, red danger) or structural (slate neutrals).
- **Do** use the slate neutral scale (`slate-50` … `slate-950`) as canonical going forward, even where existing tool pages still use `gray-*`.
- **Do** render calculated output (results, warnings, errors) as flat, left-bordered callout strips — never inside a shadowed card.
- **Do** give interactive cards and buttons a real hover/focus promotion: deeper shadow plus a small upward lift, not just a border-color change.
- **Do** treat the diagnostic-pulse animated logo as the system's single reserved moment of motion theater; respect `prefers-reduced-motion` on any new motion, following its existing pattern.
- **Do** keep KaTeX formula blocks inside `slate-surface` reference boxes alongside their variable-definition lists, on every calculator page.

### Don't:
- **Don't** introduce a second brand accent color alongside Signal Blue; new emphasis needs are a weight/size/spacing problem, not a new-hue problem.
- **Don't** put a card-style shadow on a results/warnings/errors callout — that visually confuses "computed readout" with "clickable object."
- **Don't** reuse the hero logo's tinted blue glow (`shadow-blue-100/60`) on ordinary UI cards; it's reserved for that one signature moment.
- **Don't** treat the shadcn/`components/ui` CSS-variable theme (currently only consumed by `components/ui/card.tsx`) as the system's real token source — the actually-operative palette is the Tailwind slate/blue utility values documented above; that CSS-variable layer is legacy scaffolding, not the source of truth.

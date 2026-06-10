---
name: extract-design-md
description: >-
  Extract a website's design system into a portable DESIGN.md file (two-tier
  design tokens + components + prose) for reuse across projects. Use when the
  user wants to capture, extract, clone, or reverse-engineer the visual
  language / design system / brand of a website or URL, or asks to generate a
  DESIGN.md from a site.
---

# Extract DESIGN.md from a Website

Capture a real website's visual language as a portable `DESIGN.md` that any
coding agent can use to build on-brand UI. The output is token-driven (a
two-tier color system, typography, spacing, radius, elevation, and components)
plus explanatory prose.

## Golden rule #1: record decisions, not just values

A scraper records *what's there*; this skill records *the decisions* — so an
agent can make NEW screens that feel like they belong. A CSS-variable dump is
not enough. Every section of the output must pair **values with rules for
applying them**, and trace back to a stated **Design Intent**. Specifically,
capture and write:

- **Design intent** — 2-4 sentences on what it's trying to feel like + what it
  optimizes for + reference points. This is the tiebreaker for anything
  unspecified. Infer it from the visual tone, density, and copy.
- **Type as hierarchy with rules** — roles (display/h1/h2/body/small/micro) with
  usage rules ("headings never exceed weight 600", "body never below 15px").
- **Spacing logic** — the base unit + relational rules (within / related /
  groups / sections), not a dump of every margin.
- **Color with semantic roles + constraints** — surface / surface-raised /
  border / text-primary / text-muted / accent / destructive, plus rules
  ("accent once per view, primary action only").
- **Component anatomy + ALL states** — hover, focus, disabled, empty, error.
  This is the single biggest gap in AI-generated UI.
- **Motion philosophy + tokens** (see Step 6).
- **Voice, illustration/iconography**, and a **"Never Do"** list — prohibitions
  constrain an agent more effectively than positive examples.

Fill the [TEMPLATE.md](TEMPLATE.md) sections 1-9 with these. When in doubt, do less.

## Golden rule #2: trust the rendered page, not the raw CSS

Modern sites ship UI frameworks (Mantine, Tailwind, Bootstrap, MUI) that inject
**hundreds of unused palette variables**. Reading raw `.css` files leads to
wrong conclusions (e.g. picking a framework default or a one-off icon color as
"primary"). Always extract **computed styles of real, visible elements** and
**look at screenshots** to judge hierarchy. The provided script does both.

## Workflow

```
- [ ] 1. Get the target URL
- [ ] 2. Run the probe script -> styles.json + screenshots
- [ ] 3. LOOK at the screenshots and read styles.json
- [ ] 4. Decide the semantic hierarchy from real usage (verify visually)
- [ ] 5. Build two-tier tokens (primitives + semantic roles)
- [ ] 6. (Optional) Run the motion probe -> motion.json (microinteractions)
- [ ] 7. Write DESIGN.md from TEMPLATE.md (+ Motion section if captured)
- [ ] 8. (Optional) verify: build a sample, render, compare, iterate
```

### Step 1 — Target

Confirm the URL. If the user wants a specific page (product, pricing, app),
probe that exact URL — different pages reveal different components.

### Step 2 — Probe the live site

The script drives the installed Chrome over the DevTools Protocol (no install).

```bash
node --experimental-websocket scripts/probe.mjs "https://example.com" ./design-probe
```

- Requires Node 18+ and Chrome/Chromium/Edge installed. Override the binary with
  `CHROME=/path/to/chrome`. On Node ≥ 21 the `--experimental-websocket` flag may
  be omitted.
- Outputs into `./design-probe/`: `styles.json` (computed styles + color/font
  frequency tallies + `:root` CSS vars) and `full.png` + `slice-*.png`
  screenshots.

### Step 3 — Read the evidence

**Always view the screenshots** (`full.png`, then the `slice-*.png` for detail)
and read `styles.json`. The screenshots decide hierarchy; the JSON gives exact
values.

### Step 4 — Decide the semantic hierarchy

From `styles.json.buttons` + the screenshots, identify:

- **Primary action** = the button style used for the main CTA (look at the hero
  CTA's `bg`/`color`/`radius` in `buttons`, confirm against the screenshot). It
  is whatever the eye lands on first — NOT the most frequent hex.
- **Secondary / tertiary** actions, and any **distinct conversion CTA** (a site
  may use one color for nav CTAs and another, e.g. green, for "sign up").
- **Canvas** = `body.bg`; **ink** = `body.color`.
- **Accents** vs **decorative**: a color that appears only in a gradient streak,
  illustration, or handwritten flourish is decorative, not a UI role.
- **Marketing chrome vs in-product surfaces**: colors/imagery inside an app
  screenshot or device mockup belong to a `product` role, not page chrome.

Map `fonts` to a primary family (+ any display/handwriting face), `headings` to
the display scale, `radii`/`shadows` to shape and elevation.

See [reference.md](reference.md) for detailed mapping heuristics and pitfalls.

### Step 5 — Build two-tier tokens

Never emit a flat color list. Use:

- **Tier 1 — primitives**: raw hue scales by step, e.g. `neutral.0..900`,
  `green.500`, `blue.500`. Derive a few steps per hue even if the site only
  exposes one (hover/soft/tint).
- **Tier 2 — semantic roles**: what components consume — `background.*`,
  `text.*`, `border.*`, `action-primary.*`, `action-secondary.*`,
  `action-cta.*`, `accent.*`, `feedback.*`, and `product.*` for in-mockup
  colors. Every semantic value references a primitive.

This makes theming (incl. dark mode) a single override of the semantic tier.

### Step 6 — Capture motion (optional)

To reproduce microinteractions (hover, scroll reveals, transitions), capture the
**mechanism**, not a video — screen-recording can't be reverse-engineered into
clean CSS. Run the motion probe:

```bash
node --experimental-websocket scripts/motion.mjs "https://example.com" ./design-probe
```

It writes `motion.json` with: `libraries` (GSAP/Framer Motion/Lottie/Rive/AOS/
Lenis detected), `transitions` (durations + easings), `keyframes` (`@keyframes`
rules), `hover` (computed-style deltas on real elements with the driving
transition), and `scroll` (opacity/transform from→to for reveal/parallax).

Use it to write a `## Motion` section in DESIGN.md and, if building a sample, a
`motion.css` (transition tokens + `@keyframes` + an IntersectionObserver reveal
helper). If a library is detected, recommend reproducing with that library
(e.g. Framer Motion) rather than hand-rolled CSS. See [reference.md](reference.md)
for what is reliably capturable vs. approximate (springs, WebGL, scrubbing).

### Step 7 — Write DESIGN.md

Copy [TEMPLATE.md](TEMPLATE.md) and fill it out. It is a **decisions + rules**
spec, not a value dump. Requirements:

- Compact YAML frontmatter for tooling: `intent`, `colors.semantic` (surface,
  surface-raised, border, text-primary, text-muted, accent, destructive, …),
  `typography` (display/h1/h2/body/small/micro), `spacing` (base + relational),
  `rounded`, `motion`.
- Body sections 1-9: **Design Intent**, **Type System** (roles + rules),
  **Spacing Logic** (relational, not a table dump), **Color** (semantic roles +
  constraints), **Components** (anatomy + ALL states: hover/focus/disabled/
  empty/error), **Motion** (philosophy + tokens + captured inventory),
  **Illustration & Imagery**, **Voice in the Interface**, **Never Do**.
- Pair every value with a rule. Infer **Design Intent** from tone/density/copy.
- Honesty: anything not observed (states you couldn't trigger, dark mode, deep
  app UI) — say so. If you add a theme the site lacks, label it additive.

### Step 8 — ALWAYS render one showcase page

Whenever this skill produces a deliverable, **always render a single
self-contained showcase page** with the bundled generator — never hand-build a
bespoke layout, and never put motion in a separate "website" tab.

1. Put **motion inside `DESIGN.md`** — a `motion:` frontmatter block (easing,
   duration, hover, looping, inventory) AND a `## Motion` prose section. Motion
   is part of the design language, not the sample site.
2. Build the sample site as `<brand>-sample.html` (the Step 8 verification site).
3. Run the generator:

```bash
node scripts/showcase.mjs <brand>-DESIGN.md <brand>-sample.html <brand>.html
```

This emits one self-contained page (`<brand>.html`) modeled on
design-extractor.com/gallery — a **Design / Preview / Source** segmented control:

- **Design** — the rendered design system: header + token counts, color
  swatches (primitive scales + semantic roles, refs resolved to hex), type
  specimens ("The quick brown fox jumps"), spacing bars, radii chips,
  components, and a **Motion** section — all rendered from `DESIGN.md`.
- **Preview** — the sample site, inlined via `<iframe srcdoc>` (self-contained).
- **Source** — the raw `DESIGN.md` + a "Copy .md" button.

Open `<brand>.html` to verify all three tabs; compare Preview to the site
screenshots and iterate. Then remove temporary probe/screenshot artifacts.

**Fidelity check (avoid inventing motion):** read `motion.json.inventory` first.
If `scroll` reveals are empty but `runningAnimations` is high, the site uses
continuous loops + hover — reproduce those, and do NOT add fade-up-on-scroll
reveals it doesn't have.

## Output location

Write `DESIGN.md` to the project root (or where the user asks). It is meant to
be dropped into any repo so an agent can "use DESIGN.md for UI work."

## Resources

- [scripts/probe.mjs](scripts/probe.mjs) — run to extract styles + screenshots.
- [scripts/motion.mjs](scripts/motion.mjs) — run to capture microinteractions.
- [scripts/showcase.mjs](scripts/showcase.mjs) — run to render the final
  Design/Preview/Source showcase page from a DESIGN.md (+ sample). ALWAYS use it.
- [TEMPLATE.md](TEMPLATE.md) — the DESIGN.md structure to fill in.
- [reference.md](reference.md) — token mapping heuristics, framework pitfalls,
  dark-theme mapping, motion capture, verification tips.

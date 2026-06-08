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

## Golden rule: trust the rendered page, not the raw CSS

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
- [ ] 6. Write DESIGN.md from TEMPLATE.md
- [ ] 7. (Optional) verify: build a sample, render, compare, iterate
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

### Step 6 — Write DESIGN.md

Copy [TEMPLATE.md](TEMPLATE.md) and fill every section with extracted values.
Requirements:

- YAML frontmatter: `colors` (nested `primitive:` + `semantic:`, optional
  `semantic-dark:`), `typography`, `rounded`, `spacing`, `components`. Components
  reference semantic roles (e.g. `{colors.semantic.action-primary.bg}`).
- Prose sections: Overview (+ Key Characteristics), Colors, Typography, Layout,
  Elevation, Components, Responsive Behavior, Known Gaps.
- Honesty: list anything not observed (hover states, dark mode, deep app UI)
  under **Known Gaps**. If you add a dark theme the site lacks, label it an
  additive, reuse-oriented layer.

### Step 7 — Verify (optional but recommended)

If asked to also build a showcase/sample: generate a small page using only the
tokens, render it with the same probe approach (point Chrome at the local
file), and compare side-by-side to the site screenshots. Iterate until the
palette, hierarchy, and shapes match. Remove temporary probe/screenshot
artifacts when done.

## Output location

Write `DESIGN.md` to the project root (or where the user asks). It is meant to
be dropped into any repo so an agent can "use DESIGN.md for UI work."

## Resources

- [scripts/probe.mjs](scripts/probe.mjs) — run to extract styles + screenshots.
- [TEMPLATE.md](TEMPLATE.md) — the DESIGN.md structure to fill in.
- [reference.md](reference.md) — token mapping heuristics, framework pitfalls,
  dark-theme mapping, verification tips.

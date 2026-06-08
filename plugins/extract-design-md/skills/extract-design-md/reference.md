# Reference — mapping a website to DESIGN.md tokens

Detailed guidance for Step 4–7. Read when you need the heuristics; the SKILL.md
workflow is the source of truth for the overall process.

## Why computed styles + screenshots (not raw CSS)

UI frameworks declare huge palettes the site never uses:

- **Mantine** exposes `--mantine-color-<hue>-0..9` for ~10 hues and sets a
  default `--mantine-primary-color: blue` even when the brand never uses blue.
- **Tailwind** ships the full `slate/gray/red/.../50..950` scale; most are unused.
- **Bootstrap / MUI** similarly ship full theme palettes.

So a hex's presence in CSS (or even its frequency) does NOT make it a brand
color. Decide roles from:

1. **Screenshots** — what the eye actually sees as the primary action, canvas,
   and accents.
2. **Computed styles of real elements** — `styles.json.buttons`, `headings`,
   `body` give exact values for elements that are actually rendered.

`styles.json.cssVars` and the frequency tallies are *supporting* evidence only.

## Reading styles.json

- `buttons` / `links`: deduped real interactive elements with `bg`, `color`,
  `radius`, `border`, `padding`, `font`, `weight`, `size`. The hero CTA's row is
  your primary action. A second, differently-colored CTA (often green/blue) is a
  conversion CTA — give it `action-cta`.
- `headings.h1/h2/h3`: seed the display type scale (size/weight/tracking/line).
- `body`: `bg` → `background.primary` (canvas); `color` → `text.primary` (ink).
- `bgColors` / `textColors` / `borderColors`: distinct values by frequency — use
  to populate the neutral scale and spot surface tints. Ignore long tails.
- `radii`: distinct `border-radius` values → your `rounded` scale (note pills
  like `100px`/`9999px` vs card radii like `12–32px`).
- `shadows`: distinct `box-shadow`s → elevation tiers (often just one soft tier).
- `fonts`: most-used `font-family` stacks → primary family (+ any display/mono).

## Deciding semantic roles

| Role | How to pick it |
|---|---|
| `background.primary` | `body.bg` (the page floor). |
| `background.secondary/tertiary` | the next 1–2 most common light surface tints. |
| `text.primary` | `body.color` (rarely pure black). |
| `action-primary` | the hero CTA button's `bg`+`text`+`radius`. |
| `action-secondary` | the muted/outline/gray button style. |
| `action-cta` | a second CTA color used for high-intent conversion (omit if none). |
| `accent.*` | colors used for emphasis, links, in-product highlights. |
| `feedback.success/error` | green/red used for status (often = accent green). |
| `product.*` | colors/imagery that appear only inside an app mockup/device. |
| decorative | gradients, streaks, illustrations, handwriting — document under prose/decorative, NOT as a UI role. |

Derive missing primitive steps: if only one base hue is exposed, add a `hover`
(darken ~10%) and a `soft`/`tint` (very light) so components have real states.

## Distinguishing chrome from product

A common mistake is treating an app screenshot's colors as page colors. If a
blue sky, dark dashboard, or colored chart appears inside a device/browser
mockup, those are `product.*` tokens — the marketing canvas is usually the plain
`body.bg`. Look at where the color lives in the screenshots.

## Typography

- One family usually carries the whole UI. Capture the exact stack from `fonts`.
- Note a separate **display** face or a **handwriting/script** accent if present
  (e.g. annotations in a script font). Add it as its own type token.
- Build a scale from `headings` + body sizes; infer intermediate steps. Record
  weight and letter-spacing — tight negative tracking on large display type is a
  common, easy-to-miss signal.
- If the brand font is proprietary, name the closest open-source substitute in a
  "Note on font substitutes".

## Dark theme (when requested)

The two-tier system makes this cheap: keep primitives, override only the
semantic tier under `semantic-dark`. Typical mappings:

- `background.primary` → near-black (e.g. `#0e0f11`), `secondary`/`tertiary` →
  progressively lighter dark surfaces; borders → low-contrast dark grays.
- `text.primary` → white; `secondary` → light gray.
- `action-primary` often **flips** (a black button becomes white-on-dark) so it
  stays visible; a colored CTA usually stays the same.
- Shadows read poorly on dark — lean on borders for separation.
- Product mockups should stay light (like a light screenshot on a dark page):
  pin their semantic vars to light values.

If the real site is light-only, say so in **Known Gaps** — dark mode is an
additive layer, not an extraction.

## Verification loop (if building a sample)

1. Implement tokens as CSS variables (primitives + semantic), wire components to
   semantic vars only.
2. Render the sample by pointing Chrome at the local file (reuse the probe
   approach or `chrome --headless --screenshot`).
3. Compare to the site screenshots: primary action color/shape, canvas, accents,
   type weight, radii. Fix mismatches and re-render.
4. Check dark mode if included: readable contrast everywhere, product surfaces
   still light.
5. Clean up temporary probe output and screenshots.

## Common pitfalls

- Picking a framework default or a one-off icon/illustration color as primary.
- Treating frequency of a hex as importance.
- Emitting a flat color list with no semantic meaning or states.
- Missing a distinct conversion CTA color (nav CTA ≠ signup CTA).
- Treating in-mockup product colors as page chrome.
- Claiming a dark theme exists when the site is light-only.

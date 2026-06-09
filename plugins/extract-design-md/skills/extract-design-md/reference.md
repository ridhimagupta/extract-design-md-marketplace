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

## Motion capture (scripts/motion.mjs)

Capture the **mechanism** of microinteractions, not a recording. A screen
recording shows the look but not the trigger/duration/easing, and pixel→CSS
reconstruction is lossy and janky. `motion.json` gives:

- `inventory`: the KIND of motion the page relies on — `canvas`/`video` counts,
  `runningAnimations` (continuously-running CSS animations) + their
  `topRunningAnimations` names, and `willChange` usage (scroll-linked
  parallax/sticky transforms). **Read this first.** If `scroll` (reveals) is
  empty but `runningAnimations` is high, the site uses *continuous loops + hover*
  — do NOT invent fade-up-on-scroll reveals it doesn't have. High `canvas`/
  `video` means bespoke/scrubbed motion you can only approximate or note.

- `libraries`: which animation engine the site uses. **If a library is detected,
  recommend reproducing with it** (Framer Motion, GSAP/ScrollTrigger, Lottie,
  Rive, AOS, Lenis smooth-scroll) rather than hand-rolling.
- `transitions`: the common `property | duration | timing-function` combos —
  turn the top few into transition tokens (e.g. `--ease-fast: 150ms ease`,
  `--ease-emphasized: 400ms cubic-bezier(...)`).
- `keyframes`: `@keyframes` rules to copy verbatim.
- `hover`: per-element computed-style deltas (`from`→`to` for bg/transform/
  shadow/etc.) plus the driving transition — these become your `:hover` rules.
- `scroll`: elements whose opacity/transform changed after scrolling = reveal or
  parallax. Reproduce reveals with an **IntersectionObserver** that adds an
  `.in-view` class toggling from the captured `from` state to `to`.

### Reliably capturable
Hover/focus color/transform/shadow changes; CSS transition durations + easings;
`@keyframes`; fade/slide-in-on-scroll; sticky/transform-on-scroll; marquees.

### Approximate or out of reach
Spring physics (Framer Motion springs), staggered orchestration, exact bespoke
easing curves, canvas/WebGL/shader animation, and scroll-scrubbed video. Note
these in the DESIGN.md `## Motion` section rather than faking them.

### Sample motion.css shape
```css
:root { --ease-fast: 150ms cubic-bezier(.4,0,.2,1); }
.btn { transition: transform var(--ease-fast), background-color var(--ease-fast); }
.btn:hover { transform: translateY(-1px); }
@keyframes reveal-up { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
.reveal { opacity:0; }
.reveal.in-view { animation: reveal-up 600ms cubic-bezier(.16,1,.3,1) forwards; }
```
With a tiny IntersectionObserver adding `.in-view` on enter.

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

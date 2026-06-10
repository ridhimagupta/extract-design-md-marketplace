<!--
  DESIGN.md TEMPLATE — copy to the target repo as DESIGN.md and replace every
  <PLACEHOLDER>. A scraper records what's there; this file records the
  DECISIONS — so an agent can make NEW screens that feel like they belong.
  Every section pairs VALUES with RULES for applying them.

  Keep the small YAML frontmatter (it powers the showcase renderer + tooling),
  then write the rule-driven body. Token reference syntax: {colors.semantic.text.primary}
  Delete this comment.
-->
---
version: alpha
name: "<Brand> design.md"
intent:
  feels-like: "<2-4 sentences: the personality, e.g. 'A calm, confident tool. Generous whitespace, one idea per screen.'>"
  optimizes-for: "<e.g. 'Scannability for daily-use power users'>"
  reference-points: "<2-3 products it sits near + one it deliberately is NOT>"

# --- Machine-readable tokens (semantic roles only; this is what components consume) ---
colors:
  semantic:
    surface: "#______"            # page background
    surface-raised: "#______"     # cards, modals
    border: "#______"             # hairlines, dividers
    text-primary: "#______"
    text-muted: "#______"         # secondary text, never for actions
    accent: "#______"             # primary actions + active states ONLY
    destructive: "#______"        # irreversible actions only
    # add success/warning/info if the product uses them

typography:
  display: { fontFamily: "<face>", fontSize: <px>, fontWeight: <n>, lineHeight: <n>, letterSpacing: <em> }
  h1:      { fontFamily: "<face>", fontSize: <px>, fontWeight: <n>, lineHeight: <n> }
  h2:      { fontFamily: "<face>", fontSize: <px>, fontWeight: <n>, lineHeight: <n> }
  body:    { fontFamily: "<face>", fontSize: <px>, fontWeight: 400, lineHeight: <n> }
  small:   { fontFamily: "<face>", fontSize: <px>, fontWeight: 400, lineHeight: <n> }
  micro:   { fontFamily: "<face>", fontSize: <px>, fontWeight: <n>, lineHeight: <n> }

spacing: { base: <4px|8px>, within: <px>, related: <px>, groups: <px>, sections: <px> }
rounded: { sm: <px>, md: <px>, lg: <px>, full: 9999px }
motion:
  easing: { standard: "<cubic-bezier(...)>" }
  duration: { fast: "120ms", standard: "200ms", deliberate: "300ms" }
---

# design.md — <Product Name>

> **How to use this spec:** Every section pairs values with rules for applying them. If you (human or agent) find yourself making a visual decision this file doesn't cover, the Design Intent section is the tiebreaker. When in doubt, do less.

## 1. Design Intent
<!-- The part scrapers miss. Every rule below must trace back to this. -->
**Feels like:** <...>
**Optimizes for:** <...>
**Reference points:** <2-3 near + 1 it is NOT>

## 2. Type System
**Faces**
- Display: `<Family>` — used only for <hero / page titles>, never below <size>
- Body: `<Family>`
- Utility (data, captions, code): `<Family or mono>`

| Role | Size / Line height | Weight | Usage rule |
|---|---|---|---|
| Display | <48/1.1> | <650> | One per view, max |
| H1 | <32/1.2> | <600> | Page title only |
| H2 | <24/1.3> | <600> | Section breaks |
| Body | <16/1.6> | <400> | Default for everything |
| Small | <14/1.5> | <400> | Metadata, captions |
| Micro | <12/1.4> | <500> | Labels, eyebrows — uppercase + tracked |

**Rules**
- Headings never exceed weight <600>. Emphasis comes from size and space, not boldness.
- Body text never below <15px>. Letter-spacing: <tight on display, default on body>.
- Max line length: <~65ch>. Text never spans full container width.

## 3. Spacing Logic
**Base unit:** <4px / 8px> — every value is a multiple. No magic numbers.
- Within a component (label → input): <8px>
- Between related elements: <16px>
- Between distinct groups: <24-32px>
- Between page sections: <64-96px>
- Container padding: <24px mobile / 48px desktop>

**Density philosophy:** <e.g. "Air over compression — when crowded, remove an element before shrinking gaps.">

## 4. Color
| Token | Value | Job |
|---|---|---|
| `surface` | #___ | Page background |
| `surface-raised` | #___ | Cards, modals |
| `border` | #___ | Hairlines, dividers |
| `text-primary` | #___ | Default text |
| `text-muted` | #___ | Secondary text, never for actions |
| `accent` | #___ | Primary actions + active states only |
| `destructive` | #___ | Irreversible actions only |

**Rules**
- Accent appears <once> per view. If two things compete for it, neither gets it.
- Never pure black (#000) or pure white (#FFF) — use <near values>.
- Backgrounds shift by <elevation/tint>, not by hue.
- Dark mode: <exists / doesn't>. If it does: <inversion logic, not a second palette>.

## 5. Components
<!-- Anatomy + ALL states. States are where AI output falls apart. -->
**Shared anatomy**
- Radius: <8px standard, 12px cards, full for pills — never mixed within a component>
- Borders: <1px `border` / borderless>
- Shadow philosophy: <e.g. "Nearly invisible. Depth comes from borders and background shifts.">

**Button** — Default / Hover <bg darkens 6%> / Active <scale 0.98> / Focus <2px accent ring, 2px offset> / Disabled <40% opacity, no pointer> / Loading <spinner replaces label, width locked>
**Input** — Default / Focus / Error <border destructive + message below, never placeholder-only> / Disabled
**Card** — padding, hover (if interactive), and what NEVER goes in one
**Empty states** — every list/table has one: <icon? one-line explanation + primary action>

## 6. Motion
**Philosophy:** <e.g. "Motion explains, never decorates. If you'd notice the animation before the content, it's too much.">
- Fast (hovers, toggles): <120ms ease-out>
- Standard (reveals, dropdowns): <200ms ease-out>
- Deliberate (modals, transitions): <300ms cubic-bezier(0.32,0.72,0,1)>
- Never exceed <400ms>. Never bounce/spring unless <playful — see Intent>.

**Choreography**
- Elements enter from where they belong (dropdowns scale from trigger, toasts slide from edge).
- Stagger lists at <30ms>/item, max <6>. Exits faster than entrances (~70%).
- One orchestrated moment per view, max. Always respect `prefers-reduced-motion`.

<!-- If captured from a live site (motion.json), record the real inventory:
     animation libraries, looping animations, and whether it uses scroll-reveals.
     Do NOT invent reveals a site doesn't have. -->

## 7. Illustration & Imagery
**Style:** <e.g. "Flat 2px-stroke line illustrations in `text-muted`, single accent fill. No 3D, no stock photography.">
**Where it appears:** <empty states, onboarding> — and never: <data views, settings>
**Iconography:** set <Lucide / custom>, stroke <1.5px>, <20px> default; <paired with labels / standalone in toolbars only>; never mix filled + stroked in one view.
**Photography (if used):** <treatment — duotone? crop ratio? real people vs abstract?>

## 8. Voice in the Interface
- Buttons say what happens: "Save changes," not "Submit".
- Sentence case everywhere except <micro labels>.
- Errors state what went wrong + how to fix it. No apologies, no vagueness.
- Empty states invite action, they don't just announce absence.

## 9. Never Do
<!-- Prohibitions constrain an agent more effectively than examples. Be specific. -->
- No gradients <except: ___>
- No center-aligned body text
- No more than <2> font weights per view
- No drop shadows above <token>
- No animation on page load / scroll except <the one signature moment>
- Never introduce a color outside the semantic palette
- <3-5 prohibitions specific to this product>

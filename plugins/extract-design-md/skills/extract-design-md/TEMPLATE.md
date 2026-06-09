<!--
  DESIGN.md TEMPLATE — copy this to the target repo as DESIGN.md and replace
  every <PLACEHOLDER>. Keep the two-tier color structure. Delete this comment.
  Token reference syntax used in prose + components: {colors.semantic.text.primary}
-->
---
version: alpha
name: <Brand>-design-analysis
description: <2-5 sentence summary: the canvas, the primary action color/shape, the secondary + conversion CTAs, where accents/decorative colors appear, the type system, and the shape language. Name the single most recognizable visual move.>

colors:
  primitive:
    neutral:
      0: "#ffffff"
      50: "#<...>"
      100: "#<...>"
      200: "#<...>"
      300: "#<...>"
      400: "#<...>"
      500: "#<...>"
      600: "#<...>"
      700: "#<...>"
      800: "#<...>"
      900: "#000000"
    # Add one block per brand hue actually used (green/blue/brand/etc.).
    <hue>:
      50: "#<...>"   # soft / tint
      500: "#<...>"  # base
      600: "#<...>"  # hover / active
    # Optional dark-surface primitives (only if you add a dark theme):
    dark:
      ink: "#<...>"
      surface-1: "#<...>"
      surface-2: "#<...>"
      border: "#<...>"
  semantic:
    background:
      primary: "{colors.primitive.neutral.0}"
      secondary: "{colors.primitive.<...>}"
      tertiary: "{colors.primitive.neutral.100}"
      inverse: "{colors.primitive.neutral.900}"
    text:
      primary: "{colors.primitive.neutral.800}"
      secondary: "{colors.primitive.neutral.700}"
      muted: "{colors.primitive.neutral.500}"
      inverse: "{colors.primitive.neutral.0}"
      link: "{colors.primitive.<...>}"
    border:
      subtle: "{colors.primitive.neutral.200}"
      default: "{colors.primitive.neutral.300}"
      strong: "{colors.primitive.neutral.400}"
    action-primary:
      bg: "{colors.primitive.<...>}"
      text: "{colors.primitive.<...>}"
      hover: "{colors.primitive.<...>}"
    action-secondary:
      bg: "{colors.primitive.<...>}"
      text: "{colors.primitive.<...>}"
      hover: "{colors.primitive.<...>}"
    action-cta:                 # only if the site has a distinct conversion CTA
      bg: "{colors.primitive.<...>}"
      hover: "{colors.primitive.<...>}"
      text: "{colors.primitive.<...>}"
    accent:
      <name>: "{colors.primitive.<...>}"
    feedback:
      success: "{colors.primitive.<...>}"
    product:                    # colors that live inside app mockups, not chrome
      <name>: "{colors.primitive.<...>}"
  semantic-dark:                # OPTIONAL — override only semantic roles
    background:
      primary: "{colors.primitive.dark.ink}"
    text:
      primary: "{colors.primitive.neutral.0}"
    action-primary:
      bg: "{colors.primitive.neutral.0}"
      text: "{colors.primitive.neutral.900}"

typography:
  display-xl:
    fontFamily: "<primary stack>"
    fontSize: <px>
    fontWeight: <n>
    lineHeight: <n>
    letterSpacing: <px>
  # display-lg, display-md, heading-*, title, body-lg, body-md, body-sm,
  # caption, badge, button-md, button-sm, nav-link, mono, and any display/
  # handwriting face actually used.

rounded:
  none: 0px
  sm: <px>
  md: <px>
  lg: <px>
  xl: <px>
  pill: <px>
  full: 9999px

spacing:
  xs: <px>
  sm: <px>
  md: <px>
  base: <px>
  lg: <px>
  xl: <px>
  section: <px>

components:
  # Each component references SEMANTIC roles + typography/rounded/spacing tokens.
  button-primary:
    backgroundColor: "{colors.semantic.action-primary.bg}"
    textColor: "{colors.semantic.action-primary.text}"
    typography: "{typography.button-md}"
    rounded: "{rounded.<...>}"
    padding: <v h>
    height: <px>
  # Add the real components you saw: button-secondary, button-cta, card,
  # input, nav, chip/badge, and any signature element (chat bubble, etc.).
---

## Overview
<What the brand feels like and why. State the action hierarchy explicitly
(primary = X, secondary = Y, conversion CTA = Z), the canvas, the type system,
and the shape language.>

**Key Characteristics:**
- <single most recognizable move>
- <action hierarchy>
- <accent / decorative usage>
- <type at friendly/heavy weights, families>
- <shape language>
- <light/dark note>

## Colors
### Tier 1 — Primitives
<List each scale with hexes and one line on what it carries.>
### Tier 2 — Semantic roles
<background / text / border / action-* / accent / feedback / product, each with
its resolved value and where it is used.>

## Typography
### Font Family
<primary + any secondary/display/handwriting face; fallbacks.>
### Hierarchy
<table: token | size | weight | line | tracking | use>
### Principles
<how loud/quiet type is; what carries hierarchy.>

## Layout
<spacing base unit + tokens; container max width; grid; whitespace philosophy.>

## Elevation
<shadow tiers (or flat); how depth is achieved.>

## Components
<each component: surface, text, radius, padding, states, and where it appears.>

## Motion
<OPTIONAL — fill from motion.json. Document: animation libraries in use; the
transition tokens (common durations + easings, e.g. 150ms ease, 400ms
cubic-bezier(...)); hover/focus specs per component (what changes + the
transition); scroll-reveal patterns (fade/slide-in from opacity/transform
from→to, trigger = on enter viewport); and any signature keyframes. Recommend an
implementation: CSS transitions + IntersectionObserver for reveals, or the
detected library (Framer Motion / GSAP) for complex orchestration. Note what is
approximate (springs, WebGL, scroll-scrubbing).>

## Responsive Behavior
<breakpoints table + key changes; touch targets.>

## Known Gaps
<everything NOT observed: hover states, dark mode, deep in-app UI, error states,
bespoke assets. If you added a dark theme the site lacks, say so here.>

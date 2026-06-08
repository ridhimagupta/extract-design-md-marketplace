# design-md-marketplace

A Claude Code plugin marketplace for capturing and reusing website design systems.

## Plugins

### `extract-design-md`

Extract any website's visual language into a portable **`DESIGN.md`** — a
token-driven design system (two-tier color tokens, typography, spacing, radius,
elevation, and components) plus explanatory prose — that any coding agent can
use to build on-brand UI.

It works by probing the **rendered** page (real computed styles + screenshots
via headless Chrome), not the raw CSS, so it doesn't get fooled by the hundreds
of unused palette variables that UI frameworks (Mantine, Tailwind, Bootstrap,
MUI) ship.

## Install

```bash
/plugin marketplace add ridhimagupta/extract-design-md-marketplace
/plugin install extract-design-md@design-md-marketplace
```

Then ask Claude, e.g.:

> Extract the design system from https://example.com into a DESIGN.md

## Requirements

- **Node.js 18+** (on Node ≥ 21 the `--experimental-websocket` flag is optional).
- A **Chromium-based browser** installed (Google Chrome, Chromium, or Edge).
  Override the binary with `CHROME=/path/to/browser`.

> Note: the bundled `scripts/probe.mjs` launches a local headless browser and
> navigates to the URL you provide in order to read its computed styles and take
> screenshots. It only visits the site you ask it to analyze.

## What you get

The generated `DESIGN.md` has:

- **Two-tier color tokens** — primitive hue scales feeding semantic roles
  (`background.*`, `text.*`, `border.*`, `action-primary/secondary/cta.*`,
  `accent.*`, `feedback.*`, `product.*`), with an optional dark-theme override.
- **Typography, spacing, radius, elevation** scales.
- **Components** that reference semantic roles.
- Prose: Overview, Colors, Typography, Layout, Elevation, Components,
  Responsive Behavior, and an honest **Known Gaps** section.

Drop the file into any repo and tell your agent to "use DESIGN.md for UI work."

## Layout

```
.claude-plugin/marketplace.json        # marketplace registry
plugins/extract-design-md/
├── .claude-plugin/plugin.json         # plugin manifest
└── skills/extract-design-md/
    ├── SKILL.md                       # main workflow
    ├── TEMPLATE.md                    # DESIGN.md structure to fill in
    ├── reference.md                   # mapping heuristics & pitfalls
    └── scripts/probe.mjs              # extracts computed styles + screenshots
```

## License

MIT

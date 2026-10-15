---
name: Weir.
description: Pixel cutaway town. Money drawn as coins in a pipe under a labelled street.
colors:
  ink: "#0a0b11"
  paper: "#f8f8f8"
  surface: "#ffffff"
  sky: "#56c7f8"
  yellow: "#f7c751"
  yellow-hover: "#ffd978"
  yellow-pressed: "#e8b53a"
  brick: "#b8402a"
  grass: "#4f8f3a"
  soil: "#4c2c24"
  sign: "#f8f7ee"
  wood: "#f6cb87"
  muted: "#4a5160"
  border: "#d7dce3"
  subtle: "#eef3f7"
  highlight: "#e6f4fd"
  error: "#a02f22"
  error-bg: "#fff1eb"
  pending: "#3e487b"
  pending-bg: "#edf0f9"
typography:
  display:
    fontFamily: "Press Start 2P, Pixelify Sans, monospace"
    fontSize: "2.6cqw"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0"
  headline:
    fontFamily: "Press Start 2P, Pixelify Sans, monospace"
    fontSize: "1.9rem"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "0"
  title:
    fontFamily: "Press Start 2P, Pixelify Sans, monospace"
    fontSize: "1.05rem"
    fontWeight: 400
    lineHeight: 1.4
  subtitle:
    fontFamily: "Press Start 2P, Pixelify Sans, monospace"
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Alef, Avenir Next, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  small:
    fontFamily: "Alef, Avenir Next, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  control:
    fontFamily: "Atkinson Hyperlegible, Alef, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 700
    lineHeight: 1.4
  numeral:
    fontFamily: "Atkinson Hyperlegible, Alef, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.2
rounded:
  none: "0px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  6: "24px"
  8: "32px"
  12: "48px"
  16: "64px"
components:
  button-primary:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "10px 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.yellow-hover}"
  button-primary-active:
    backgroundColor: "{colors.yellow-pressed}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "10px 18px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.highlight}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "11px 12px"
  form-surface:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.none}"
    padding: "32px"
  sign:
    backgroundColor: "{colors.sign}"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
    rounded: "{rounded.none}"
  token-option-selected:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    padding: "12px 14px"
---

# Design System: Weir.

## Overview

**Creative North Star: "The Town With Its Walls Off"**

Weir. is an 8-bit cutaway town: client's house, reviewers' hall, a lit door, the freelancer's studio, and under the pavement a pipe of coins. Every object wears a sign or a tiny label with a one-pixel pointer, so the scene explains itself without a feature grid. Product pages below are plain paper: pixel lettering only at display size (page titles, the town’s signs), a clear bold humanist face for every control, nav link, badge and section heading, a smooth sans for reading, hyperlegible numerals for money. Nothing in the pixel face is set under about 24px. Yellow marks the thing to press; brick marks current page and focus. It rejects the split hero, the cream-serif default, soft shadows and rounded cards.

**Key Characteristics:**
- Pixel plates (`assets/plates/*.png`, `image-rendering: pixelated`) with provenance sidecars
- Pixel-bevel controls: 2px ink border, inset light/shade, no shadow, no radius
- One motion: coins step along the pipe; nothing else moves

## Colors

A paper sky and a small pixel palette; yellow is rare and always actionable.

### Primary
- **School-bus Yellow** (`yellow`): primary button, Connect wallet, selected options, coins. Lighter on hover, darker pressed.
- **Ink** (`ink`): all text, every border, pressed tabs, the active mobile dot.

### Secondary
- **Brick** (`brick`): brand period, current-nav underline, focus outline, the pause valve. Never a fill.

### Neutral
**Paper** page; **Surface** panels, inputs, secondary buttons; **Sign** / **Wood** town plates (wood for money); **Muted** helpers; **Border** hairlines, idle dots; **Highlight** notices, secondary hover; **Subtle** disabled fills; **Error / Pending** status tints, always also in words.

### Named Rules
**The One Yellow Rule.** Yellow is only a thing you can press or a coin.
**The Ink Border Rule.** Edges are drawn in ink (2px on pages, 0.13–0.26cqw in the town), never implied by shadow.

## Typography

**Display Font:** Press Start 2P, self-hosted (Pixelify Sans, monospace fallbacks); display sizes only (≥ ~24px): the headline, the building signs, page `h1`, the step labels.

**Control and heading Font:** Atkinson Hyperlegible 700 for buttons, nav links, badges, small labels in the town, `h2` (1.35rem) and `h3` (1.1rem).
**Body Font:** Alef (Avenir Next, system-ui)
**Numeral Font:** Atkinson Hyperlegible, `tabular-nums slashed-zero`


### Hierarchy
- **Display** (400, 2.6cqw, lh 1): the town headline; about 40px at 1536.
- **Headline** (400, 1.9rem, lh 1.25; 2rem on phones): page `h1`, mobile town copy.
- **Title** (400, 1.05rem, lh 1.4): `h2`; **Subtitle** (0.85rem): `h3`.
- **Body** (400, 1rem, lh 1.55, max 72ch). **Small** (0.875rem): helpers, tables, page nav, footer.
- **Control** (Atkinson 700, 0.95rem, lh 1.4): buttons, nav links, badges; mobile nav 0.9rem. Never the pixel face below display size: at 12–16px its 5/S and C/O collapse.
- **Town signs/labels**: 1.3–1.6cqw uppercase; labels 0.68–1.0cqw.

### Named Rules
**The No-Faux-Bold Rule.** Press Start 2P ships one weight; headings and controls are 400, letter-spacing 0.
**The Numerals Rule.** Amounts never render in the pixel face.

## Layout

Product pages: centred column `min(1120px, 100% - 64px)` (32px gutters below 640px), the 4px `spacing` scale, 1px section rules, two-column grids collapsing at 640px. The town is a 1536×1024 frame (`aspect-ratio`, `container-type: inline-size`); every box is a percentage measured from the approved comp. Breakpoints: **900px** (town becomes a strip), **640px** (single column).

Phones (≤900px): the town's chrome and copy hide; a pixel top bar (2px ink rule) and scrolling pixel nav, headline and body as text, then the scene as a **1100px pannable strip** (513px tall, `scroll-snap-type: x proximity`), three 10px square dots (ink when current) and a full-width yellow Start a stream button.

## Elevation & Depth

No drop shadows. Depth is a pixel bevel: 2px ink border, `inset -2px -2px` shade, `inset 2px 2px` light (yellow: `#c98f00` / `#ffe08a`; white: `border` / white). Pressing shifts the control 1px down-right. The town layers plates by z-order.

**The Flat-Pixel Rule.** No shadow that leaves the box; no blur; no gradient.

## Shapes

Square corners wherever the world has landed; 1px ink pointer rules rotated 18–35°; rect-only pixel SVGs with `shape-rendering: crispEdges`. The two-arch mark is never redrawn.

## Components

### Buttons
Square, 2px ink border, min-height 44px. **Primary:** yellow fill and bevel; hover lighter; active darker plus 1px translate. **Secondary:** white, grey/white bevel, hover highlight. **Danger:** error text and border. **Text button:** underlined, no border. **Disabled:** subtle fill, muted text.

### Signs and labels (signature)
**Sign:** `sign` plate, 0.2cqw ink border, uppercase pixel text; money signs on `wood`. **Label:** 0.13cqw border, name over figure; figures are stream #1's live numbers, else "(example)". **Pointer caption:** bare pixel text with a 1px rotated rule.

### Token picker / chips
Square secondary buttons in a 120px auto-fit grid; selected is yellow. Pressed tabs invert to ink.

### Cards / Containers
**Form surface:** white, 2px ink border, square, 32px padding (24/20 on phones). **Terms box:** same, 16px, 72ch.

### Inputs / Fields
White, 1px ink border, 11×12px padding, 1rem Alef; 0.875rem label above, muted helper below. Focus: 2px brick outline, 4px offset.

### Coin pipe (signature motion)
Under `prefers-reduced-motion: no-preference` the coin row advances `translateX(0 → 5.2%)` in `steps(8, end)` over 4s, looping. Nothing else animates (buttons keep a 120ms colour transition).

## Do's and Don'ts

### Do:
- **Do** draw every control as a pixel bevel: 2px ink border, inset light/shade, square corners.
- **Do** set amounts in Atkinson Hyperlegible, tabular slashed-zero.
- **Do** say reviewers, deposit, terms, per day, settle, paused, closed.

### Don't:
- **Don't** add drop shadows, blur, gradients or anti-aliased plate scaling.
- **Don't** write oracle, hash, URI, attestation, bps, tier or rate per second outside a Details disclosure.
- **Don't** ease or fade; motion is `steps()` under `prefers-reduced-motion: no-preference` only.

**Not yet unified.** Older swarm components still carry the superseded theme: 7px input radius; 8–20px radii on `.eligibility`, `.notice`, `.stream-metrics`, `.badge`, `.dialog`; the dialog's `0 24px 80px` shadow; green `::selection` and `.flow-art`; `theme-color #f7f7f2`. Drift to repair, not rules.
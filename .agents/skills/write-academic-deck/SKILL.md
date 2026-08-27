---
name: write-academic-deck
description: Create or rewrite academic HTML presentations for this impressive.js project. Use when asked to draft a scholarly deck, paper-like presentation, lecture deck, research talk, or conference slides that should use the local academia-light theme and arrange slides as a flat, gapless, multi-column sheet.
---

# Write Academic Deck

Create a semantic HTML deck whose slides form one continuous flat sheet. Keep the presentation restrained, readable, and easy to edit.

## Inspect the project

Read `impressive.css`, `impressive-academia-light.css`, `impressive.js`, and the target HTML before editing. Preserve existing controls, annotation markup, licensing headers, and unrelated user changes.

Use these local assets in this order:

```html
<link rel="stylesheet" href="impressive.css">
<link rel="stylesheet" href="impressive-academia-light.css">
<script src="impressive.js" defer></script>
```

## Compose the argument

Structure the deck like a short academic paper: title and claim, background, method or approach, evidence, limitations, and conclusion. Adapt this sequence to the supplied material instead of forcing empty sections.

Use semantic elements already covered by the theme: headings, paragraphs, lists, `blockquote`, `figure`, `figcaption`, `table`, `pre`, `code`, `details`, and form elements when relevant. Keep one principal idea per slide. Never invent sources, quotations, measurements, or findings; label placeholders and illustrative data clearly.

## Lay out one flat sheet

Use the core slide dimensions without overriding them:

- Width: `1200px`
- Height: `675px`

Arrange slides in column-major order and use at least two columns. Fill each column from top to bottom, then continue at the top of the next column.

Set coordinates by this exact grid:

```text
x = column * 1200
y = row * 675
```

Adjacent slide edges must touch. Do not add gutters or padding to the coordinate grid. Theme padding inside each slide is allowed.

For six slides with three rows per column, use:

```html
<section class="step" data-x="0"    data-y="0">...</section>
<section class="step" data-x="0"    data-y="675">...</section>
<section class="step" data-x="0"    data-y="1350">...</section>
<section class="step" data-x="1200" data-y="0">...</section>
<section class="step" data-x="1200" data-y="675">...</section>
<section class="step" data-x="1200" data-y="1350">...</section>
```

Keep every slide on the same plane:

- Do not emit `data-z`.
- Do not emit `data-rotate`, `data-rotate-x`, `data-rotate-y`, or `data-rotate-z`.
- Do not emit `data-scale`; use the default scale of `1`.
- Do not add slide-specific transforms in CSS.

Choose a rectangular grid appropriate to the slide count. Prefer three or four rows per column for medium decks, while ensuring at least two populated columns. Keep DOM order identical to the intended navigation order.

## Preserve presentation controls

Keep controls and annotations as explicit HTML after the slides:

```html
<nav class="impressive-controls" aria-label="Presentation controls">
  <button type="button" data-prev aria-label="Previous slide">←</button>
  <output class="impressive-progress" aria-label="Slide progress" aria-live="polite"></output>
  <button type="button" data-next aria-label="Next slide">→</button>
</nav>

<div class="impressive-annotations" role="toolbar" aria-label="Slide annotations">
  <button type="button" data-annotation="off" aria-pressed="true">Pointer</button>
  <button type="button" data-annotation="pen" aria-pressed="false">Pen</button>
  <button type="button" data-annotation="eraser" aria-pressed="false">Eraser</button>
  <button type="button" data-annotation="clear">Clear</button>
</div>
```

Add an overview marker only when it helps the requested narrative. Place it after the slides it should summarize.

## Verify the deck

Before finishing:

1. Confirm every `.step` has a unique `id` and numeric `data-x` and `data-y`.
2. Confirm there are at least two distinct `data-x` values.
3. Confirm all x coordinates are multiples of `1200` and all y coordinates are multiples of `675`.
4. Confirm no step has Z, rotation, scale, or inline transform settings.
5. Run `git diff --check` and `node --check impressive.js` when JavaScript is in scope.
6. Open the deck in a browser and verify navigation, page count, overflow, overview scope if present, and console errors.
7. Report what was verified and leave changes uncommitted unless the user requests a commit.

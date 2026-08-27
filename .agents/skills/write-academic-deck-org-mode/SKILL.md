---
name: write-academic-deck-org-mode
description: Create or rewrite academic presentations as Org mode source for this project's ox-impressive.el exporter. Use when asked for a scholarly deck, research talk, conference presentation, lecture slides, or paper-like presentation authored in .org format and arranged as a flat, gapless, multi-column sheet with the academia-light theme.
---

# Write Academic Deck in Org Mode

Create an editable Org document and export it through `ox-impressive.el` to a self-contained impressive.js presentation.

## Inspect the project

Read `ox-impressive.el`, `impressive.css`, `impressive-academia-light.css`, and `impressive.js` before editing. Read the target Org file when one exists. Preserve licensing headers and unrelated user changes.

## Configure the document

Start the Org file with local asset names so the exporter embeds them:

```org
#+TITLE: Research title
#+LANGUAGE: en
#+OPTIONS: toc:nil num:nil
#+IMPRESSIVE_CSS: impressive.css
#+IMPRESSIVE_THEME: impressive-academia-light.css
#+IMPRESSIVE_SCRIPT: impressive.js
#+IMPRESSIVE_CONTROLS: t
```

Resolve asset paths relative to the Org file or the directory containing `ox-impressive.el`. Do not add external stylesheet or script tags to exported HTML.

## Compose the argument

Structure the deck like a short academic paper: title and claim, background, method or approach, evidence, limitations, and conclusion. Adapt the sequence to the supplied material. Keep one principal idea in each top-level headline.

Use ordinary Org markup so the standard HTML backend produces semantic HTML:

- Nested headlines for subsections within a slide
- Lists and description lists for structured claims
- Org tables for compact evidence
- `#+begin_quote` blocks for sourced quotations
- `#+begin_src` blocks for code
- Links, emphasis, footnotes, and captions where relevant

Never invent sources, quotations, measurements, or findings. Mark placeholders and illustrative values explicitly.

## Map headlines to a flat sheet

Every top-level headline becomes a slide. Give it a stable `CUSTOM_ID` and only `IMPRESSIVE_X` and `IMPRESSIVE_Y` geometry properties.

Use the unmodified core dimensions:

- Width: `1200px`
- Height: `675px`

Arrange slides in column-major order with at least two populated columns. Fill each column from top to bottom, then continue at the top of the next column.

Set the property values by this exact grid:

```text
IMPRESSIVE_X = column * 1200
IMPRESSIVE_Y = row * 675
```

Adjacent slide edges must touch. Do not add coordinate gutters. Prefer three or four rows per column for medium decks.

For six slides with three rows per column, use:

```org
* Title
:PROPERTIES:
:CUSTOM_ID: title
:IMPRESSIVE_X: 0
:IMPRESSIVE_Y: 0
:END:

* Background
:PROPERTIES:
:CUSTOM_ID: background
:IMPRESSIVE_X: 0
:IMPRESSIVE_Y: 675
:END:

* Question
:PROPERTIES:
:CUSTOM_ID: question
:IMPRESSIVE_X: 0
:IMPRESSIVE_Y: 1350
:END:

* Method
:PROPERTIES:
:CUSTOM_ID: method
:IMPRESSIVE_X: 1200
:IMPRESSIVE_Y: 0
:END:

* Evidence
:PROPERTIES:
:CUSTOM_ID: evidence
:IMPRESSIVE_X: 1200
:IMPRESSIVE_Y: 675
:END:

* Conclusion
:PROPERTIES:
:CUSTOM_ID: conclusion
:IMPRESSIVE_X: 1200
:IMPRESSIVE_Y: 1350
:END:
```

Do not use these properties on slides:

- `IMPRESSIVE_Z`
- `IMPRESSIVE_ROTATE`
- `IMPRESSIVE_ROTATE_X`
- `IMPRESSIVE_ROTATE_Y`
- `IMPRESSIVE_ROTATE_Z`
- `IMPRESSIVE_SCALE`

Do not add slide-specific transforms through `IMPRESSIVE_CLASS` or custom CSS.

Keep top-level headline order identical to the intended navigation order. Add a top-level overview marker only when it helps the narrative:

```org
* Overview
:PROPERTIES:
:CUSTOM_ID: overview
:IMPRESSIVE_OVERVIEW: t
:END:
```

Place the marker after the slides it should summarize. Do not assign geometry to it.

## Export

Load the exporter interactively and use `C-c C-e I h`, or export from the project root in batch mode:

```sh
emacs -Q --batch -L . -l ox-impressive.el deck.org \
  -f org-impressive-export-to-html
```

The exported HTML must contain embedded structural CSS, academia-light theme CSS, JavaScript, presentation controls, and annotation controls.

## Verify the source and output

Before finishing:

1. Confirm every slide has a unique `CUSTOM_ID` and numeric X and Y properties.
2. Confirm there are at least two distinct X values.
3. Confirm every X value is a multiple of `1200` and every Y value is a multiple of `675`.
4. Confirm forbidden Z, rotation, and scale properties are absent.
5. Export the real Org file and inspect the generated HTML rather than trusting the source template.
6. Confirm the HTML has one `.step` per slide and that generated `<section>` tags have no `data-z`, `data-rotate*`, or `data-scale` attributes. Do not search the whole file for these strings because the embedded compatibility CSS and JavaScript mention them.
7. Confirm CSS and JavaScript are embedded and the academia-light variables occur in the output.
8. Open the HTML in a browser and verify navigation, page count, overflow, overview scope if present, and console errors.
9. Run `git diff --check` and report the exact export and browser checks performed.
10. Leave changes uncommitted unless the user requests a commit.

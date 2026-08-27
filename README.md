# impressive.js

`impressive.css` and `impressive.js` turn ordinary HTML sections into a camera-driven 3D presentation. Slide positions and rotations live in `data-*` attributes, so a deck does not need slide-specific CSS. Visual themes are separate from the presentation engine.

## Quick start

Place `impressive.css`, `impressive.js`, and any optional theme beside your HTML file, then use this structure:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My presentation</title>
  <link rel="stylesheet" href="impressive.css">
  <link rel="stylesheet" href="impressive-academia-light.css">
</head>
<body>
  <div class="impressive">
    <section id="intro" class="step" data-x="0" data-y="0">
      <h1>Hello</h1>
    </section>

    <section
      id="details"
      class="step"
      data-x="1400"
      data-y="200"
      data-z="-500"
      data-rotate-y="20"
      data-rotate-z="5"
      data-scale="0.9">
      <h2>Position slides in 3D</h2>
    </section>

    <nav class="impressive-controls" aria-label="Presentation controls">
      <button type="button" data-prev aria-label="Previous slide">←</button>
      <button type="button" data-next aria-label="Next slide">→</button>
    </nav>
  </div>

  <script src="impressive.js"></script>
</body>
</html>
```

Load a theme after `impressive.css` so that its visual rules can override the
structural defaults. Load the script after the presentation markup. The script
initializes the first slide, or the slide named by the URL hash.

See [`example.html`](example.html) for a complete deck.

## Slide attributes

Every slide must be a direct child of `.impressive` and have the `step` class. An `id` is recommended because it provides a bookmarkable URL hash. No camera wrapper is required.

| Attribute | Meaning | Default |
| --- | --- | ---: |
| `data-x` | Horizontal position in pixels | `0` |
| `data-y` | Vertical position in pixels | `0` |
| `data-z` | Depth in pixels | `0` |
| `data-rotate-x` | Rotation around the X axis in degrees | `0` |
| `data-rotate-y` | Rotation around the Y axis in degrees | `0` |
| `data-rotate-z` | Rotation around the Z axis in degrees | `0` |
| `data-rotate` | Shorthand fallback for `data-rotate-z` | `0` |
| `data-scale` | Slide scale as a unitless number | `1` |

`data-rotate-z` takes precedence over `data-rotate` when both are present. Focused slides are displayed front-on even when their world position is rotated.

Slides are visited in DOM order.

## Navigation

The built-in keyboard controls are:

- Next: Right Arrow, Page Down, or Space
- Previous: Left Arrow or Page Up
- First slide: Home
- Last item: End

Buttons inside `.impressive` with `data-prev` or `data-next` receive the same previous and next behavior. Navigation updates the URL hash without adding a browser-history entry.

## Overview markers

Insert an overview marker among the slides to add a zoomed-out view of all preceding slides:

```html
<section id="one" class="step" data-x="0" data-y="0">...</section>
<section id="two" class="step" data-x="1400" data-y="0">...</section>

<div id="overview" class="overview"></div>

<section id="three" class="step" data-x="2800" data-y="0">...</section>
```

An overview participates in navigation according to its position in the DOM. Give it an `id` so it can be linked directly.

## Customization

The core stylesheet does not choose a font, color palette, type scale, or
control appearance. Add those choices in a separate stylesheet after loading
`impressive.css`.

### Academia light theme

The included `impressive-academia-light.css` theme provides a restrained
academic appearance:

- a warm, low-contrast light canvas;
- dark charcoal text and a serif font stack;
- generous slide margins and a conventional type hierarchy;
- slightly translucent slide surfaces; and
- no borders, rounded corners, or shadows.

Load it after the core stylesheet:

```html
<link rel="stylesheet" href="impressive.css">
<link rel="stylesheet" href="impressive-academia-light.css">
```

Add deck-specific overrides after the theme. For example:

```css
body {
  background: white;
  color: black;
}

.step {
  background: rgb(255 255 255 / 92%);
}

.step h1 {
  font-size: 4.5rem;
}
```

Motion can still be configured with `--impressive-duration` and
`--impressive-ease`. The default slide canvas is `1200 × 675` pixels. The
JavaScript overview and viewport fallback calculations use those dimensions
too, so changing `--impressive-slide-width` or
`--impressive-slide-height` also requires updating the corresponding `W`, `H`,
and fallback fit values in `impressive.js`.

You can also add deck-specific typography and component styles with ordinary selectors:

```css
.step.callout {
  background: #30204d;
}
```

## Browser notes

The presentation targets modern browsers with CSS 3D transforms and `:has()` support. `impressive.js` supplies compatibility values when typed CSS `attr()` or viewport arithmetic is unavailable. Reduced-motion preferences disable slide and camera transitions.

## Files

- `impressive.css` owns 3D layout, transforms, transitions, and minimal structural styling.
- `impressive-academia-light.css` is an optional light academic theme.
- `impressive.js` handles navigation, camera state, overview framing, URL hashes, and CSS compatibility values.
- `example.html` demonstrates a complete presentation using the academia light theme.

## License

`SPDX-License-Identifier: 0BSD`

Zero-Clause BSD:

> Permission to use, copy, modify, and/or distribute this software for any
> purpose with or without fee is hereby granted.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
> WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
> MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
> SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
> WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
> OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
> CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

# impressive.js

`impressive.css` and `impressive.js` turn ordinary HTML sections into a camera-driven 3D presentation. Slide positions and rotations live in `data-*` attributes, so a deck does not need slide-specific CSS.

## Quick start

Place `impressive.css` and `impressive.js` beside your HTML file, then use this structure:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My presentation</title>
  <link rel="stylesheet" href="impressive.css">
</head>
<body>
  <div class="impress">
    <div class="impress-camera">
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
    </div>

    <nav class="impress-controls" aria-label="Presentation controls">
      <button type="button" data-prev aria-label="Previous slide">←</button>
      <button type="button" data-next aria-label="Next slide">→</button>
    </nav>
  </div>

  <script src="impressive.js"></script>
</body>
</html>
```

Load the script after the presentation markup. The script initializes the first slide, or the slide named by the URL hash.

See [`example.html`](example.html) for a complete deck.

## Slide attributes

Every slide must have the `step` class. An `id` is recommended because it provides a bookmarkable URL hash.

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

Buttons inside `.impress` with `data-prev` or `data-next` receive the same previous and next behavior. Navigation updates the URL hash without adding a browser-history entry.

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

Override the default custom properties after loading `impressive.css`:

```css
:root {
  --impress-duration: 500ms;
  --impress-ease: ease-in-out;
  --impress-bg: #171225;
  --impress-text: #fff;
  --impress-muted: #c8bddb;
  --impress-accent: #ff8bd8;
  --impress-border: rgb(255 255 255 / 18%);
}
```

The default slide canvas is `1200 × 675` pixels. The JavaScript overview and viewport fallback calculations use those dimensions too, so changing `--impress-slide-width` or `--impress-slide-height` also requires updating the corresponding `W`, `H`, and fallback fit values in `impressive.js`.

You can add deck-specific typography and component styles with ordinary selectors:

```css
.step h1 {
  font-size: 80px;
}

.step.callout {
  background: #30204d;
}
```

## Browser notes

The presentation targets modern browsers with CSS 3D transforms and `:has()` support. `impressive.js` supplies compatibility values when typed CSS `attr()` or viewport arithmetic is unavailable. Reduced-motion preferences disable slide and camera transitions.

## Files

- `impressive.css` owns layout, transforms, transitions, and default presentation styling.
- `impressive.js` handles navigation, camera state, overview framing, URL hashes, and CSS compatibility values.
- `example.html` demonstrates a complete presentation.

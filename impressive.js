/*
 * SPDX-License-Identifier: 0BSD
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
 * OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
 * CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

(() => {
  "use strict";

  const init = () => {
    const root = document.querySelector(".impressive");
    if (!root) return;

    const items = [...root.querySelectorAll(".step, .overview")];
    if (!items.length) return;

    const steps = items.filter(x => x.classList.contains("step"));
    const val = (s, k, d = 0) => Number(s.dataset[k] ?? d);
    const pose = s => {
      const scale = val(s, "scale", 1);
      return {
        x: `${val(s, "x")}px`,
        y: `${val(s, "y")}px`,
        z: `${val(s, "z")}px`,
        rx: `${val(s, "rotateX")}deg`,
        ry: `${val(s, "rotateY")}deg`,
        rz: `${val(s, "rotateZ", val(s, "rotate"))}deg`,
        s: scale
      };
    };
    const setVars = (element, prefix, values) =>
      Object.entries(values).forEach(([key, value]) =>
        element.style.setProperty(`${prefix}${key}`, value));
    const interactive = target => target instanceof Element && target.closest(
      "button, a, input, textarea, select, [contenteditable]"
    );
    const keyDirection = {
      ArrowRight: 1, PageDown: 1, " ": 1,
      ArrowLeft: -1, PageUp: -1
    };
    let current = items[0];

    const annotationControls = root.querySelector(".impressive-annotations");
    const toolButtons = annotationControls
      ? [...annotationControls.querySelectorAll("[aria-pressed]")]
      : [];
    const clearButton = annotationControls?.querySelector(
      '[data-annotation="clear"]'
    );
    const canvases = new Map();
    let annotationTool = "off";
    let stroke = null;
    let swipe = null;

    const activeStep = () =>
      current.classList.contains("step") ? current : null;

    const setAnnotationTool = tool => {
      annotationTool = tool;
      root.dataset.annotationTool = tool;
      for (const button of toolButtons) {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.annotation === tool)
        );
      }
    };

    if (annotationControls) {
      for (const step of steps) {
        const canvas = document.createElement("canvas");
        canvas.className = "impressive-annotation";
        canvas.width = step.clientWidth;
        canvas.height = step.clientHeight;
        canvas.setAttribute("aria-hidden", "true");
        step.append(canvas);
        canvases.set(step, canvas);
      }
    }

    const point = (canvas, event) => {
      const box = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - box.left) * canvas.width / box.width,
        y: (event.clientY - box.top) * canvas.height / box.height
      };
    };

    const startStroke = (canvas, event) => {
      const context = canvas.getContext("2d");
      const style = getComputedStyle(root);
      context.globalCompositeOperation =
        annotationTool === "eraser" ? "destination-out" : "source-over";
      context.strokeStyle = style.getPropertyValue("--impressive-ink").trim();
      context.lineWidth = Number(style.getPropertyValue(
        `--impressive-${annotationTool === "eraser" ? "eraser" : "pen"}-width`
      ));
      context.lineCap = "round";
      context.lineJoin = "round";

      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      stroke = { id: event.pointerId, canvas, context };
      const p = point(canvas, event);
      context.beginPath();
      context.moveTo(p.x, p.y);
      context.lineTo(p.x + .01, p.y + .01);
      context.stroke();
    };

    const stopStroke = event => {
      if (stroke?.id !== event.pointerId) return false;
      stroke.context.closePath();
      stroke = null;
      return true;
    };

    setAnnotationTool("off");

    /*
     * Firefox 154 compatibility bridge.
     *
     * Modern browsers read slide geometry directly through typed attr()
     * and compute viewport fit with typed arithmetic. If either feature is
     * unavailable, JS only supplies those values as CSS custom properties.
     */
    const typedAttr =
      CSS.supports("width", "attr(data-x px, 0px)") &&
      CSS.supports("--test", "attr(data-scale type(<number>), 1)");

    const typedMath =
      CSS.supports("scale", "calc(100vw / 1px)");

    const syncCompat = () => {
      if (!typedAttr) {
        for (const s of steps) {
          setVars(s, "--", pose(s));
        }
      }

      if (!typedMath) {
        root.style.setProperty(
          "--impressive-fit",
          Math.min(innerWidth / 1200, innerHeight / 675) * .92
        );
      }
    };

    const vars = values => setVars(root, "--camera-", values);

    // Focused slides are always shown front-on:
    // copy their world rotation to the camera state, and CSS applies its inverse.
    const camera = s => {
      const values = pose(s);
      vars({
        ...values,
        ...(!typedMath && { "inv-s": 1 / values.s })
      });
    };

    const overview = marker => {
      const W = 1200, H = 675, pad = 260;
      const shown = items
        .slice(0, items.indexOf(marker))
        .filter(x => x.classList.contains("step"));

      if (!shown.length) return;

      const boxes = shown.map(s => {
        const x = val(s, "x");
        const y = val(s, "y");
        const z = val(s, "z");
        const scale = val(s, "scale", 1);
        const rz = val(s, "rotateZ", val(s, "rotate")) * Math.PI / 180;

        const w = W * scale, h = H * scale;
        const c = Math.abs(Math.cos(rz)), q = Math.abs(Math.sin(rz));
        const dx = (w * c + h * q) / 2;
        const dy = (w * q + h * c) / 2;

        return {
          l: x - dx, r: x + dx,
          t: y - dy, b: y + dy,
          z
        };
      });

      const l = Math.min(...boxes.map(b => b.l));
      const r = Math.max(...boxes.map(b => b.r));
      const t = Math.min(...boxes.map(b => b.t));
      const b = Math.max(...boxes.map(b => b.b));
      const zn = Math.min(...boxes.map(b => b.z));
      const zf = Math.max(...boxes.map(b => b.z));

      const fit = Math.min(innerWidth / W, innerHeight / H) * .92;
      const all = Math.min(
        innerWidth / (r - l + 2 * pad),
        innerHeight / (b - t + 2 * pad + (zf - zn) * .30)
      ) * .88;

      const scale = fit / all;

      vars({
        x: `${(l + r) / 2}px`,
        y: `${(t + b) / 2}px`,
        z: `${(zn + zf) / 2}px`,
        rx: "18deg",
        ry: "-16deg",
        rz: "0deg",
        s: scale,
        ...(!typedMath && { "inv-s": 1 / scale })
      });
    };

    const show = item => {
      current.classList.remove("active");
      current = item;
      current.classList.add("active");
      item.classList.contains("overview") ? overview(item) : camera(item);
      const step = activeStep();
      if (clearButton) clearButton.disabled = !step;
      if (!step) setAnnotationTool("off");
      if (item.id) history.replaceState(null, "", `#${item.id}`);
    };

    const move = d => {
      const i = Math.max(0, Math.min(items.length - 1, items.indexOf(current) + d));
      show(items[i]);
    };

    root.addEventListener("pointerdown", e => {
      const canvas = e.target instanceof Element &&
        e.target.closest(".impressive-annotation");
      if (canvas && !stroke && e.isPrimary &&
          annotationTool !== "off" && e.button === 0) {
        startStroke(canvas, e);
        return;
      }

      if (swipe || !e.isPrimary || e.pointerType !== "touch" ||
          annotationTool !== "off" ||
          interactive(e.target)) return;

      swipe = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });

    root.addEventListener("pointermove", e => {
      if (!stroke || e.pointerId !== stroke.id) return;
      const p = point(stroke.canvas, e);
      stroke.context.lineTo(p.x, p.y);
      stroke.context.stroke();
    });

    root.addEventListener("pointerup", e => {
      if (stopStroke(e)) return;
      if (!swipe || e.pointerId !== swipe.id) return;

      const dx = e.clientX - swipe.x;
      const dy = e.clientY - swipe.y;
      swipe = null;

      if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        move(dx < 0 ? 1 : -1);
        e.preventDefault();
      }
    });

    root.addEventListener("pointercancel", e => {
      stopStroke(e);
      if (swipe?.id === e.pointerId) swipe = null;
    });

    root.addEventListener("click", e => {
      if (e.target.closest("[data-prev]")) move(-1);
      if (e.target.closest("[data-next]")) move(1);

      const annotation = e.target.closest("[data-annotation]");
      if (!annotation) return;

      const action = annotation.dataset.annotation;
      if (action === "clear") {
        const canvas = canvases.get(activeStep());
        canvas?.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      } else {
        setAnnotationTool(action);
      }
    });

    window.addEventListener("keydown", e => {
      if (e.key === "Escape" && annotationTool !== "off") {
        setAnnotationTool("off");
        e.preventDefault();
        return;
      }
      const control = interactive(e.target);
      if (control &&
          (e.key === " " || control.matches(
            "input, textarea, select, [contenteditable]"
          ))) {
        return;
      }
      const direction = keyDirection[e.key];
      if (!direction) return;
      move(direction);
      e.preventDefault();
    });

    window.addEventListener("resize", () => {
      syncCompat();
      if (current.classList.contains("overview")) overview(current);
    });

    syncCompat();
    show(items.find(x => x.id && `#${x.id}` === location.hash) || items[0]);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

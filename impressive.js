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

  const closest = (target, selector) =>
    target instanceof Element ? target.closest(selector) : null;

  const interactive = target => Boolean(closest(
    target,
    "button, a, input, textarea, select, [contenteditable]"
  ));

  const createCamera = (root, items, steps) => {
    const val = (slide, key, fallback = 0) =>
      Number(slide.dataset[key] ?? fallback);
    const pose = slide => {
      const scale = val(slide, "scale", 1);
      return {
        x: `${val(slide, "x")}px`,
        y: `${val(slide, "y")}px`,
        z: `${val(slide, "z")}px`,
        rx: `${val(slide, "rotateX")}deg`,
        ry: `${val(slide, "rotateY")}deg`,
        rz: `${val(slide, "rotateZ", val(slide, "rotate"))}deg`,
        s: scale
      };
    };
    const setVars = (element, prefix, values) =>
      Object.entries(values).forEach(([key, value]) =>
        element.style.setProperty(`${prefix}${key}`, value));

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
    const typedMath = CSS.supports("scale", "calc(100vw / 1px)");

    const syncCompat = () => {
      if (!typedAttr) {
        for (const step of steps) setVars(step, "--", pose(step));
      }

      if (!typedMath) {
        root.style.setProperty(
          "--impressive-fit",
          Math.min(innerWidth / 1200, innerHeight / 675) * .92
        );
      }
    };

    const setCameraVars = values => setVars(root, "--camera-", values);

    // Focused slides are always shown front-on:
    // copy their world rotation to the camera state, and CSS applies its inverse.
    const showStep = step => {
      const values = pose(step);
      setCameraVars({
        ...values,
        ...(!typedMath && { "inv-s": 1 / values.s })
      });
    };

    const showOverview = marker => {
      const W = 1200, H = 675, pad = 260;
      const shown = items
        .slice(0, items.indexOf(marker))
        .filter(item => item.classList.contains("step"));

      if (!shown.length) return;

      const boxes = shown.map(step => {
        const x = val(step, "x");
        const y = val(step, "y");
        const z = val(step, "z");
        const scale = val(step, "scale", 1);
        const rz = val(
          step,
          "rotateZ",
          val(step, "rotate")
        ) * Math.PI / 180;

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

      const l = Math.min(...boxes.map(box => box.l));
      const r = Math.max(...boxes.map(box => box.r));
      const t = Math.min(...boxes.map(box => box.t));
      const b = Math.max(...boxes.map(box => box.b));
      const zn = Math.min(...boxes.map(box => box.z));
      const zf = Math.max(...boxes.map(box => box.z));

      const fit = Math.min(innerWidth / W, innerHeight / H) * .92;
      const all = Math.min(
        innerWidth / (r - l + 2 * pad),
        innerHeight / (b - t + 2 * pad + (zf - zn) * .30)
      ) * .88;
      const scale = fit / all;

      setCameraVars({
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
      item.classList.contains("overview")
        ? showOverview(item)
        : showStep(item);
    };

    const resize = current => {
      syncCompat();
      if (current.classList.contains("overview")) showOverview(current);
    };

    return { resize, show, syncCompat };
  };

  const createAnnotations = (root, steps) => {
    const controls = root.querySelector(".impressive-annotations");
    const toolButtons = controls
      ? [...controls.querySelectorAll("[aria-pressed]")]
      : [];
    const clearButton = controls?.querySelector('[data-annotation="clear"]');
    const canvases = new Map();
    let activeStep = null;
    let tool = "off";
    let stroke = null;

    const setTool = nextTool => {
      tool = nextTool;
      root.dataset.annotationTool = nextTool;
      for (const button of toolButtons) {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.annotation === nextTool)
        );
      }
    };

    if (controls) {
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

    const pointerDown = event => {
      const canvas = closest(event.target, ".impressive-annotation");
      if (!canvas || stroke || !event.isPrimary || tool === "off" ||
          event.button !== 0) return false;

      const context = canvas.getContext("2d");
      const style = getComputedStyle(root);
      context.globalCompositeOperation =
        tool === "eraser" ? "destination-out" : "source-over";
      context.strokeStyle = style.getPropertyValue("--impressive-ink").trim();
      context.lineWidth = Number(style.getPropertyValue(
        `--impressive-${tool === "eraser" ? "eraser" : "pen"}-width`
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
      return true;
    };

    const pointerMove = event => {
      if (!stroke || event.pointerId !== stroke.id) return;
      const p = point(stroke.canvas, event);
      stroke.context.lineTo(p.x, p.y);
      stroke.context.stroke();
    };

    const pointerEnd = event => {
      if (stroke?.id !== event.pointerId) return false;
      stroke.context.closePath();
      stroke = null;
      return true;
    };

    const click = event => {
      const control = closest(event.target, "[data-annotation]");
      if (!control) return;

      const action = control.dataset.annotation;
      if (action === "clear") {
        const canvas = canvases.get(activeStep);
        canvas?.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      } else {
        setTool(action);
      }
    };

    const activate = step => {
      activeStep = step;
      if (clearButton) clearButton.disabled = !step;
      if (!step) setTool("off");
    };

    const escape = () => {
      if (tool === "off") return false;
      setTool("off");
      return true;
    };

    setTool("off");

    return {
      activate,
      click,
      escape,
      isPointerMode: () => tool === "off",
      pointerDown,
      pointerEnd,
      pointerMove
    };
  };

  const createNavigation = (root, items, steps, camera, annotations) => {
    const progress = root.querySelector(".impressive-progress");
    let current = items[0];

    const show = item => {
      current.classList.remove("active");
      current = item;
      current.classList.add("active");
      camera.show(item);

      const step = item.classList.contains("step") ? item : null;
      annotations.activate(step);
      if (progress) {
        const page = step
          ? steps.indexOf(step) + 1
          : items.slice(0, items.indexOf(item))
            .filter(candidate => candidate.classList.contains("step")).length;
        progress.textContent = `${page} / ${steps.length}`;
      }
      if (item.id) history.replaceState(null, "", `#${item.id}`);
    };

    const move = direction => {
      const index = Math.max(0, Math.min(
        items.length - 1,
        items.indexOf(current) + direction
      ));
      show(items[index]);
    };

    const resize = () => camera.resize(current);
    const start = () => {
      camera.syncCompat();
      show(items.find(item =>
        item.id && `#${item.id}` === location.hash
      ) || items[0]);
    };

    return { move, resize, start };
  };

  const bindInput = (root, navigation, annotations) => {
    const keyDirection = {
      ArrowRight: 1, PageDown: 1, " ": 1,
      ArrowLeft: -1, PageUp: -1
    };
    let swipe = null;

    root.addEventListener("pointerdown", event => {
      if (annotations.pointerDown(event)) return;

      if (swipe || !event.isPrimary || event.pointerType !== "touch" ||
          !annotations.isPointerMode() || interactive(event.target)) return;

      swipe = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY
      };
    });

    root.addEventListener("pointermove", annotations.pointerMove);

    root.addEventListener("pointerup", event => {
      if (annotations.pointerEnd(event)) return;
      if (!swipe || event.pointerId !== swipe.id) return;

      const dx = event.clientX - swipe.x;
      const dy = event.clientY - swipe.y;
      swipe = null;

      if (Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        navigation.move(dx < 0 ? 1 : -1);
        event.preventDefault();
      }
    });

    root.addEventListener("pointercancel", event => {
      annotations.pointerEnd(event);
      if (swipe?.id === event.pointerId) swipe = null;
    });

    root.addEventListener("click", event => {
      if (closest(event.target, "[data-prev]")) navigation.move(-1);
      if (closest(event.target, "[data-next]")) navigation.move(1);
      annotations.click(event);
    });

    window.addEventListener("keydown", event => {
      if (event.key === "Escape" && annotations.escape()) {
        event.preventDefault();
        return;
      }
      const control = interactive(event.target);
      if (control &&
          (event.key === " " || closest(
            event.target,
            "input, textarea, select, [contenteditable]"
          ))) {
        return;
      }
      const direction = keyDirection[event.key];
      if (!direction) return;
      navigation.move(direction);
      event.preventDefault();
    });

    window.addEventListener("resize", navigation.resize);
  };

  const init = () => {
    const root = document.querySelector(".impressive");
    if (!root) return;

    const items = [...root.querySelectorAll(".step, .overview")];
    if (!items.length) return;

    const steps = items.filter(item => item.classList.contains("step"));
    const camera = createCamera(root, items, steps);
    const annotations = createAnnotations(root, steps);
    const navigation = createNavigation(
      root,
      items,
      steps,
      camera,
      annotations
    );

    bindInput(root, navigation, annotations);
    navigation.start();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

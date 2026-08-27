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
    const items = [...root.querySelectorAll(".step, .overview")];
    const steps = items.filter(x => x.classList.contains("step"));
    const val = (s, k, d = 0) => Number(s.dataset[k] ?? d);
    let current = items[0];

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
          s.style.setProperty("--x", `${val(s, "x")}px`);
          s.style.setProperty("--y", `${val(s, "y")}px`);
          s.style.setProperty("--z", `${val(s, "z")}px`);
          s.style.setProperty("--rx", `${val(s, "rotateX")}deg`);
          s.style.setProperty("--ry", `${val(s, "rotateY")}deg`);
          s.style.setProperty(
            "--rz",
            `${val(s, "rotateZ", val(s, "rotate"))}deg`
          );
          s.style.setProperty("--s", val(s, "scale", 1));
        }
      }

      if (!typedMath) {
        root.style.setProperty(
          "--impressive-fit",
          Math.min(innerWidth / 1200, innerHeight / 675) * .92
        );
      }
    };

    const vars = o =>
      Object.entries(o).forEach(([k, v]) =>
        root.style.setProperty(`--camera-${k}`, v));

    // Focused slides are always shown front-on:
    // copy their world rotation to the camera state, and CSS applies its inverse.
    const camera = s => {
      const scale = val(s, "scale", 1);
      vars({
        x: `${val(s, "x")}px`,
        y: `${val(s, "y")}px`,
        z: `${val(s, "z")}px`,
        rx: `${val(s, "rotateX")}deg`,
        ry: `${val(s, "rotateY")}deg`,
        rz: `${val(s, "rotateZ", val(s, "rotate"))}deg`,
        s: scale,
        ...(!typedMath && { "inv-s": 1 / scale })
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
      current = item;
      item.classList.contains("overview") ? overview(item) : camera(item);
      if (item.id) history.replaceState(null, "", `#${item.id}`);
    };

    const move = d => {
      const i = Math.max(0, Math.min(items.length - 1, items.indexOf(current) + d));
      show(items[i]);
    };

    root.addEventListener("click", e => {
      if (e.target.closest("[data-prev]")) move(-1);
      if (e.target.closest("[data-next]")) move(1);
    });

    window.addEventListener("keydown", e => {
      if (["ArrowRight", "PageDown", " "].includes(e.key)) move(1);
      else if (["ArrowLeft", "PageUp"].includes(e.key)) move(-1);
      else if (e.key === "Home") show(items[0]);
      else if (e.key === "End") show(items.at(-1));
      else return;
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

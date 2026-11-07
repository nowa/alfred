// Figure 1: the icon's A as attention. Forty-one inputs meet at one point. Each line's width is its
// weight, a softmax over fixed scores; on load the temperature falls from 10 to 1, so the weights
// go from nearly even to the icon's, where the heaviest line is the green one. The total width
// stays the same all the way, as the weights keep summing to 1.
// The geometry is the icon's, on a 100-unit tile (alfred-app docs/design.md 图标).

const APEX = [50, 24];
const BASE = 78;
const N = 41; // from x 22 to 78, every 1.4 units; the icon's nine lines fall on every fifth.
const HOT = 10; // the starting temperature

// The icon's lines: x → [width in units, strength over the ground].
const ICON = new Map([
  [22, [6.5, 1]], [29, [1.2, 0.45]], [36, [2.2, 0.55]], [43, [1.2, 0.45]], [50, [1.6, 0.5]],
  [57, [4.5, 1]], [64, [1.2, 0.45]], [71, [2.6, 0.55]], [78, [6.5, 1]],
]);
const ACCENT = 57;

function inputs() {
  const out = [];
  for (let i = 0; i < N; i++) {
    const x = Math.round((22 + (56 * i) / (N - 1)) * 10) / 10;
    const icon = ICON.get(x);
    // Lines off the icon keep a hairline: inputs that were read and weighted near zero.
    const [width, strength] = icon ?? [0.35, 0.16];
    out.push({ x, width, strength, kind: x === ACCENT ? "accent" : x === 22 || x === 78 ? "leg" : "ray" });
  }
  return out;
}

// softmax(s / t) with s = ln(width): the weights at temperature t, summing to 1.
function weights(all, t) {
  const e = all.map((l) => Math.pow(l.width, 1 / t));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
}

const ease = (t) => 1 - Math.pow(1 - t, 3);

export function drawAttention(svg, { animate, scale }) {
  const ns = "http://www.w3.org/2000/svg";
  // Rays under the legs, the green line over everything, as the icon stacks them.
  const rank = { ray: 0, leg: 1, accent: 2 };
  const all = inputs().sort((a, b) => rank[a.kind] - rank[b.kind]);
  const total = all.reduce((a, l) => a + l.width, 0);
  const lines = all.map((l) => {
    const p = document.createElementNS(ns, "line");
    p.setAttribute("x1", l.x);
    p.setAttribute("y1", BASE);
    p.setAttribute("x2", APEX[0]);
    p.setAttribute("y2", APEX[1]);
    p.setAttribute("stroke-linecap", "round");
    p.setAttribute("class", l.kind);
    svg.appendChild(p);
    return p;
  });
  const at = (t) => {
    const w = weights(all, t);
    all.forEach((l, i) => {
      lines[i].setAttribute("stroke-width", (scale * total * w[i]).toFixed(3));
      lines[i].style.strokeOpacity = Math.pow(l.strength, 1 / t).toFixed(3);
    });
  };
  if (!animate) {
    at(1);
    return;
  }
  at(HOT);
  // Draw the lines in from the base, middle first, then cool: one moment, on load only.
  const length = Math.hypot(28, BASE - APEX[1]) + 1;
  lines.forEach((p, i) => {
    p.style.strokeDasharray = `${length}`;
    p.style.strokeDashoffset = `${length}`;
    p.style.transition = `stroke-dashoffset 900ms cubic-bezier(.2,.7,.2,1) ${Math.abs(all[i].x - 50) * 10}ms`;
  });
  requestAnimationFrame(() => {
    lines.forEach((p) => (p.style.strokeDashoffset = "0"));
    const start = performance.now() + 1200;
    const cool = (now) => {
      const k = ease(Math.min(1, Math.max(0, (now - start) / 2000)));
      // 1/t moves evenly from 1/HOT to 1.
      at(1 / (1 / HOT + (1 - 1 / HOT) * k));
      if (k < 1) requestAnimationFrame(cool);
    };
    requestAnimationFrame(cool);
  });
}

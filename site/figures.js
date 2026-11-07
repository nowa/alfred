// The three figures of the evals, drawn from the numbers below. Every number is copied from
// the runtime's eval reports; the captions say the same in words, for readers without scripts.

const ns = "http://www.w3.org/2000/svg";

function el(name, attrs, text) {
  const e = document.createElementNS(ns, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

// A week of memory (runtime D191, table 1 and 2; 2026-11-05, round 3 on the real code). Both arms
// ran Opus 5.5 three times on the same eight conversations, then six questions.
const WEEK = {
  recalled: { alfred: 24, other: 21, of: 24 },
  bytes: { alfred: [672, 756], other: [4532, 5529], max: 6000, ticks: [0, 2000, 4000, 6000] },
  cost: { alfred: [0.27, 0.29], other: [0.97, 1.04], max: 1.2, ticks: [0, 0.4, 0.8, 1.2] },
};

const grouped = (n) => n.toLocaleString("en-US");
const dollars = (n) => `$${n.toFixed(2)}`;

// The chart starts after the row names, so every panel labels its own rows.
const NAMES = 112;
const WIDTH = 560;
const ROWS = [
  { y: 14, kind: "alfred", name: "Alfred" },
  { y: 40, kind: "other", name: "Claude Code" },
];

function names(svg) {
  for (const r of ROWS) svg.append(el("text", { x: 0, y: r.y + 4, class: `name ${r.kind}` }, r.name));
}

function dots(svg, { y, n, of, kind }) {
  const pitch = 14;
  for (let i = 0; i < of; i++) {
    svg.append(el("circle", { cx: NAMES + 5 + i * pitch, cy: y, r: 4.6, class: i < n ? `dot ${kind}` : "dot miss" }));
  }
  svg.append(el("text", { x: NAMES + of * pitch + 8, y: y + 4, class: "value" }, `${n}/${of}`));
}

function ranges(svg, { rows, max, ticks, format, width }) {
  const x = (v) => NAMES + 5 + (v / max) * (width - NAMES - 10);
  svg.append(el("line", { x1: x(0), x2: x(max), y1: 60, y2: 60, class: "axis" }));
  for (const t of ticks) {
    svg.append(el("line", { x1: x(t), x2: x(t), y1: 60, y2: 64, class: "axis" }));
    svg.append(el("text", { x: x(t), y: 77, class: "tick", "text-anchor": t === 0 ? "start" : t === max ? "end" : "middle" }, format(t)));
  }
  for (const { y, span, kind } of rows) {
    const [lo, hi] = span;
    svg.append(el("line", { x1: x(lo), x2: x(hi), y1: y, y2: y, class: `span ${kind}` }));
    const right = x(hi) + 10 < width - 90;
    svg.append(el("text", { x: right ? x(hi) + 10 : x(lo) - 10, y: y + 4, class: "value", "text-anchor": right ? "start" : "end" }, `${format(lo)}–${format(hi)}`));
  }
}

export function drawWeek(root) {
  const panels = root.querySelectorAll("svg[data-panel]");
  for (const svg of panels) {
    const panel = svg.dataset.panel;
    names(svg);
    if (panel === "recalled") {
      const r = WEEK.recalled;
      svg.setAttribute("viewBox", `0 0 ${WIDTH} 50`);
      dots(svg, { y: ROWS[0].y, n: r.alfred, of: r.of, kind: "alfred" });
      dots(svg, { y: ROWS[1].y, n: r.other, of: r.of, kind: "other" });
    } else {
      const d = WEEK[panel];
      svg.setAttribute("viewBox", `0 0 ${WIDTH} 82`);
      ranges(svg, {
        rows: [{ y: ROWS[0].y, span: d.alfred, kind: "alfred" }, { y: ROWS[1].y, span: d.other, kind: "other" }],
        max: d.max, ticks: d.ticks, width: WIDTH,
        format: panel === "cost" ? dollars : grouped,
      });
    }
  }
}

// Links to where an answer's facts came from (runtime docs/research/2026-11-06-answer-links.md,
// table 1): before the instruction, and its third round. Each dot is one answer; filled means it
// linked its source. The Opus web group did not run in round 3. group is an index into the
// language's group names; -1 continues the group above.
const LINKS = [
  { group: 0, model: "Sonnet", before: [3, 8], after: [16, 16] },
  { group: -1, model: "Opus", before: [2, 8], after: null },
  { group: 1, model: "Sonnet", before: [0, 8], after: [16, 16] },
  { group: -1, model: "Opus", before: [0, 8], after: [8, 8] },
  { group: 2, model: "Sonnet", before: [0, 8], after: [16, 16] },
  { group: -1, model: "Opus", before: [0, 8], after: [8, 8] },
  { group: 3, model: "Sonnet", before: [0, 8], after: [14, 16] },
  { group: -1, model: "Opus", before: [0, 8], after: [7, 8] },
];

// The evening brief and an item its notes call done (runtime docs/research/2026-11-05-daily-prompts.md,
// tables 5 and 3: rounds 1 and 3, five runs a model each). Each dot is one brief; filled means it
// asked whether the item is done. The water heater's notes say it was fixed, so it should ask; the
// deposit is still open, so asking would be wrong.
const BRIEF = [
  { group: 0, model: "Sonnet", before: [0, 10], after: [10, 10] },
  { group: -1, model: "Opus", before: [0, 10], after: [10, 10] },
  { group: 1, model: "Sonnet", before: [0, 10], after: [0, 10] },
  { group: -1, model: "Opus", before: [0, 10], after: [0, 10] },
];

// words: { before, after, notRun, links, brief } in the reader's language.
export function drawLinks(svg, words) {
  dotRows(svg, LINKS, words, words.links);
}

export function drawBrief(svg, words) {
  dotRows(svg, BRIEF, words, words.brief);
}

// One row of dots per model, before the change on the left and after it on the right, the rows
// grouped under the names in groups.
function dotRows(svg, data, words, groups) {
  const pitch = 11;
  const left = 180; // labels
  const beforeOf = Math.max(...data.map((r) => r.before[1]));
  const afterOf = Math.max(...data.map((r) => (r.after ? r.after[1] : 0)));
  const beforeX = left;
  const afterX = left + beforeOf * pitch + 36;
  const top = 30;
  let y = top;
  const width = afterX + afterOf * pitch + 4;
  svg.append(el("text", { x: beforeX, y: 12, class: "head" }, words.before));
  svg.append(el("text", { x: afterX, y: 12, class: "head" }, words.after));
  data.forEach((row, i) => {
    if (row.group >= 0 && i > 0) y += 10;
    if (row.group >= 0) svg.append(el("text", { x: 0, y: y + 4, class: "label" }, groups[row.group]));
    svg.append(el("text", { x: left - 14, y: y + 4, class: "model", "text-anchor": "end" }, row.model));
    const draw = (x0, [n, of]) => {
      for (let k = 0; k < of; k++) {
        svg.append(el("circle", { cx: x0 + 4 + k * pitch, cy: y, r: 3.6, class: k < n ? "dot alfred" : "dot miss" }));
      }
    };
    draw(beforeX, row.before);
    if (row.after) draw(afterX, row.after);
    else svg.append(el("text", { x: afterX, y: y + 4, class: "model" }, words.notRun));
    y += 18;
  });
  svg.setAttribute("viewBox", `0 0 ${width} ${y - 6}`);
}

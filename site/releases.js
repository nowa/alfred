// The release history. The Pages workflow writes releases.json from GitHub's releases each time it
// deploys, so the page reads only its own origin. Download links follow the file names
// alfred-release fixes, not the assets a release happened to list.

const REPO = "https://github.com/nowa/alfred/releases";
const PLATFORMS = [
  ["darwin", "arm64"],
  ["darwin", "amd64"],
  ["linux", "arm64"],
  ["linux", "amd64"],
];
// semver forbids leading zeros, which is also what keeps 2026.11.07 out.
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

// Notes in three languages start each part with one of these lines, exactly. Notes with none of
// them are the old format, all in Chinese; alfred-release refuses notes with only some.
const HEADINGS = new Map([
  ["### 中文", "zh"],
  ["### English", "en"],
  ["### 日本語", "ja"],
]);

const ARROW =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v8M4.5 7.5 8 11l3.5-3.5M3 13.5h10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** Splits release notes by language: {zh, en, ja}, or {zh} for the old format. */
export function sections(body) {
  const parts = {};
  const old = [];
  let current = null;
  for (const line of body.replace(/\r\n/g, "\n").split("\n")) {
    if (HEADINGS.has(line)) {
      current = HEADINGS.get(line);
      parts[current] = [];
    } else if (current) {
      parts[current].push(line);
    } else {
      old.push(line);
    }
  }
  if (!current) return { zh: old.join("\n") };
  return Object.fromEntries(Object.entries(parts).map(([lang, lines]) => [lang, lines.join("\n")]));
}

// The notes use paragraphs, "- " lists and `code`; nothing else is turned into markup, and the
// text goes in as text.
function blocks(text) {
  const out = [];
  for (const chunk of text.trim().split(/\n\s*\n/)) {
    const lines = chunk.split("\n");
    if (lines[0].startsWith("- ")) {
      const items = [];
      for (const line of lines) {
        if (line.startsWith("- ")) items.push(line.slice(2));
        else if (items.length) items[items.length - 1] += " " + line.trim();
      }
      out.push({ items });
    } else {
      out.push({ text: lines.join(" ") });
    }
  }
  return out;
}

function inline(el, text) {
  text.split("`").forEach((part, i) => {
    if (i % 2) el.append(make("code", null, part));
    else if (part) el.append(part);
  });
  return el;
}

function make(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

function block(b) {
  if (b.text != null) return inline(make("p"), b.text);
  const ul = make("ul");
  for (const item of b.items) ul.append(inline(make("li"), item));
  return ul;
}

// Newest first by semver, so 0.10.0 comes after 0.9.0; the old date-numbered releases go last.
function order(a, b) {
  const x = SEMVER.exec(a.version);
  const y = SEMVER.exec(b.version);
  if (x && y) {
    for (let i = 1; i <= 3; i++) if (x[i] !== y[i]) return Number(y[i]) - Number(x[i]);
    return 0;
  }
  if (x || y) return x ? -1 : 1;
  return b.date.localeCompare(a.date);
}

function link(href, text, className) {
  const a = make("a", className, text);
  a.href = href;
  return a;
}

function release(r, latest, t, lang, tag) {
  const dated = !SEMVER.test(r.version);
  const notes = sections(r.body ?? "");
  const words = blocks(notes[lang] ?? notes.zh ?? "");
  const summary = words[0]?.text != null ? words.shift() : null;

  const head = make("span", "release-head");
  head.append(make("span", "release-version", r.version));
  if (r.version === latest) head.append(make("span", "badge", t("releases.latest")));
  if (dated) head.append(make("span", "badge", t("releases.dated")));
  const time = make("time", "release-date", new Intl.DateTimeFormat(tag, { dateStyle: "long" }).format(new Date(r.date)));
  time.dateTime = r.date.slice(0, 10);
  head.append(time);

  const top = make(r.version === latest ? "div" : "summary", "release-top");
  top.append(head);
  if (summary) top.append(inline(make("span", "release-summary"), summary.text));

  const body = make("div", "release-body");
  const fallback = !(lang in notes);
  const notesEl = make("div", "notes");
  if (fallback) notesEl.lang = "zh-Hans";
  for (const b of words) notesEl.append(block(b));
  if (notesEl.childElementCount) body.append(notesEl);
  if (fallback && lang !== "zh") body.append(make("p", "release-aside", t("releases.onlyZh")));
  if (!dated) {
    const base = `${REPO}/download/${r.version}`;
    const downloads = make("div", "downloads");
    downloads.setAttribute("role", "group");
    downloads.setAttribute("aria-label", `${t("releases.download")} ${r.version}`);
    for (const [os, arch] of PLATFORMS) {
      const a = link(`${base}/alfred_${r.version}_${os}_${arch}.tar.gz`, t(`os.${os}.${arch}`));
      a.insertAdjacentHTML("afterbegin", ARROW);
      downloads.append(a);
    }
    const files = make("p", "files");
    files.append(
      link(`${base}/install.sh`, t("file.install")),
      link(`${base}/SHA256SUMS`, t("file.sums")),
      link(`${base}/SHA256SUMS.sig`, t("file.sig")),
    );
    body.append(downloads, files);
  }

  const li = make("li", "release");
  if (r.version === latest) {
    li.classList.add("latest");
    li.append(top, body);
  } else {
    const details = make("details");
    details.append(top, body);
    li.append(details);
  }
  return li;
}

/**
 * Draws the release history into list: data is releases.json, or null when it could not be
 * read. t looks up the page's words; lang is zh, en or ja and tag its BCP 47 tag.
 */
export function drawReleases(list, data, t, lang, tag) {
  list.replaceChildren();
  if (!data) {
    list.append(make("p", "release-aside", t("releases.failed")));
  } else {
    const ol = make("ol", "release-list");
    const latest = data.latest;
    for (const r of [...data.releases].sort(order)) ol.append(release(r, latest, t, lang, tag));
    list.append(ol);
  }
  const all = make("p", "release-all");
  all.append(link(REPO, t("releases.github")));
  list.append(all);
}

// The page's behaviour: language, appearance, the figures, the release history and copying the
// command. The head script has already set <html lang>, data-lang and data-theme before the
// first paint.

import { STRINGS, ONLY_IN_SCRIPT, FIGURES } from "./strings.js";
import { drawAttention } from "./attention.js";
import { drawWeek, drawLinks, drawBrief } from "./figures.js";
import { drawReleases } from "./releases.js";

const root = document.documentElement;
const TAGS = { zh: "zh-Hans", en: "en", ja: "ja" };

// Browser storage can be missing or refuse (a private window, blocked site data); the page works
// the same without it, only without remembering.
function remember(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}

// The Chinese is what index.html says; read it once so switching back needs no second copy.
const zh = { ...ONLY_IN_SCRIPT.zh };
for (const el of document.querySelectorAll("[data-t]")) zh[el.dataset.t] = el.innerHTML;
for (const el of document.querySelectorAll("[data-t-aria]")) zh[el.dataset.tAria] = el.getAttribute("aria-label");
for (const el of document.querySelectorAll("[data-t-content]")) zh[el.dataset.tContent] = el.getAttribute("content");
const words = { zh, en: { ...STRINGS.en, ...ONLY_IN_SCRIPT.en }, ja: { ...STRINGS.ja, ...ONLY_IN_SCRIPT.ja } };

let lang = root.dataset.lang in words ? root.dataset.lang : "en";
const t = (key) => words[lang][key] ?? zh[key];

const links = document.getElementById("links-dots");
const brief = document.getElementById("brief-dots");
const releaseList = document.getElementById("release-list");
// undefined while releases.json is on its way, null when it could not be read.
let releases;

function speak(next) {
  lang = next;
  root.lang = TAGS[lang];
  root.dataset.lang = lang;
  for (const el of document.querySelectorAll("[data-t]")) el.innerHTML = t(el.dataset.t);
  for (const el of document.querySelectorAll("[data-t-aria]")) el.setAttribute("aria-label", t(el.dataset.tAria));
  for (const el of document.querySelectorAll("[data-t-content]")) el.setAttribute("content", t(el.dataset.tContent));
  for (const item of langItems) item.setAttribute("aria-checked", String(item.dataset.lang === lang));
  appear(theme);
  links.replaceChildren();
  drawLinks(links, FIGURES[lang]);
  brief.replaceChildren();
  drawBrief(brief, FIGURES[lang]);
  if (releases !== undefined) drawReleases(releaseList, releases, t, lang, TAGS[lang]);
  root.classList.remove("pending");
}

// Language: a menu of the three, opened from the bar.
const langButton = document.getElementById("lang-button");
const langMenu = document.getElementById("lang-menu");
const langItems = [...langMenu.querySelectorAll("[data-lang]")];

function showMenu(open) {
  langMenu.hidden = !open;
  langButton.setAttribute("aria-expanded", String(open));
  if (open) (langItems.find((item) => item.dataset.lang === lang) ?? langItems[0]).focus();
}

langButton.addEventListener("click", () => showMenu(langMenu.hidden));
for (const item of langItems) {
  item.addEventListener("click", () => {
    showMenu(false);
    langButton.focus();
    if (item.dataset.lang === lang) return;
    speak(item.dataset.lang);
    // Remembered here only: a link the reader shares still opens in its recipient's language.
    remember("alfred.lang", lang);
  });
}
langMenu.addEventListener("keydown", (e) => {
  const at = langItems.indexOf(document.activeElement);
  const n = langItems.length;
  const go = { ArrowDown: (at + 1) % n, ArrowUp: (at - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
  if (go !== undefined) {
    e.preventDefault();
    langItems[go].focus();
  } else if (e.key === "Escape") {
    showMenu(false);
    langButton.focus();
  } else if (e.key === "Tab") {
    showMenu(false);
  }
});
document.addEventListener("click", (e) => {
  if (!langMenu.hidden && !e.target.closest(".menu-wrap")) showMenu(false);
});

// Appearance: each click moves to the next of the three; system leaves data-theme unset, so
// prefers-color-scheme decides.
const CYCLE = ["system", "light", "dark"];
const themeButton = document.getElementById("theme-button");
let theme = root.dataset.theme ?? "system";

function appear(choice) {
  theme = choice;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  for (const icon of themeButton.querySelectorAll("svg")) icon.toggleAttribute("hidden", icon.dataset.mode !== choice);
  themeButton.setAttribute("aria-label", t(`theme.${choice}`));
}

themeButton.addEventListener("click", () => {
  appear(CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]);
  remember("alfred.theme", theme === "system" ? null : theme);
});

// The command: a click anywhere on it selects and copies it, and a note says what happened.
const toast = document.getElementById("toast");
const CHECK =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let toastTimer;

function tell(text, done) {
  toast.innerHTML = done ? CHECK : "";
  toast.append(text);
  toast.classList.add("shown");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("shown"), 2000);
}

for (const box of document.querySelectorAll(".install")) {
  const code = box.querySelector("code");
  box.addEventListener("click", async () => {
    getSelection().selectAllChildren(code);
    try {
      await navigator.clipboard.writeText(code.textContent);
      tell(t("copy.copied"), true);
    } catch {
      tell(t("copy.failed"), false);
    }
  });
}

fetch("releases.json", { cache: "no-cache" })
  .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
  .then(
    (data) => (releases = data),
    () => (releases = null),
  )
  .then(() => drawReleases(releaseList, releases, t, lang, TAGS[lang]));

const still = matchMedia("(prefers-reduced-motion: reduce)").matches || location.hash === "#still";
drawAttention(document.getElementById("attention"), { animate: !still, scale: 0.42 });
drawWeek(document.getElementById("week"));
speak(lang);

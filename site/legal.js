// The privacy policy's and the terms' behaviour: the language menu and the appearance button,
// which work as on the homepage. Each page holds its text in all three languages and CSS shows
// the one in data-lang, so speaking another language only moves data-lang and renames the
// controls and the tab.

import { ONLY_IN_SCRIPT } from "./strings.js";

const root = document.documentElement;
const TAGS = { zh: "zh-Hans", en: "en", ja: "ja" };
const LANGUAGE = { zh: "语言", en: "Language", ja: "言語" };

function remember(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}

const langButton = document.getElementById("lang-button");
const langMenu = document.getElementById("lang-menu");
const langItems = [...langMenu.querySelectorAll("[data-lang]")];
const themeButton = document.getElementById("theme-button");
const CYCLE = ["system", "light", "dark"];

let lang = root.dataset.lang in TAGS ? root.dataset.lang : "en";
let theme = root.dataset.theme ?? "system";

function speak(next) {
  lang = next;
  root.lang = TAGS[lang];
  root.dataset.lang = lang;
  for (const item of langItems) item.setAttribute("aria-checked", String(item.dataset.lang === lang));
  langButton.setAttribute("aria-label", LANGUAGE[lang]);
  langMenu.setAttribute("aria-label", LANGUAGE[lang]);
  appear(theme);
  const title = document.querySelector(`.doc[lang="${TAGS[lang]}"] h1`);
  if (title) document.title = `Alfred ${title.textContent}`;
}

function choose(next) {
  if (next !== lang) speak(next);
  // Remembered here only: a link the reader shares still opens in its recipient's language.
  remember("alfred.lang", lang);
}

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
    choose(item.dataset.lang);
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

// A translation's note offers the English that governs it: a look at this page, not a choice of
// language, so it is not remembered and the homepage keeps the reader's language. The button
// hides with its translation, so focus moves to the English title.
for (const button of document.querySelectorAll("[data-read]")) {
  button.addEventListener("click", () => {
    speak(button.dataset.read);
    const title = document.querySelector(`.doc[lang="${TAGS[lang]}"] h1`);
    title.tabIndex = -1;
    title.focus();
    scrollTo(0, 0);
  });
}

// Appearance: each click moves to the next of the three; system leaves data-theme unset, so
// prefers-color-scheme decides.
function appear(choice) {
  theme = choice;
  if (choice === "system") delete root.dataset.theme;
  else root.dataset.theme = choice;
  for (const icon of themeButton.querySelectorAll("svg")) icon.toggleAttribute("hidden", icon.dataset.mode !== choice);
  themeButton.setAttribute("aria-label", ONLY_IN_SCRIPT[lang][`theme.${choice}`]);
}

themeButton.addEventListener("click", () => {
  appear(CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]);
  remember("alfred.theme", theme === "system" ? null : theme);
});

speak(lang);

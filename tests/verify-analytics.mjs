import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(resolve(root, "assets/analytics.js"), "utf8");
const cssVersion = createHash("sha256").update(await readFile(resolve(root, "assets/analytics.css"))).digest("hex").slice(0, 12);
const manifest = JSON.parse(await readFile(resolve(root, "src/locales/manifest.json"), "utf8"));
const translations = JSON.parse(await readFile(resolve(root, "src/analytics-copy.json"), "utf8"));
const measurementId = "G-J5ZYJ8RKE2";
const storageKey = "lucky-loki-analytics-consent-v1";
const disableKey = `ga-disable-${measurementId}`;
const now = Date.now();
const maxAge = 180 * 86400000;

function createPage({ saved, blocked = false, path = "/ru/", search = "", language = "ru", cookies = "" } = {}) {
  const handlers = {};
  const intervals = [];
  const scripts = [];
  const cookieWrites = [];
  const storage = new Map(saved === undefined ? [] : [[storageKey, saved]]);
  const elements = Object.fromEntries(["consent", "settings", "accept", "reject", "close"].map((key) => [key, {
    hidden: true, attributes: {}, listeners: {}, focused: false,
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    focus() { this.focused = true; }
  }]));
  let cookieValue = cookies;
  let reloads = 0;
  const window = {
    addEventListener(name, callback) { handlers[name] = callback; },
    setInterval(callback) { intervals.push(callback); return intervals.length; }
  };
  const document = {
    currentScript: { getAttribute: () => measurementId },
    documentElement: { lang: language },
    referrer: "https://example.com/page?email=private@example.com#secret",
    getElementById: (id) => elements[id.replace("analytics-", "")],
    createElement: () => ({}),
    head: { appendChild: (script) => scripts.push(script) },
    get cookie() { return cookieValue; },
    set cookie(value) {
      cookieWrites.push(value);
      const name = value.split("=")[0];
      cookieValue = cookieValue.split(";").filter((part) => part.trim().split("=")[0] !== name).join(";");
    }
  };
  runInNewContext(source, {
    window, document, Date, URL, URLSearchParams,
    location: {
      hostname: "luckyloki.pro", protocol: "https:",
      href: `https://luckyloki.pro${path}${search}`, search,
      reload() { reloads += 1; }
    },
    localStorage: {
      getItem(key) { if (blocked) throw Error("storage disabled"); return storage.get(key) ?? null; },
      setItem(key, value) { if (blocked) throw Error("storage disabled"); storage.set(key, value); }
    }
  });
  return {
    elements, handlers, scripts, window, storage, document, cookieWrites, intervals,
    click(key) { elements[key].listeners.click(); },
    get reloads() { return reloads; },
    commands() { return Array.from(window.dataLayer || [], (args) => Array.from(args)); }
  };
}

function record(value, expires = now + 86400000) { return JSON.stringify({ value, expires }); }

// The banner and shared loader must be present in every generated language route.
assert.deepEqual(Object.keys(translations).sort(), manifest.map((item) => item.code).sort());
for (const locale of manifest) {
  const copy = translations[locale.code];
  assert.deepEqual(Object.keys(copy).sort(), Object.keys(translations.en).sort());
  const html = await readFile(resolve(root, locale.code === "en" ? "index.html" : `${locale.code}/index.html`), "utf8");
  const prefix = locale.code === "en" ? "" : "../";
  assert.equal((html.match(/data-measurement-id=/g) || []).length, 1, `${locale.code}: duplicate tracker`);
  assert.ok(html.includes(`defer src="${prefix}assets/analytics.js" data-measurement-id="${measurementId}"`), `${locale.code}: wrong loader`);
  assert.ok(html.includes(`href="${prefix}assets/analytics.css?v=${cssVersion}"`), `${locale.code}: missing or stale consent styles`);
  assert.ok(html.includes(`href="${prefix}privacy.html#website-analytics"`), `${locale.code}: wrong privacy link`);
  for (const [key, value] of Object.entries(copy)) {
    assert.equal(typeof value, "string");
    assert.ok(value.trim());
    assert.ok(html.includes(value), `${locale.code}: untranslated ${key}`);
  }
  assert.ok(!html.includes('src="https://www.googletagmanager.com'), `${locale.code}: Google loads before consent`);
  assert.ok(html.includes("location.href=localeConfig.routes[selected]+location.search+location.hash"), `${locale.code}: language choice drops campaign parameters`);
  assert.ok(html.includes("location.replace(localeConfig.routes[preferred]+location.search+location.hash)"), `${locale.code}: automatic redirect drops campaign parameters`);
}

let page = createPage();
assert.equal(page.elements.consent.hidden, false, "ask before tracking");
assert.equal(page.elements.settings.hidden, false);
assert.equal(page.elements.close.hidden, true, "no ambiguous dismissal before choice");
assert.equal(page.scripts.length, 0);
assert.equal(page.commands().length, 0, "no cookieless pings before consent");
assert.equal(page.window[disableKey], true);
page.click("reject");
assert.equal(page.scripts.length, 0);
assert.equal(page.elements.consent.hidden, true);
assert.equal(JSON.parse(page.storage.get(storageKey)).value, "denied");
page.click("settings");
assert.equal(page.elements.consent.hidden, false);
assert.equal(page.elements.close.hidden, false);
assert.equal(page.elements.reject.focused, true);
page.click("close");
assert.equal(page.elements.consent.hidden, true);
assert.equal(page.elements.settings.focused, true);

page = createPage({ search: "?analytics_debug=1&email=private@example.com&utm_source=test#secret" });
page.click("accept");
assert.equal(page.scripts.length, 1);
assert.equal(page.scripts[0].src, `https://www.googletagmanager.com/gtag/js?id=${measurementId}`);
assert.equal(page.window[disableKey], false);
const commands = page.commands();
assert.equal(commands[0][0], "consent");
assert.equal(commands[0][1], "default");
assert.equal(commands[0][2].analytics_storage, "denied");
assert.ok(commands.find((command) => command[0] === "consent" && command[1] === "update" && command[2].analytics_storage === "granted"));
const config = commands.find((command) => command[0] === "config")[2];
assert.equal(config.allow_google_signals, false);
assert.equal(config.allow_ad_personalization_signals, false);
assert.equal(config.page_location, "https://luckyloki.pro/ru/?utm_source=test");
assert.equal(config.page_referrer, "https://example.com/page");
assert.equal(config.site_language, "ru");
assert.equal(config.debug_mode, true);
assert.equal(config.cookie_expires, maxAge / 1000);
page.click("accept");
assert.equal(page.scripts.length, 1, "no duplicate config/page views on repeated acceptance");
page.click("reject");
assert.equal(page.window[disableKey], true);
assert.equal(page.reloads, 1, "unload Google library on withdrawal");

page = createPage({ saved: record("granted"), path: "/fa/", language: "fa" });
assert.equal(page.scripts.length, 1, "consent shared across language routes");
assert.equal(page.elements.consent.hidden, true);
assert.equal(page.commands().find((command) => command[0] === "config")[2].debug_mode, undefined, "debugging opt-in only");
page.storage.set(storageKey, record("denied"));
page.handlers.storage({ key: storageKey });
assert.equal(page.window[disableKey], true);
assert.equal(page.reloads, 1, "withdrawal propagated to another tab");

page = createPage({ saved: record("granted") });
page.storage.set(storageKey, record("granted", now - 1));
page.intervals[0]();
assert.equal(page.window[disableKey], true);
assert.equal(page.reloads, 1, "expired consent stops a long-lived tab");

page = createPage({ saved: record("denied"), cookies: "_ga=old; _ga_J5ZYJ8RKE2=old; session=keep; _ga_OTHER=keep" });
assert.equal(page.scripts.length, 0);
assert.equal(page.elements.consent.hidden, true);
assert.ok(!page.document.cookie.includes("_ga="));
assert.ok(!page.document.cookie.includes("_ga_J5ZYJ8RKE2="));
assert.ok(page.document.cookie.includes("session=keep"));
assert.ok(page.document.cookie.includes("_ga_OTHER=keep"));
assert.ok(page.cookieWrites.some((value) => value.includes("domain=.luckyloki.pro")));

for (const saved of ["invalid", "null", record("other"), record("granted", now - 1), record("granted", now + maxAge * 2)]) {
  page = createPage({ saved });
  assert.equal(page.scripts.length, 0, "invalid/expired permission is not consent");
  assert.equal(page.elements.consent.hidden, false);
}
page = createPage({ blocked: true });
assert.equal(page.scripts.length, 0);
page.click("accept");
assert.equal(page.scripts.length, 1, "explicit current-page consent works without storage");
page = createPage({ saved: record("denied") });
page.storage.set(storageKey, record("granted"));
page.handlers.storage({ key: storageKey });
assert.equal(page.scripts.length, 1);

console.log(`Verified analytics consent UI in ${manifest.length} languages and opt-in, rejection, withdrawal, expiry, cross-tab, cookie-cleanup, storage-failure, and URL-redaction behavior.`);

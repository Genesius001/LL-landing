import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localeRoot = resolve(root, "src/locales");
const manifest = JSON.parse(await readFile(resolve(localeRoot, "manifest.json"), "utf8"));
const english = JSON.parse(await readFile(resolve(localeRoot, "en.json"), "utf8"));

const fixedHashes = {
  "src/locales/en.json": "b44f67def9324b947bb9a1c16afb50f0632799f2d365bed3a39a5bacb0ceccc3",
  "privacy.html": "ce97e38ee5e17e9bcc8a00d5dec29c9264f64dcade1175ef3ac0d6e0d34b6846",
  "terms.html": "38de1cc3d77830b7fbc81cb92cba9f5ea74114b10c2740b52ffe8c2651dd13da",
  "acceptable-use.html": "dac07cb15cb11ca7f9c5f814cfe4cdbb5ba2294c5c6c74690e363b4b5c236e04",
  "ai-transparency.html": "5b3857b18c8308e8dfe7a41e17121fba8f58127b4331af01c439d59e35bcf8b3",
  "report.html": "0fb2231c9c1ec08be6295d824cb957458166cf316920118010312a3a6b67ef98"
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function shape(value) {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, shape(child)]));
  }
  return typeof value;
}

for (const [relativePath, expectedHash] of Object.entries(fixedHashes)) {
  const contents = await readFile(resolve(root, relativePath));
  const actualHash = createHash("sha256").update(contents).digest("hex");
  assert(actualHash === expectedHash, `${relativePath} differs from the approved baseline: ${actualHash}`);
}

const expectedShape = JSON.stringify(shape(english));
const expectedHreflangCount = manifest.length + 1;
const routes = new Set();

for (const locale of manifest) {
  assert(!routes.has(locale.code), `Duplicate locale code: ${locale.code}`);
  routes.add(locale.code);
  const copy = JSON.parse(await readFile(resolve(localeRoot, `${locale.code}.json`), "utf8"));
  assert(JSON.stringify(shape(copy)) === expectedShape, `${locale.code}.json has a different schema`);
  assert(copy.locale === locale.code, `${locale.code}.json has locale=${copy.locale}`);
  if (locale.code !== "en") {
    assert(copy.meta.title !== english.meta.title, `${locale.code} SEO title was not localized`);
    assert(copy.hero.title !== english.hero.title, `${locale.code} hero title was not localized`);
  }

  const relativeHtml = locale.code === "en" ? "index.html" : `${locale.code}/index.html`;
  const html = await readFile(resolve(root, relativeHtml), "utf8");
  const canonical = locale.code === "en" ? "https://luckyloki.pro/" : `https://luckyloki.pro/${locale.code}/`;
  const prefix = locale.code === "en" ? "" : "../";

  assert(html.includes(`<html lang="${locale.htmlLang}" dir="${locale.direction}">`), `${relativeHtml} has wrong language or direction`);
  assert(html.includes(`<link rel="canonical" href="${canonical}">`), `${relativeHtml} has wrong canonical`);
  assert((html.match(/rel="alternate" hreflang=/g) || []).length === expectedHreflangCount, `${relativeHtml} has incomplete hreflang links`);
  assert(html.includes(`src="${prefix}assets/logo.png"`), `${relativeHtml} has a broken asset prefix`);
  assert(html.includes(`href="${prefix}privacy.html" hreflang="en"`), `${relativeHtml} has a broken legal link`);
  assert(html.includes(`value="${locale.code}" selected`), `${relativeHtml} does not select its language`);
  assert(!html.includes("{{"), `${relativeHtml} contains unresolved template tokens`);

  const localReferences = new Set(
    [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((reference) => !/^(?:https?:|mailto:|#|data:|javascript:)/.test(reference))
      .map((reference) => reference.split(/[?#]/)[0])
      .filter(Boolean)
  );
  for (const reference of localReferences) {
    try {
      await access(resolve(dirname(resolve(root, relativeHtml)), reference));
    } catch {
      throw new Error(`${relativeHtml} has a broken local reference: ${reference}`);
    }
  }

  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
  assert(jsonLdMatch, `${relativeHtml} has no JSON-LD`);
  const jsonLd = JSON.parse(jsonLdMatch[1]);
  const graph = jsonLd["@graph"];
  assert(graph.find((item) => item["@type"] === "WebSite")?.inLanguage === locale.htmlLang, `${relativeHtml} JSON-LD language mismatch`);
  assert(graph.find((item) => item["@type"] === "FAQPage")?.mainEntity.length === english.faq.items.length, `${relativeHtml} FAQ schema mismatch`);
}

const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");
for (const locale of manifest) {
  const url = locale.code === "en" ? "https://luckyloki.pro/" : `https://luckyloki.pro/${locale.code}/`;
  assert(sitemap.includes(`<loc>${url}</loc>`), `Sitemap is missing ${url}`);
  assert(sitemap.includes(`hreflang="${locale.htmlLang}" href="${url}"`), `Sitemap is missing hreflang for ${locale.code}`);
}
assert(sitemap.includes('hreflang="x-default" href="https://luckyloki.pro/"'), "Sitemap is missing x-default");

console.log(`Verified ${manifest.length} localized landings, multilingual SEO, and unchanged legal files.`);

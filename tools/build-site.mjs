import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = resolve(root, "src/templates/index.html");
const localesPath = resolve(root, "src/locales");
const manifestPath = resolve(localesPath, "manifest.json");
const siteUrl = "https://luckyloki.pro";
const releaseDate = "2026-09-04";

function valueAt(source, path) {
  return path.split(".").reduce((value, segment) => {
    if (value == null || !(segment in value)) throw new Error(`Missing translation key: ${path}`);
    return value[segment];
  }, source);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function localeUrl(locale) {
  return locale.code === "en" ? `${siteUrl}/` : `${siteUrl}/${locale.code}/`;
}

function localePath(locale) {
  return locale.code === "en" ? "/" : `/${locale.code}/`;
}

function schemaShape(value) {
  if (Array.isArray(value)) return value.map(schemaShape);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, schemaShape(child)]));
  }
  return typeof value;
}

function assertLocaleShape(copy, english, code) {
  if (JSON.stringify(schemaShape(copy)) !== JSON.stringify(schemaShape(english))) {
    throw new Error(`${code}.json does not match the English locale schema`);
  }
  if (copy.locale !== code) throw new Error(`${code}.json has locale=${copy.locale}`);
}

function buildStructuredData(copy, locale, canonical) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#org`,
        name: "Lucky Loki",
        legalName: "Griffonix Inc.",
        url: `${siteUrl}/`,
        logo: `${siteUrl}/assets/logo.png`,
        email: "info@lucky-loki.com",
        sameAs: [
          "https://apps.apple.com/us/app/lucky-loki-face-swap/id6445939137",
          "https://play.google.com/store/apps/details?id=com.coinercab.luckyloki"
        ]
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: canonical,
        name: "Lucky Loki",
        inLanguage: locale.htmlLang,
        publisher: { "@id": `${siteUrl}/#org` }
      },
      {
        "@type": "MobileApplication",
        "@id": `${siteUrl}/#app`,
        name: "Lucky Loki: Face Swap",
        applicationCategory: "MultimediaApplication",
        operatingSystem: "iOS, Android",
        url: canonical,
        installUrl: [
          "https://apps.apple.com/us/app/lucky-loki-face-swap/id6445939137",
          "https://play.google.com/store/apps/details?id=com.coinercab.luckyloki"
        ],
        publisher: { "@id": `${siteUrl}/#org` },
        description: copy.meta.appDescription,
        inLanguage: locale.htmlLang
      },
      {
        "@type": "FAQPage",
        inLanguage: locale.htmlLang,
        mainEntity: copy.faq.items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer }
        }))
      }
    ]
  };
}

function alternateLinks(manifest) {
  const links = manifest.map((locale) =>
    `  <link rel="alternate" hreflang="${locale.htmlLang}" href="${localeUrl(locale)}">`
  );
  links.push(`  <link rel="alternate" hreflang="x-default" href="${siteUrl}/">`);
  return links.join("\n");
}

function ogAlternateLocales(manifest, current) {
  return manifest
    .filter((locale) => locale.code !== current.code)
    .map((locale) => `<meta property="og:locale:alternate" content="${locale.ogLocale}">`)
    .join("");
}

function languageOptions(manifest, current) {
  const options = [];
  if (!current.menu) {
    options.push(`<option value="${current.code}" selected hidden>${current.code.toUpperCase()} · ${escapeHtml(current.name)}</option>`);
  }
  for (const locale of manifest.filter((item) => item.menu)) {
    const selected = locale.code === current.code ? " selected" : "";
    options.push(`<option value="${locale.code}"${selected}>${locale.code.toUpperCase()} · ${escapeHtml(locale.name)}</option>`);
  }
  return options.join("");
}

function localeConfig(manifest, current) {
  return JSON.stringify({
    current: current.code,
    routes: Object.fromEntries(manifest.map((locale) => [locale.code, localePath(locale)]))
  });
}

function render(template, context) {
  const rendered = template
    .replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, key) => String(valueAt(context, key)))
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => escapeHtml(valueAt(context, key)));
  const unresolved = rendered.match(/\{\{\{?[\w.]+\}?\}\}/g);
  if (unresolved) throw new Error(`Unresolved translation tokens: ${unresolved.join(", ")}`);
  return rendered;
}

function buildSitemap(manifest) {
  const languageLinks = manifest
    .map((locale) => `    <xhtml:link rel="alternate" hreflang="${locale.htmlLang}" href="${localeUrl(locale)}"/>`)
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}/"/>`)
    .join("\n");
  const localized = manifest.map((locale) => `  <url>\n    <loc>${localeUrl(locale)}</loc>\n${languageLinks}\n    <lastmod>${releaseDate}</lastmod><changefreq>weekly</changefreq><priority>${locale.code === "en" ? "1.0" : "0.9"}</priority>\n  </url>`).join("\n");
  const legal = [
    ["privacy.html", "0.7"],
    ["terms.html", "0.7"],
    ["acceptable-use.html", "0.6"],
    ["ai-transparency.html", "0.6"],
    ["report.html", "0.6"]
  ].map(([path, priority]) => `  <url><loc>${siteUrl}/${path}</loc><lastmod>2026-08-17</lastmod><changefreq>yearly</changefreq><priority>${priority}</priority></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${localized}\n${legal}\n</urlset>\n`;
}

async function build() {
  const [template, manifestSource, englishSource] = await Promise.all([
    readFile(templatePath, "utf8"),
    readFile(manifestPath, "utf8"),
    readFile(resolve(localesPath, "en.json"), "utf8")
  ]);
  const manifest = JSON.parse(manifestSource);
  const english = JSON.parse(englishSource);
  const codes = new Set(manifest.map((locale) => locale.code));
  if (codes.size !== manifest.length) throw new Error("Duplicate locale codes in manifest.json");

  for (const locale of manifest) {
    const source = locale.code === "en" ? englishSource : await readFile(resolve(localesPath, `${locale.code}.json`), "utf8");
    const copy = JSON.parse(source);
    assertLocaleShape(copy, english, locale.code);
    const canonical = localeUrl(locale);
    const context = {
      ...copy,
      htmlLang: locale.htmlLang,
      direction: locale.direction,
      ogLocale: locale.ogLocale,
      languageLabel: locale.languageLabel,
      homeHref: locale.code === "en" ? "index.html" : "./",
      assetPrefix: locale.code === "en" ? "" : "../",
      rootPrefix: locale.code === "en" ? "" : "../",
      alternateLinks: alternateLinks(manifest),
      ogAlternateLocales: ogAlternateLocales(manifest, locale),
      languageOptions: languageOptions(manifest, locale),
      localeConfig: localeConfig(manifest, locale),
      meta: { ...copy.meta, canonical },
      schemaJson: JSON.stringify(buildStructuredData(copy, locale, canonical))
    };
    const outputPath = locale.code === "en" ? resolve(root, "index.html") : resolve(root, locale.code, "index.html");
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, render(template, context), "utf8");
  }

  await writeFile(resolve(root, "sitemap.xml"), buildSitemap(manifest), "utf8");
}

await build();

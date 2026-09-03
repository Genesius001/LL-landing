import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = resolve(root, "src/templates/index.html");
const englishPath = resolve(root, "src/locales/en.json");
const outputPath = resolve(root, "index.html");

function valueAt(source, path) {
  return path.split(".").reduce((value, segment) => {
    if (value == null || !(segment in value)) {
      throw new Error(`Missing translation key: ${path}`);
    }
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

function buildStructuredData(copy) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://luckyloki.pro/#org",
        name: "Lucky Loki",
        legalName: "Griffonix Inc.",
        url: "https://luckyloki.pro/",
        logo: "https://luckyloki.pro/assets/logo.png",
        email: "info@lucky-loki.com",
        sameAs: [
          "https://apps.apple.com/us/app/lucky-loki-face-swap/id6445939137",
          "https://play.google.com/store/apps/details?id=com.coinercab.luckyloki"
        ]
      },
      {
        "@type": "WebSite",
        "@id": "https://luckyloki.pro/#website",
        url: "https://luckyloki.pro/",
        name: "Lucky Loki",
        inLanguage: copy.locale,
        publisher: { "@id": "https://luckyloki.pro/#org" }
      },
      {
        "@type": "MobileApplication",
        "@id": "https://luckyloki.pro/#app",
        name: "Lucky Loki: Face Swap",
        applicationCategory: "MultimediaApplication",
        operatingSystem: "iOS, Android",
        url: "https://luckyloki.pro/",
        installUrl: [
          "https://apps.apple.com/us/app/lucky-loki-face-swap/id6445939137",
          "https://play.google.com/store/apps/details?id=com.coinercab.luckyloki"
        ],
        publisher: { "@id": "https://luckyloki.pro/#org" },
        description: copy.meta.appDescription
      },
      {
        "@type": "FAQPage",
        mainEntity: copy.faq.items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer }
        }))
      }
    ]
  };
}

async function build() {
  const [template, localeSource] = await Promise.all([
    readFile(templatePath, "utf8"),
    readFile(englishPath, "utf8")
  ]);
  const copy = JSON.parse(localeSource);
  const context = { ...copy, schemaJson: JSON.stringify(buildStructuredData(copy)) };

  const rendered = template
    .replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, key) => String(valueAt(context, key)))
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => escapeHtml(valueAt(context, key)));

  const unresolved = rendered.match(/\{\{\{?[\w.]+\}?\}\}/g);
  if (unresolved) {
    throw new Error(`Unresolved translation tokens: ${unresolved.join(", ")}`);
  }

  await writeFile(outputPath, rendered, "utf8");
}

await build();

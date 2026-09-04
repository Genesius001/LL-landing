# Lucky Loki landing

Static, dependency-free landing page for the Lucky Loki iPhone and Android app. The release bundle includes the marketing page, legal documents, policy pages, SEO files, and local media assets.

## Build and localization

The production homepage remains a plain static site, generated from one shared template and one reviewed locale record per language:

- `src/templates/index.html` — approved markup, inline CSS, and interaction code
- `src/locales/*.json` — marketing, accessibility, and SEO copy for every supported language
- `src/locales/manifest.json` — route, language-menu, locale, and text-direction configuration
- `tools/build-site.mjs` — dependency-free static renderer and JSON-LD generator
- `tests/verify-localized-site.mjs` — route, SEO, schema, and byte-level legal-document checks
- `docs/i18n/BASELINE.md` — immutable baseline and scope contract
- `docs/i18n/LOCALES.md` — localization and multilingual SEO contract

Run the complete build and check with Node.js 18 or newer:

```bash
npm run check
```

The build produces English at `/` plus localized pages at `/es/`, `/de/`, `/fr/`, `/vi/`, `/th/`, `/id/`, `/ko/`, `/ar/`, `/pt/`, `/tr/`, `/ja/`, `/hi/`, `/it/`, `/ru/`, and `/fa/`. Arabic and Persian use right-to-left layout. Persian is available through browser-language detection and direct linking but is intentionally omitted from the visible selector.

Each page has its own canonical URL, localized metadata and JSON-LD, and reciprocal `hreflang` links. English is the `x-default`. The root page performs a one-time browser-language redirect unless the visitor has already chosen a language.

## Release files

- `index.html` — generated landing page, inline CSS and JavaScript
- `privacy.html` — Privacy Policy
- `terms.html` — Terms of Use
- `acceptable-use.html` — Acceptable Use Policy
- `ai-transparency.html` — AI transparency information
- `report.html` — contact and request routes
- `assets/legal.css` — shared policy-page styles
- `assets/logo.png`, `assets/demo-before.jpg`, `assets/demo-after.jpg`, `assets/og-image.png` — local assets
- `robots.txt`, `sitemap.xml`, `llms.txt` — discovery and indexing

## Local preview

Run a local static server from this directory and open `http://localhost:8899/`.

```bash
python3 -m http.server 8899
```

Check the page at mobile, tablet, and desktop widths. Verify both store links, all internal policy links, the before/after control, keyboard focus, and the no-JavaScript fallback.

The legal and policy documents remain English-only and are protected by fixed hashes in the test. Localized pages label those links as English with `hreflang="en"` and must not imply that translated legal terms exist.

## Product facts that copy must preserve

- Platforms: iPhone and Android only.
- Source face images are saved until removed in the app.
- Target content and generated results are temporary processing data, not long-term storage.
- No persistent face templates are kept.
- User content is not used to train, fine-tune, improve, or evaluate AI models.
- Personal and commercial use are allowed if lawful and properly licensed.
- Do not publish specific plan periods, trial promises, deletion SLAs, response SLAs, universal AI-marking claims, analytics claims, or unsupported device claims.
- Public contact: `info@lucky-loki.com`.
- Griffonix Inc. provides the service. Coiner.Cab Corp. is creator and a principal rightsholder or licensor.

## Release safety

The public server and DNS are not changed during local editing or review. The pre-refresh rollback archive is stored under `_rollback/` and should be preserved until the new release is accepted and stable.

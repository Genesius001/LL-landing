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

The approved Terms, Acceptable Use Policy, and Contact & Requests revision has a version date of October 1, 2026 and was published to production on October 20, 2026. The Privacy Policy was separately approved for the website analytics disclosure effective November 16, 2026. Fixed hashes reflect these approved revisions; the AI transparency document and English marketing baseline are unchanged. The original localization baseline remains a historical record, not the current legal-document revision.

## Website analytics and consent

All 16 landing routes share the existing GA4 property `508610794`, web stream `12294452255`, and measurement ID `G-J5ZYJ8RKE2`. The shared template loads only first-party `assets/analytics.js` and `assets/analytics.css` before consent; the Google library loads only after an explicit opt-in (basic consent mode).

- The banner and persistent Analytics settings control use `src/analytics-copy.json` for every language, including Arabic/Persian RTL. Both accept and reject are equally available.
- Consent/refusal is stored under `lucky-loki-analytics-consent-v1` in first-party local storage for 180 days, shared across language routes. Failure to read storage defaults to no tracking.
- Analytics cookies expire after 180 days without sliding renewal. Advertising consent stays denied; Google signals and advertising personalization are disabled in the tag.
- Withdrawal disables the tracker, removes this stream's `_ga` cookies, and reloads the page to unload Google's code. Changes propagate to other open tabs. Expired consent requires a new choice.
- GA4's existing enhanced measurement covers page views, scrolls, and outbound store-link clicks; `site_language` distinguishes the page language in event parameters. No account identifiers, face images, or app analytics are sent by this integration.
- Page URLs retain only campaign parameters; referrer query strings and fragments are stripped. Avoid putting personal data in campaign values.
- Automatic and manual language changes preserve campaign parameters and anchors rather than discarding acquisition attribution.
- For a consenting test session only, append `?analytics_debug=1` to enable DebugView. Normal sessions are not debug traffic. Verify actual receipt in GA4 Realtime or DebugView, not just that the script loaded.

`npm run check` also covers consent gating, refusal, withdrawal, cookie cleanup, expiry, cross-tab updates, storage failures, and all translated banner instances. The production deploy preserves the existing `.well-known/ll-monitor/health.json` runtime endpoint without publishing other hidden files.

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

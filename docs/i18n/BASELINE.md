# Lucky Loki localization baseline

## Approved source

- Git commit: `fa469a5724cdd392b79b25681120f422af925178`
- Local tag: `baseline/pre-i18n-2026-09-03`
- Baseline date: 2026-09-03
- Baseline homepage SHA-256: `c938cef54c971a270ff94660749274f964194bf77915385fb0f53e80c60e187c`

## Stage-one contract

The first localization refactor must reproduce the approved English homepage byte for byte. It must not change styling, layout, images, links, behavior, product claims, or legal copy.

The build check also pins the SHA-256 hashes of `privacy.html`, `terms.html`, `acceptable-use.html`, `ai-transparency.html`, and `report.html`. These pages are outside the localization scope and must remain untouched.

## Visual reference

Before the refactor, full-page screenshots were captured at:

- Desktop: 1440 × 1000
- Mobile: 390 × 844

The screenshots are working QA artifacts; the immutable Git tag and byte-level build check are the authoritative baseline.

## Localization architecture

- `src/templates/index.html` owns the approved markup, styling, and behavior.
- `src/locales/en.json` owns all English landing and SEO copy.
- `tools/build-site.mjs` renders the production `index.html`.
- `tests/verify-english-baseline.mjs` prevents unapproved English or legal changes.

Additional locales are intentionally out of scope for this commit. They will be added only after the generated English page passes the baseline and responsive checks.

# Localization contract

## Supported routes

English is served at `/`. Every other locale is served from a stable language route: `/es/`, `/de/`, `/fr/`, `/vi/`, `/th/`, `/id/`, `/ko/`, `/ar/`, `/pt/`, `/tr/`, `/ja/`, `/hi/`, `/it/`, `/ru/`, and `/fa/`.

`src/locales/manifest.json` is the source of truth for routes, HTML language tags, Open Graph locales, text direction, native language names, and selector visibility. Persian is supported and automatically detected, but it is not listed in the visible selector. A visitor on the Persian page can still select any visible language.

## Translation rules

- Translate marketing, interface, accessibility, and SEO text from the approved English source without adding product claims.
- Preserve Lucky Loki, Lucky Loki Pro, App Store, Google Play, Griffonix Inc., and Coiner.Cab Corp. as names.
- Preserve the exact product facts in `README.md`, especially quarterly renewal, content handling, model-training, rights, and active-subscription statements.
- Treat `hero.title` and `hero.accent` as one continuous heading when reviewing grammar.
- Keep each locale file structurally identical to `src/locales/en.json`.
- Legal and policy pages remain English-only until separate legal translations are approved.

## Routing behavior

The English root may redirect once using the browser's preferred language. A manual choice is saved in local storage and takes precedence on later visits. Unsupported languages remain on English. All language routes work without JavaScript and can be crawled directly.

## SEO behavior

Every localized page must include:

- a unique canonical URL;
- localized title, description, social metadata, and FAQ copy;
- localized `WebSite`, `MobileApplication`, and `FAQPage` JSON-LD;
- reciprocal `hreflang` links for every supported locale plus English `x-default`;
- a matching entry and alternate-language cluster in `sitemap.xml`.

## RTL behavior

Arabic and Persian pages set `dir="rtl"` at the document level. The before/after comparison itself stays left-to-right so its clipping and drag direction remain stable, while its labels use the page language direction.

## Release checks

Run `npm run check` after any template or translation change. The check rebuilds every route, validates locale schemas and SEO links, parses JSON-LD, checks sitemap coverage, and confirms that English source copy and all legal documents remain unchanged.

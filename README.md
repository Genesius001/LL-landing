# Lucky Loki landing

Static, dependency-free landing page for the Lucky Loki iPhone and Android app. The release bundle includes the marketing page, legal documents, policy pages, SEO files, and local media assets.

## Release files

- `index.html` — landing page, inline CSS and JavaScript
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

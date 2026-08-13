#!/usr/bin/env python3
"""Rebuild the FAQPage JSON-LD in index.html from the visible FAQ markup.

Google requires the structured-data answers to match the visible text verbatim.
Run this after editing any <details> block in <div class="faq">.
"""
import html, json, re, sys, pathlib

p = pathlib.Path(__file__).resolve().parent.parent / "index.html"
t = p.read_text()

faq = t.split('<div class="faq">')[1].split('\n    </div>')[0]
clean = lambda s: " ".join(html.unescape(re.sub(r"<[^>]+>", "", s)).replace(" ", " ").split())

items = [
    {
        "@type": "Question",
        "name": clean(m.group(1)),
        "acceptedAnswer": {
            "@type": "Answer",
            "text": " ".join(clean(x) for x in re.findall(r"<p>(.*?)</p>", m.group(2), re.S)),
        },
    }
    for m in re.finditer(r"<details[^>]*><summary>(.*?)</summary>(.*?)</details>", faq, re.S)
]
if not items:
    sys.exit("no FAQ items found — check the markup")

blk = json.dumps(items, ensure_ascii=False, indent=8)
blk = "\n".join(("      " + l) if i else l for i, l in enumerate(blk.split("\n")))

s = t.index('    {\n      "@type":"FAQPage"')
e = t.index("  ]\n}\n</script>")
t = (
    t[:s]
    + '    {\n      "@type":"FAQPage",\n      "@id":"https://luckyloki.pro/#faq",\n      "mainEntity":'
    + blk
    + "\n    }\n"
    + t[e:]
)
p.write_text(t)

for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', t, re.S):
    json.loads(m)
print(f"FAQPage rebuilt from {len(items)} questions; all JSON-LD blocks valid")

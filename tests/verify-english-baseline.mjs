import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expected = {
  "index.html": "c938cef54c971a270ff94660749274f964194bf77915385fb0f53e80c60e187c",
  "privacy.html": "ce97e38ee5e17e9bcc8a00d5dec29c9264f64dcade1175ef3ac0d6e0d34b6846",
  "terms.html": "38de1cc3d77830b7fbc81cb92cba9f5ea74114b10c2740b52ffe8c2651dd13da",
  "acceptable-use.html": "dac07cb15cb11ca7f9c5f814cfe4cdbb5ba2294c5c6c74690e363b4b5c236e04",
  "ai-transparency.html": "5b3857b18c8308e8dfe7a41e17121fba8f58127b4331af01c439d59e35bcf8b3",
  "report.html": "0fb2231c9c1ec08be6295d824cb957458166cf316920118010312a3a6b67ef98"
};

for (const [relativePath, expectedHash] of Object.entries(expected)) {
  const contents = await readFile(resolve(root, relativePath));
  const actualHash = createHash("sha256").update(contents).digest("hex");
  if (actualHash !== expectedHash) {
    throw new Error(`${relativePath} differs from the approved pre-i18n baseline: ${actualHash}`);
  }
}

console.log("English landing and all legal pages match the approved pre-i18n baseline.");

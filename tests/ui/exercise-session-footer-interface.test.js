import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const cssUrl = new URL("../../styles/exercise-practice-criteria.css", import.meta.url);

async function readCss() {
  return readFile(fileURLToPath(cssUrl), "utf8");
}

test("link do Test Quest fica centralizado verticalmente no rodapé da lista", async () => {
  const css = await readCss();

  assert.match(css, /\.exercise-session-footer-start\s*>\s*\.button\s*\{/);
  assert.match(css, /display:\s*inline-flex/);
  assert.match(css, /align-items:\s*center/);
  assert.match(css, /justify-content:\s*center/);
  assert.match(css, /text-decoration:\s*none/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

async function read(relativePath) {
  return readFile(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

test("aplicação carrega a folha global de barras de rolagem", async () => {
  const index = await read("../../index.html");
  assert.match(index, /styles\/scrollbars\.css/);
});

test("barras de rolagem possuem suporte para Firefox e navegadores WebKit", async () => {
  const css = await read("../../styles/scrollbars.css");

  assert.match(css, /scrollbar-width:\s*thin/);
  assert.match(css, /scrollbar-color:\s*var\(--scrollbar-thumb\)\s+var\(--scrollbar-track\)/);
  assert.match(css, /\*::\-webkit-scrollbar\s*\{/);
  assert.match(css, /\*::\-webkit-scrollbar-thumb:hover\s*\{/);
  assert.match(css, /\*::\-webkit-scrollbar-thumb:active\s*\{/);
  assert.match(css, /forced-colors:\s*active/);
});

test("temas claro e escuro definem cores próprias para as barras", async () => {
  const tokens = await read("../../styles/tokens.css");
  const themes = await read("../../styles/themes.css");

  assert.match(tokens, /--scrollbar-size:\s*10px/);
  assert.match(tokens, /--scrollbar-track:/);
  assert.match(tokens, /--scrollbar-thumb-hover:/);
  assert.match(themes, /html\[data-theme="dark"\][\s\S]*--scrollbar-track:/);
  assert.match(themes, /html\[data-theme="dark"\][\s\S]*--scrollbar-thumb-active:/);
});

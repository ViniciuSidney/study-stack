import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("importação do Test Quest prioriza arquivo e simplifica linguagem", async () => {
  const modal = await read("../../scripts/ui/modals/testquest-import-modal.js");

  assert.match(modal, /text:\s*"Arquivo da sessão"/);
  assert.match(modal, /text:\s*"Importar resultado"/);
  assert.doesNotMatch(modal, /Validar e importar/);
  assert.doesNotMatch(modal, /Contrato aceito:/);
  assert.doesNotMatch(modal, /· ID /);
});

test("JSON manual permanece recolhido em details", async () => {
  const modal = await read("../../scripts/ui/modals/testquest-import-modal.js");

  assert.match(modal, /createElement\(document, "details", \{[\s\S]*className: "testquest-manual-entry"/);
  assert.match(modal, /createElement\(document, "summary", \{ text: "Colar JSON manualmente" \}\)/);
  assert.match(modal, /manualDetails\.append\(manualContent\)/);
});

test("feedback do importador é contextual e controla a ação principal", async () => {
  const modal = await read("../../scripts/ui/modals/testquest-import-modal.js");

  assert.match(modal, /className: "testquest-import-status"/);
  assert.match(modal, /importButton\.disabled = true/);
  assert.match(modal, /importButton\.disabled = false/);
  assert.match(modal, /pronto para importar/);
});

test("stylesheet do importador está carregado e cobre o fluxo responsivo", async () => {
  const html = await read("../../index.html");
  const css = await read("../../styles/testquest-import.css");

  assert.match(html, /styles\/testquest-import\.css/);
  assert.match(css, /\.testquest-import-modal\s*\{[\s\S]*width:\s*min\(760px,\s*calc\(100vw\s*-\s*32px\)\)/);
  assert.match(css, /\.test-quest-import-card\s*\{[\s\S]*width:\s*100%[\s\S]*max-width:\s*100%/);
  assert.match(css, /\.test-quest-import-body\s*\{[\s\S]*grid-auto-rows:\s*max-content[\s\S]*align-content:\s*start/);
  assert.match(css, /\.testquest-manual-entry\s*\{/);
  assert.match(css, /\.testquest-file-field input\[type="file"\]/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.doesNotMatch(css, /@import\s+url\("\.\/modal-resilience\.css"\)/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("cabeçalhos de modal aceitam títulos longos sem estourar o layout", async () => {
  const css = await read("../../styles/summary-editor-tabs.css");

  assert.match(css, /\.modal-header > div\s*\{[\s\S]*min-width:\s*0;/);
  assert.match(css, /\.modal-header h2\s*\{[\s\S]*overflow-wrap:\s*anywhere;/);
});

test("ajuda de checklist recebe tratamento visual próprio", async () => {
  const css = await read("../../styles/summary-editor-tabs.css");
  const noteEditor = await read("../../scripts/ui/modals/note-editor-modal.js");

  assert.match(noteEditor, /className:\s*"note-checklist-help"/);
  assert.match(css, /\.note-checklist-help\s*\{[\s\S]*border:/);
  assert.match(css, /\.note-checklist-help summary\s*\{[\s\S]*cursor:\s*pointer;/);
});

test("opções de vínculo usam toda a largura disponível para o texto", async () => {
  const css = await read("../../styles/summary-editor-tabs.css");
  const noteEditor = await read("../../scripts/ui/modals/note-editor-modal.js");

  assert.match(noteEditor, /className:\s*`note-link-option/);
  assert.match(css, /\.note-link-option\s*\{[\s\S]*grid-template-columns:\s*auto minmax\(0, 1fr\);/);
  assert.match(css, /\.note-link-option > span\s*\{[\s\S]*min-width:\s*0;/);
}
);

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("controles globais somente com ícone possuem nome acessível", async () => {
  const html = await read("../../index.html");

  assert.match(
    html,
    /id="navigationToggle"[\s\S]*?aria-label="Fechar navegação lateral"/,
  );
  assert.match(
    html,
    /id="utilitiesButton"[\s\S]*?aria-label="Abrir utilidades"/,
  );
  assert.match(
    html,
    /id="closeDrawerButton"[\s\S]*?aria-label="Fechar navegação"/,
  );
});

test("editor rico mantém nomes acessíveis na barra de ferramentas", async () => {
  const editor = await read("../../scripts/ui/components/rich-text-editor.js");

  assert.match(editor, /"aria-label": action\.title/);
  assert.match(editor, /"aria-label": "Inserir tabela simples"/);
  assert.match(editor, /"aria-label": "Destacar o texto selecionado"/);
  assert.match(editor, /role: "toolbar", "aria-label": `Formatação de \$\{label\}`/);
});

test("campos de importação de arquivo possuem aria-label explícito", async () => {
  const testQuest = await read("../../scripts/ui/modals/testquest-import-modal.js");
  const restore = await read("../../scripts/ui/modals/restore-modal.js");

  assert.match(
    testQuest,
    /type: "file",[\s\S]*?"aria-label": "Selecionar arquivo JSON da sessão do Test Quest"/,
  );
  assert.match(
    restore,
    /type: "file",[\s\S]*?"aria-label": "Selecionar arquivo de backup do Study Stack"/,
  );
});

test("buscas principais expõem nome acessível", async () => {
  const sources = await Promise.all([
    read("../../scripts/ui/sections/records-section.js"),
    read("../../scripts/ui/sections/exercises-section.js"),
    read("../../scripts/ui/sections/errors-section.js"),
    read("../../scripts/ui/modals/note-editor-modal.js"),
  ]);

  for (const source of sources) {
    assert.match(source, /type: "search"[\s\S]*?"aria-label":/);
  }
});

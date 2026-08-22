import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("Arquivados usa descrição curta e estado vazio claro", async () => {
  const source = await read("../../scripts/ui/sections/archived-section.js");

  assert.match(
    source,
    /Registros arquivados ficam fora das telas principais e podem ser restaurados a qualquer momento\./,
  );
  assert.match(source, /Nenhum registro arquivado/);
  assert.match(source, /Nenhum arquivado deste tipo/);
});

test("Arquivados oferece filtro por tipo e contagem dinâmica", async () => {
  const source = await read("../../scripts/ui/sections/archived-section.js");

  assert.match(source, /Todos os tipos/);
  assert.match(source, /Resumos/);
  assert.match(source, /Anotações/);
  assert.match(source, /Listas importadas/);
  assert.match(source, /Registros de erro/);
  assert.match(source, /Filtrar registros arquivados por tipo/);
  assert.match(source, /registro arquivado/);
  assert.match(source, /registros arquivados/);
});

test("Restaurar é a ação principal dos cards arquivados", async () => {
  const source = await read("../../scripts/ui/sections/archived-section.js");
  const css = await read("../../styles/record-cards.css");

  assert.match(source, /button button-primary archived-restore-button/);
  assert.match(source, /Restaurar registro/);
  assert.match(source, /Devolver este registro às telas principais/);
  assert.match(css, /\.archived-restore-button/);
  assert.match(css, /\.archived-toolbar/);
  assert.match(css, /\.archived-count/);
});

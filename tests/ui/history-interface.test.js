import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("Histórico oferece filtros por tipo e período", async () => {
  const source = await read("../../scripts/ui/sections/history-section.js");

  assert.match(source, /Tipo de evento/);
  assert.match(source, /Período/);
  assert.match(source, /Todos os tipos/);
  assert.match(source, /Últimos 7 dias/);
  assert.match(source, /Últimos 30 dias/);
});

test("Histórico agrupa apenas atualizações repetitivas", async () => {
  const source = await read("../../scripts/ui/sections/history-section.js");

  assert.match(source, /GROUPABLE_EVENT_TYPES = new Set\(\["edited", "progress_changed"\]\)/);
  assert.match(source, /GROUP_WINDOW_MS = 30 \* 60 \* 1000/);
  assert.match(source, /atualizações semelhantes agrupadas/);
});

test("Histórico diferencia categorias e possui estados vazios claros", async () => {
  const source = await read("../../scripts/ui/sections/history-section.js");
  const css = await read("../../styles/history.css");

  assert.match(source, /Registros/);
  assert.match(source, /Exercícios/);
  assert.match(source, /Erros/);
  assert.match(source, /Progresso/);
  assert.match(source, /Nenhum evento registrado/);
  assert.match(source, /Nenhum evento neste filtro/);
  assert.match(css, /\[data-category="records"\]/);
  assert.match(css, /\[data-category="exercises"\]/);
  assert.match(css, /\[data-category="errors"\]/);
  assert.match(css, /\[data-category="progress"\]/);
});

test("stylesheet dedicado do Histórico é carregado explicitamente", async () => {
  const html = await read("../../index.html");
  assert.match(html, /styles\/history\.css/);
});

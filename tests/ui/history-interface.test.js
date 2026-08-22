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

test("Histórico agrupa atualizações repetitivas e erros criados em lote", async () => {
  const source = await read("../../scripts/ui/sections/history-section.js");

  assert.match(
    source,
    /SAME_ENTITY_GROUPABLE_EVENT_TYPES = new Set\(\["edited", "progress_changed"\]\)/,
  );
  assert.match(source, /SAME_ENTITY_GROUP_WINDOW_MS = 30 \* 60 \* 1000/);
  assert.match(source, /BULK_ERROR_GROUP_WINDOW_MS = 2 \* 60 \* 1000/);
  assert.match(source, /function canGroupBulkErrors/);
  assert.match(source, /previous\.metadata\.sessionId !== current\.metadata\.sessionId/);
  assert.match(source, /\$\{group\.events\.length\} erros registrados\./);
  assert.match(source, /erros da mesma lista foram agrupados/);
  assert.match(source, /Ver \$\{group\.events\.length\} eventos/);
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

test("grupos do Histórico preservam os eventos individuais em detalhes recolhíveis", async () => {
  const source = await read("../../scripts/ui/sections/history-section.js");
  const css = await read("../../styles/history.css");

  assert.match(source, /history-group-details/);
  assert.match(source, /history-group-event-list/);
  assert.match(source, /event\.summary \|\| formatEventSummary\(event\)/);
  assert.match(css, /\.history-group-details/);
  assert.match(css, /\.history-group-event-list/);
});

test("stylesheet dedicado do Histórico é carregado explicitamente", async () => {
  const html = await read("../../index.html");
  assert.match(html, /styles\/history\.css/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("enhancer cobre estados vazios de pesquisa e filtros", async () => {
  const enhancer = await read("../../scripts/ui/filter-reset-enhancer.js");

  assert.match(enhancer, /\.filter-empty/);
  assert.match(enhancer, /\.note-link-empty/);
  assert.match(enhancer, /\.history-empty/);
  assert.match(enhancer, /\.archived-empty-state/);
  assert.match(enhancer, /Nenhum resultado encontrado/);
  assert.match(enhancer, /Limpar pesquisa e filtros/);
  assert.match(enhancer, /Limpar pesquisa/);
  assert.match(enhancer, /Limpar filtros/);
});

test("limpeza restaura buscas e selects para o estado padrão", async () => {
  const enhancer = await read("../../scripts/ui/filter-reset-enhancer.js");

  assert.match(enhancer, /input\[type="search"\]/);
  assert.match(enhancer, /option\.value === "all"/);
  assert.match(enhancer, /input\.value = ""/);
  assert.match(enhancer, /select\.value = "all"/);
  assert.match(enhancer, /new EventCtor\("input", \{ bubbles: true \}\)/);
  assert.match(enhancer, /new EventCtor\("change", \{ bubbles: true \}\)/);
  assert.match(enhancer, /searchInputs\[0\]\?\.focus\(\)/);
});

test("enhancer é instalado globalmente após iniciar a aplicação", async () => {
  const main = await read("../../scripts/main.js");

  assert.match(main, /import \{ installFilterResetEnhancer \} from "\.\/ui\/filter-reset-enhancer\.js"/);
  assert.match(main, /app\.start\(\);\s*installFilterResetEnhancer\(\{ document \}\);/);
});

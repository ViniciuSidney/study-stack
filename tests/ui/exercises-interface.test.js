import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appUrl = new URL("../../scripts/app.js", import.meta.url);
const sectionUrl = new URL(
  "../../scripts/ui/sections/exercises-section.js",
  import.meta.url,
);
const modalUrl = new URL(
  "../../scripts/ui/modals/exercise-session-modal.js",
  import.meta.url,
);
const cssUrl = new URL("../../styles/components.css", import.meta.url);

test("rota Exercícios usa a seção funcional em vez do placeholder", async () => {
  const app = await readFile(fileURLToPath(appUrl), "utf8");

  assert.match(app, /sectionId === "exercises"/);
  assert.match(app, /renderExercisesSection\(/);
  assert.match(app, /exerciseService\.listViewsBySubject/);
});

test("seção oferece importação, métricas, busca e filtros", async () => {
  const section = await readFile(fileURLToPath(sectionUrl), "utf8");

  assert.match(section, /Importar resultado/);
  assert.match(section, /exercise-metrics-grid/);
  assert.match(section, /Buscar em títulos, questões e respostas/);
  assert.match(section, /Válidas para prática/);
  assert.match(section, /Com erros/);
});

test("modal detalhado separa respostas e prepara erros sem criá-los", async () => {
  const modal = await readFile(fileURLToPath(modalUrl), "utf8");

  assert.match(modal, /Sua resposta/);
  assert.match(modal, /Resposta correta/);
  assert.match(modal, /Correção e explicação/);
  assert.match(modal, /Fundação 08/);
  assert.doesNotMatch(modal, /createErrorRecord/);
});

test("modais de Exercícios mantêm corpo rolável e rodapé fora do conteúdo", async () => {
  const css = await readFile(fileURLToPath(cssUrl), "utf8");

  assert.match(css, /\.exercise-session-modal\s*\{/);
  assert.match(css, /\.exercise-session-modal-card\s*\{/);
  assert.match(css, /max-height:\s*min\(94vh,\s*980px\)/);
  assert.match(css, /\.exercise-session-modal-footer\s*\{/);
});

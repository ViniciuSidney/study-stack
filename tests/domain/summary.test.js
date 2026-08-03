import test from "node:test";
import assert from "node:assert/strict";

import {
  createEmptySummary,
  getSummarySearchText,
  isSummaryCompletionReady,
  setSummaryStudied,
  updateSummary,
  validateSummary,
} from "../../scripts/domain/summary.js";

const NOW = "2026-08-02T22:00:00.000Z";
const LATER = "2026-08-02T23:00:00.000Z";

test("cria Summary vazio ligado ao mesmo Record", () => {
  const summary = createEmptySummary("record-1", NOW);

  assert.equal(summary.id, "record-1");
  assert.equal(summary.recordId, "record-1");
  assert.equal(summary.isStudied, false);
  assert.equal(validateSummary(summary).valid, true);
});

test("atualiza conteúdo, fonte e referências normalizadas", () => {
  const summary = updateSummary(createEmptySummary("record-1", NOW), {
    mainContent: { content: "<h2>Ecologia</h2><p>Fluxo de energia.</p>" },
    studyObjective: "Diferenciar cadeia e teia.",
    sourceType: "book",
    sourceDescription: "Livro didático",
    references: ["Capítulo 3", "Capítulo 3", "Página 42"],
  }, LATER);

  assert.equal(summary.mainContent.plainText, "Ecologia\nFluxo de energia.");
  assert.equal(summary.studyObjective.plainText, "Diferenciar cadeia e teia.");
  assert.deepEqual(summary.references, ["Capítulo 3", "Página 42"]);
  assert.match(getSummarySearchText(summary), /Fluxo de energia/);
});

test("conclusão exige título e conteúdo principal", () => {
  const empty = createEmptySummary("record-1", NOW);
  const filled = updateSummary(empty, { mainContent: "Base teórica" }, LATER);

  assert.equal(isSummaryCompletionReady(empty, { title: "Título" }), false);
  assert.equal(isSummaryCompletionReady(filled, { title: "" }), false);
  assert.equal(isSummaryCompletionReady(filled, { title: "Título" }), true);
});

test("marca estudado separadamente e preserva histórico", () => {
  const summary = createEmptySummary("record-1", NOW);
  const studied = setSummaryStudied(summary, true, LATER, "study-mark-1");
  const unstudied = setSummaryStudied(
    studied,
    false,
    "2026-08-03T00:00:00.000Z",
    "study-mark-2",
  );

  assert.equal(studied.isStudied, true);
  assert.equal(studied.studiedAt, LATER);
  assert.equal(unstudied.isStudied, false);
  assert.equal(unstudied.studiedAt, null);
  assert.equal(unstudied.studyMarkHistory.length, 2);
});

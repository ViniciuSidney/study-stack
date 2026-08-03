import test from "node:test";
import assert from "node:assert/strict";

import {
  createEmptyNote,
  deriveQuickDetailTitle,
  getChecklistStats,
  getNoteSearchText,
  isNoteCompletionReady,
  markQuickDetailExpanded,
  updateNote,
  validateNote,
} from "../../scripts/domain/note.js";

const NOW = "2026-08-03T10:00:00.000Z";
const LATER = "2026-08-03T11:00:00.000Z";

test("cria Note vazia ligada ao mesmo Record", () => {
  const note = createEmptyNote("record-1", NOW);

  assert.equal(note.id, "record-1");
  assert.equal(note.recordId, "record-1");
  assert.equal(note.createdFromQuickDetail, false);
  assert.equal(validateNote(note).valid, true);
});

test("atualiza conteúdo e normaliza vínculos sem autorreferência", () => {
  const note = updateNote(createEmptyNote("record-1", NOW), {
    content: { content: "<p>Conectar com <mark>produtores</mark>.</p>" },
    linkedRecordIds: ["record-2", "record-2", "record-1", ""],
  }, LATER);

  assert.equal(note.content.plainText, "Conectar com produtores.");
  assert.deepEqual(note.linkedRecordIds, ["record-2"]);
  assert.match(getNoteSearchText(note, ["Resumo base"]), /Resumo base/);
});

test("conclusão exige título e conteúdo", () => {
  const empty = createEmptyNote("record-1", NOW);
  const filled = updateNote(empty, { content: "Uma conexão importante." }, LATER);

  assert.equal(isNoteCompletionReady(empty, { title: "Título" }), false);
  assert.equal(isNoteCompletionReady(filled, { title: "" }), false);
  assert.equal(isNoteCompletionReady(filled, { title: "Título" }), true);
});

test("detecta checklist textual sem criar entidades de tarefa", () => {
  const note = updateNote(createEmptyNote("record-1", NOW), {
    content: "[ ] Rever conceito\n[x] Resolver questão\nTexto comum",
  }, LATER);

  assert.deepEqual(getChecklistStats(note), {
    total: 2,
    completed: 1,
    pending: 1,
  });
});

test("deriva título do primeiro trecho útil do detalhe", () => {
  assert.equal(
    deriveQuickDetailTitle("[ ] Confirmar regra de energia\nOutra linha"),
    "Confirmar regra de energia",
  );
});

test("marca a primeira expansão de um detalhe rápido uma única vez", () => {
  const quick = createEmptyNote("record-1", NOW, {
    createdFromQuickDetail: true,
  });
  const expanded = markQuickDetailExpanded(quick, LATER);
  const repeated = markQuickDetailExpanded(
    expanded,
    "2026-08-03T12:00:00.000Z",
  );

  assert.equal(expanded.quickDetailExpandedAt, LATER);
  assert.equal(repeated.quickDetailExpandedAt, LATER);
});

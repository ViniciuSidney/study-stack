import test from "node:test";
import assert from "node:assert/strict";

import {
  archiveRecord,
  changeRecordStatus,
  createRecord,
  restoreRecord,
  updateRecord,
  validateRecord,
} from "../../scripts/domain/record.js";

const NOW = "2026-08-02T22:00:00.000Z";
const LATER = "2026-08-02T22:05:00.000Z";

function validInput(overrides = {}) {
  return {
    id: "record-1",
    subjectId: "subject-1",
    type: "summary",
    title: "Cadeias alimentares",
    status: "draft",
    studyDate: "2026-08-02",
    tags: ["Ecologia", " revisão ", "ecologia"],
    personalNotes: "Começar pelos níveis tróficos.",
    ...overrides,
  };
}

test("cria Record normalizado e pesquisável", () => {
  const record = createRecord(validInput(), NOW);

  assert.equal(record.id, "record-1");
  assert.deepEqual(record.tags, ["ecologia", "revisão"]);
  assert.equal(record.personalNotes.plainText, "Começar pelos níveis tróficos.");
  assert.match(record.searchPlainText, /cadeias alimentares/);
  assert.equal(validateRecord(record).valid, true);
});

test("tipo e assunto são imutáveis na edição", () => {
  const record = createRecord(validInput(), NOW);

  assert.throws(
    () => updateRecord(record, { type: "note" }, LATER),
    /tipo do registro não pode ser alterado/,
  );
  assert.throws(
    () => updateRecord(record, { subjectId: "subject-2" }, LATER),
    /assunto do registro não pode ser alterado/,
  );
});

test("atualiza campos editáveis e recalcula pesquisa", () => {
  const record = createRecord(validInput(), NOW);
  const next = updateRecord(
    record,
    {
      title: "Teias alimentares",
      tags: "relações, ecossistema",
      personalNotes: "Analisar organismos onívoros.",
      isImportant: true,
    },
    LATER,
  );

  assert.equal(next.title, "Teias alimentares");
  assert.equal(next.isImportant, true);
  assert.deepEqual(next.tags, ["relações", "ecossistema"]);
  assert.match(next.searchPlainText, /onivoros/);
  assert.equal(record.title, "Cadeias alimentares");
});

test("conclusão exige autorização do conteúdo específico", () => {
  const record = createRecord(validInput(), NOW);

  assert.throws(
    () => changeRecordStatus(record, "completed", LATER),
    /validação do conteúdo específico/,
  );

  const completed = changeRecordStatus(record, "completed", LATER, {
    completionReady: true,
  });
  assert.equal(completed.status, "completed");
  assert.equal(completed.completedAt, LATER);
});

test("arquiva e restaura sem perder os demais campos", () => {
  const record = createRecord(validInput(), NOW);
  const archived = archiveRecord(record, LATER, "Conteúdo antigo");
  const restored = restoreRecord(
    archived,
    "2026-08-02T22:10:00.000Z",
  );

  assert.equal(archived.archivedAt, LATER);
  assert.equal(archived.archiveReason, "Conteúdo antigo");
  assert.equal(restored.archivedAt, null);
  assert.equal(restored.archiveReason, null);
  assert.equal(restored.title, record.title);
});

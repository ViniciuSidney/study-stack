import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateProgress,
  validateProgressSnapshot,
} from "../../scripts/domain/progress.js";
import { createRecord, archiveRecord } from "../../scripts/domain/record.js";
import {
  createEmptySummary,
  setSummaryStudied,
  updateSummary,
} from "../../scripts/domain/summary.js";
import { createSubjectFromContext } from "../../scripts/domain/subject.js";
import { normalizeSubjectContext } from "../../scripts/domain/subject-context.js";
import { VALID_SUBJECT_CONTEXT } from "../fixtures/subject-context.js";

const NOW = "2026-08-03T10:00:00.000Z";

function createSubject() {
  return createSubjectFromContext(
    normalizeSubjectContext(VALID_SUBJECT_CONTEXT),
    NOW,
  );
}

function createCompletedSummary(subjectId) {
  const record = createRecord(
    {
      id: "record-summary",
      subjectId,
      type: "summary",
      title: "Resumo completo",
      status: "completed",
      allowCompletion: true,
      studyDate: "2026-08-03",
      tags: [],
      personalNotes: "",
    },
    NOW,
  );
  const summary = updateSummary(
    createEmptySummary(record.id, NOW),
    { mainContent: "Conteúdo teórico válido." },
    NOW,
  );
  return { record, summary };
}

test("não concede pontos sem evidências", () => {
  const subject = createSubject();
  const snapshot = calculateProgress({
    subject,
    calculatedAt: NOW,
  });

  assert.equal(snapshot.currentTotal, 0);
  assert.equal(snapshot.percentage, 0);
  assert.equal(snapshot.categories.base.activePoints, 0);
  assert.equal(snapshot.categories.practice.activePoints, 0);
});

test("Base concede um ponto por Resumo concluído e outro pela marca de estudo", () => {
  const subject = createSubject();
  const { record, summary } = createCompletedSummary(subject.id);
  const first = calculateProgress({
    subject,
    records: [record],
    summaries: [summary],
    calculatedAt: NOW,
  });
  const studiedSummary = setSummaryStudied(
    summary,
    true,
    "2026-08-03T10:05:00.000Z",
    "study-mark-1",
  );
  const second = calculateProgress({
    subject,
    records: [record],
    summaries: [studiedSummary],
    calculatedAt: "2026-08-03T10:06:00.000Z",
  });

  assert.equal(first.categories.base.activePoints, 1);
  assert.equal(first.currentTotal, 1);
  assert.equal(second.categories.base.activePoints, 2);
  assert.equal(second.currentTotal, 2);
});

test("Resumo arquivado deixa de sustentar a pontuação", () => {
  const subject = createSubject();
  const { record, summary } = createCompletedSummary(subject.id);
  const archived = archiveRecord(record, "2026-08-03T10:10:00.000Z");
  const snapshot = calculateProgress({
    subject,
    records: [archived],
    summaries: [summary],
    calculatedAt: "2026-08-03T10:11:00.000Z",
  });

  assert.equal(snapshot.categories.base.activePoints, 0);
});

test("snapshot calculado possui estrutura válida", () => {
  const snapshot = calculateProgress({
    subject: createSubject(),
    calculatedAt: NOW,
  });
  const validation = validateProgressSnapshot(snapshot);

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.errors, []);
});

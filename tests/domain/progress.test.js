import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateProgress,
  validateProgressSnapshot,
} from "../../scripts/domain/progress.js";
import {
  confirmMetacognitiveCheck,
  createMetacognitiveCheck,
  markMetacognitiveCheckReviewed,
} from "../../scripts/domain/guided-flow.js";
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

function createPracticeRecord(subjectId, index) {
  return createRecord(
    {
      id: `record-session-${index}`,
      subjectId,
      type: "imported_session",
      title: `Lista ${index}`,
      status: "completed",
      allowCompletion: true,
      studyDate: "2026-08-03",
      tags: [],
      personalNotes: "",
    },
    NOW,
  );
}

function createPracticeSession(subjectId, index) {
  return {
    id: `session-${index}`,
    subjectId,
    recordId: `record-session-${index}`,
    stats: { answered: 20, validForPractice: true },
  };
}

function createCheck(subjectId, index, sessionId) {
  return createMetacognitiveCheck({
    id: `check-${index}`,
    subjectId,
    questionId: `question-${index}`,
    sessionId,
    reasonTags: [index === 1 ? "difficult" : "uncertain"],
    whyDemanding: "Exigiu atenção às condições.",
    correctReasoning: "Comparei as relações antes de responder.",
    howToRecognize: "Ler o limitador e organizar os dados.",
    now: NOW,
  });
}

test("verificações metacognitivas ativas alimentam Análise e Revisão", () => {
  const subject = createSubject();
  const record = createPracticeRecord(subject.id, 1);
  const session = createPracticeSession(subject.id, 1);
  const first = createCheck(subject.id, 1, session.id);
  const reviewed = markMetacognitiveCheckReviewed(
    first,
    "2026-08-03T10:01:00.000Z",
  );
  const confirmed = confirmMetacognitiveCheck(
    reviewed,
    "question-confirmation",
    "2026-08-03T10:02:00.000Z",
  );
  const second = createCheck(subject.id, 2, session.id);
  subject.guidedFlow.metacognitiveChecks = [confirmed, second];

  const active = calculateProgress({
    subject,
    records: [record],
    importedSessions: [session],
    calculatedAt: "2026-08-03T10:03:00.000Z",
  });
  const archived = calculateProgress({
    subject,
    records: [archiveRecord(record, "2026-08-03T10:04:00.000Z")],
    importedSessions: [session],
    calculatedAt: "2026-08-03T10:05:00.000Z",
  });

  assert.equal(active.categories.errorAnalysis.activePoints, 2);
  assert.equal(active.categories.review.activePoints, 2);
  assert.equal(archived.categories.errorAnalysis.activePoints, 0);
  assert.equal(archived.categories.review.activePoints, 0);
});

test("consolidação confirmada concede o décimo ponto somente após os nove anteriores", () => {
  const subject = createSubject();
  const { record: summaryRecord, summary } = createCompletedSummary(subject.id);
  const studiedSummary = setSummaryStudied(
    summary,
    true,
    "2026-08-03T10:01:00.000Z",
    "study-mark-consolidation",
  );
  const sessionRecords = [1, 2, 3].map((index) =>
    createPracticeRecord(subject.id, index),
  );
  const sessions = [1, 2, 3].map((index) =>
    createPracticeSession(subject.id, index),
  );
  const first = createCheck(subject.id, 1, sessions[0].id);
  const confirmed = confirmMetacognitiveCheck(
    markMetacognitiveCheckReviewed(first, "2026-08-03T10:02:00.000Z"),
    "question-confirmation",
    "2026-08-03T10:03:00.000Z",
  );
  const second = createCheck(subject.id, 2, sessions[1].id);
  subject.guidedFlow.metacognitiveChecks = [confirmed, second];
  subject.consolidation.status = "confirmed";

  const snapshot = calculateProgress({
    subject,
    records: [summaryRecord, ...sessionRecords],
    summaries: [studiedSummary],
    importedSessions: sessions,
    calculatedAt: "2026-08-03T10:04:00.000Z",
  });

  assert.equal(snapshot.categories.base.activePoints, 2);
  assert.equal(snapshot.categories.practice.activePoints, 3);
  assert.equal(snapshot.categories.errorAnalysis.activePoints, 2);
  assert.equal(snapshot.categories.review.activePoints, 2);
  assert.equal(snapshot.categories.consolidation.activePoints, 1);
  assert.equal(snapshot.currentTotal, 10);
});

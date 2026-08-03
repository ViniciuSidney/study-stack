import test from "node:test";
import assert from "node:assert/strict";

import {
  createErrorEvidence,
  createErrorOccurrence,
  createErrorRecord,
  registerCorrectEvidence,
  registerErrorRecurrence,
  setErrorReviewStatus,
  updateErrorAnalysis,
  validateErrorEvidence,
  validateErrorOccurrence,
  validateErrorRecord,
} from "../../scripts/domain/error-record.js";
import { createRichContent } from "../../scripts/domain/rich-content.js";

const INITIAL_AT = "2026-08-03T12:00:00.000Z";

function question(overrides = {}) {
  return {
    id: "question-1",
    sessionId: "session-1",
    result: "incorrect",
    userAnswer: createRichContent("Minha resposta", INITIAL_AT),
    correctAnswer: createRichContent("Resposta correta", INITIAL_AT),
    ...overrides,
  };
}

function createInitialError() {
  const occurrence = createErrorOccurrence({
    id: "occurrence-1",
    errorRecordId: "error-1",
    question: question(),
    occurredAt: INITIAL_AT,
  });
  const errorRecord = createErrorRecord({
    id: "error-1",
    recordId: "record-1",
    subjectId: "subject-1",
    questionId: "question-1",
    occurrenceId: occurrence.id,
    now: INITIAL_AT,
  });
  return { errorRecord, occurrence };
}

test("cria erro inicial e ocorrência estruturalmente válidos", () => {
  const { errorRecord, occurrence } = createInitialError();

  assert.equal(validateErrorRecord(errorRecord).valid, true);
  assert.equal(validateErrorOccurrence(occurrence).valid, true);
  assert.equal(errorRecord.reviewStatus, "pending");
  assert.equal(errorRecord.masteryStatus, "active");
  assert.deepEqual(errorRecord.occurrenceIds, ["occurrence-1"]);
  assert.equal(occurrence.kind, "initial");
});

test("análise só fica completa quando causa, regra e prevenção estão preenchidas", () => {
  const { errorRecord } = createInitialError();
  const partial = updateErrorAnalysis(
    errorRecord,
    { whyItHappened: "Confundi os níveis tróficos." },
    "2026-08-03T12:10:00.000Z",
  );
  const complete = updateErrorAnalysis(
    partial,
    {
      whyItHappened: "Confundi os níveis tróficos.",
      correctRule: "A seta aponta para quem recebe matéria e energia.",
      howToAvoid: "Identificar produtor e consumidores antes de seguir as setas.",
      errorTags: ["conceitual", "interpretação", "conceitual"],
      linkedRecordIds: ["summary-1", "summary-1"],
    },
    "2026-08-03T12:20:00.000Z",
  );

  assert.equal(partial.analysis.isComplete, false);
  assert.equal(complete.analysis.isComplete, true);
  assert.deepEqual(complete.errorTags, ["conceitual", "interpretação"]);
  assert.deepEqual(complete.linkedRecordIds, ["summary-1"]);
  assert.equal(validateErrorRecord(complete).valid, true);
});

test("revisão exige análise completa e volta a pendente se a análise ficar incompleta", () => {
  const { errorRecord } = createInitialError();
  const complete = updateErrorAnalysis(
    errorRecord,
    {
      whyItHappened: "Causa",
      correctRule: "Regra",
      howToAvoid: "Prevenção",
    },
    "2026-08-03T12:10:00.000Z",
  );
  const reviewed = setErrorReviewStatus(
    complete,
    true,
    "2026-08-03T12:20:00.000Z",
  );
  const reopenedByEdit = updateErrorAnalysis(
    reviewed,
    { whyItHappened: "Causa revisada", correctRule: "", howToAvoid: "" },
    "2026-08-03T12:30:00.000Z",
  );

  assert.equal(reviewed.reviewStatus, "reviewed");
  assert.equal(reviewed.reviewCount, 1);
  assert.equal(reopenedByEdit.reviewStatus, "pending");
  assert.equal(validateErrorRecord(reopenedByEdit).valid, true);
});

test("reincidência reinicia revisão, domínio e sequência correta", () => {
  const { errorRecord } = createInitialError();
  let next = registerCorrectEvidence(errorRecord, {
    evidenceId: "evidence-old-1",
    questionId: "question-correct-1",
    answeredAt: "2026-08-03T12:10:00.000Z",
  });
  next = registerCorrectEvidence(next, {
    evidenceId: "evidence-old-2",
    questionId: "question-correct-2",
    answeredAt: "2026-08-03T12:20:00.000Z",
  });
  next = registerErrorRecurrence(next, {
    occurrenceId: "occurrence-2",
    questionId: "question-2",
    occurredAt: "2026-08-03T12:30:00.000Z",
  });

  assert.equal(next.recurrenceCount, 1);
  assert.equal(next.reviewStatus, "pending");
  assert.equal(next.masteryStatus, "active");
  assert.equal(next.currentCorrectStreak, 0);
  assert.equal(next.overcomeAt, null);
  assert.deepEqual(next.occurrenceIds, ["occurrence-1", "occurrence-2"]);
  assert.equal(validateErrorRecord(next).valid, true);
});

test("duas evidências corretas consecutivas superam o erro", () => {
  const { errorRecord } = createInitialError();
  const firstQuestion = question({
    id: "question-correct-1",
    result: "correct",
  });
  const secondQuestion = question({
    id: "question-correct-2",
    result: "correct",
  });
  const firstEvidence = createErrorEvidence({
    id: "evidence-1",
    errorRecordId: errorRecord.id,
    question: firstQuestion,
    answeredAt: "2026-08-03T12:10:00.000Z",
    sequencePosition: 1,
    validAfterOccurrenceId: "occurrence-1",
  });
  const secondEvidence = createErrorEvidence({
    id: "evidence-2",
    errorRecordId: errorRecord.id,
    question: secondQuestion,
    answeredAt: "2026-08-03T12:20:00.000Z",
    sequencePosition: 2,
    validAfterOccurrenceId: "occurrence-1",
  });
  let next = registerCorrectEvidence(errorRecord, {
    evidenceId: firstEvidence.id,
    questionId: firstQuestion.id,
    answeredAt: firstEvidence.answeredAt,
  });
  next = registerCorrectEvidence(next, {
    evidenceId: secondEvidence.id,
    questionId: secondQuestion.id,
    answeredAt: secondEvidence.answeredAt,
  });

  assert.equal(validateErrorEvidence(firstEvidence).valid, true);
  assert.equal(validateErrorEvidence(secondEvidence).valid, true);
  assert.equal(next.currentCorrectStreak, 2);
  assert.equal(next.masteryStatus, "overcome");
  assert.equal(next.overcomeAt, secondEvidence.answeredAt);
  assert.equal(validateErrorRecord(next).valid, true);
});

test("validação rejeita contagens e estados de domínio incoerentes", () => {
  const { errorRecord } = createInitialError();
  const invalidCount = structuredClone(errorRecord);
  invalidCount.recurrenceCount = 2;
  const invalidMastery = structuredClone(errorRecord);
  invalidMastery.masteryStatus = "overcome";
  invalidMastery.currentCorrectStreak = 1;
  const invalidReview = structuredClone(errorRecord);
  invalidReview.reviewStatus = "reviewed";

  assert.equal(validateErrorRecord(invalidCount).valid, false);
  assert.equal(validateErrorRecord(invalidMastery).valid, false);
  assert.equal(validateErrorRecord(invalidReview).valid, false);
});

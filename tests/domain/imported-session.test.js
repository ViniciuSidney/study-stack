import test from "node:test";
import assert from "node:assert/strict";

import {
  createImportedQuestion,
  createImportedSession,
  normalizeTestQuestPayload,
  validateImportedQuestion,
  validateImportedSession,
} from "../../scripts/domain/imported-session.js";
import {
  createTestQuestResult,
  createTestQuestResultV11,
} from "../fixtures/testquest-result.js";

const NOW = "2026-08-03T12:15:00.000Z";

test("normaliza contrato do Test Quest e calcula estatísticas pelas questões", () => {
  const normalized = normalizeTestQuestPayload(createTestQuestResult(), NOW);

  assert.equal(normalized.sessionId, "test-quest-session-1");
  assert.equal(normalized.subjectId, "subject-ecology-food-webs");
  assert.equal(normalized.stats.total, 20);
  assert.equal(normalized.stats.answered, 18);
  assert.equal(normalized.stats.correct, 14);
  assert.equal(normalized.stats.partial, 0);
  assert.equal(normalized.stats.incorrect, 4);
  assert.equal(normalized.stats.unanswered, 2);
  assert.equal(normalized.stats.percentage, 70);
  assert.equal(normalized.stats.validForPractice, true);
  assert.match(normalized.payloadFingerprint, /^fnv1a-/);
  assert.equal(normalized.payloadFingerprint, "fnv1a-2263f3f1");
});

test("aceita contrato 1.1.0 e pondera respostas parciais em 50%", () => {
  const normalized = normalizeTestQuestPayload(createTestQuestResultV11(), NOW);

  assert.equal(normalized.contractVersion, "1.1.0");
  assert.equal(normalized.stats.answered, 18);
  assert.equal(normalized.stats.correct, 13);
  assert.equal(normalized.stats.partial, 1);
  assert.equal(normalized.stats.incorrect, 4);
  assert.equal(normalized.stats.unanswered, 2);
  assert.equal(normalized.stats.percentage, 68);
  assert.equal(normalized.questions[13].result, "partial");
  assert.equal(normalized.questions[13].scorePercentage, 50);
});

test("preserva a sequência estruturada opcional da lista", () => {
  const normalized = normalizeTestQuestPayload(
    createTestQuestResultV11({ session: { sequence: 4 } }),
    NOW,
  );
  const imported = createImportedSession({
    id: "session-sequence-4",
    recordId: "record-sequence-4",
    normalizedPayload: normalized,
    questionIds: normalized.questions.map((_, index) => `question-${index + 1}`),
    importedAt: NOW,
  });

  assert.equal(normalized.sourceListSequence, 4);
  assert.equal(imported.sourceListSequence, 4);
  assert.equal(validateImportedSession(imported).valid, true);
});

test("rejeita sequência estruturada inválida", () => {
  assert.throws(
    () =>
      normalizeTestQuestPayload(
        createTestQuestResultV11({ session: { sequence: 0 } }),
        NOW,
      ),
    /session\.sequence deve ser um inteiro positivo/,
  );
});

test("rejeita pontuação ausente ou incompatível no contrato 1.1.0", () => {
  const missingScore = createTestQuestResultV11();
  delete missingScore.questions[0].scorePercentage;
  assert.throws(
    () => normalizeTestQuestPayload(missingScore, NOW),
    /exige scorePercentage/,
  );

  const conflictingScore = createTestQuestResultV11();
  conflictingScore.questions[13].scorePercentage = 100;
  assert.throws(
    () => normalizeTestQuestPayload(conflictingScore, NOW),
    /incompatível com result partial/,
  );
});

test("não aceita resultado parcial no contrato legado 1.0.0", () => {
  const payload = createTestQuestResult();
  payload.questions[0].result = "partial";

  assert.throws(
    () => normalizeTestQuestPayload(payload, NOW),
    /disponível apenas no contrato 1.1.0/,
  );
});

test("rejeita contrato incompatível, origem inválida e ausência de questões", () => {
  assert.throws(
    () =>
      normalizeTestQuestPayload(
        createTestQuestResult({ contractVersion: "2.0.0" }),
        NOW,
      ),
    /incompatível/,
  );
  assert.throws(
    () =>
      normalizeTestQuestPayload(
        createTestQuestResult({ sourceApp: "outro_app" }),
        NOW,
      ),
    /sourceApp/,
  );
  assert.throws(
    () => normalizeTestQuestPayload(createTestQuestResult({ questions: [] }), NOW),
    /ao menos uma questão/,
  );
});

test("cria entidades normalizadas de sessão e questão", () => {
  const normalized = normalizeTestQuestPayload(createTestQuestResult(), NOW);
  const question = createImportedQuestion({
    id: "question-1",
    sessionId: "session-1",
    subjectId: normalized.subjectId,
    normalizedQuestion: normalized.questions[0],
  });
  const session = createImportedSession({
    id: "session-1",
    recordId: "record-1",
    normalizedPayload: normalized,
    questionIds: Array.from({ length: 20 }, (_, index) =>
      index === 0 ? question.id : `question-${index + 1}`,
    ),
    importedAt: NOW,
  });

  assert.equal(validateImportedQuestion(question).valid, true);
  assert.equal(validateImportedSession(session).valid, true);
  assert.equal(question.statement.plainText, "Enunciado da questão 1");
  assert.equal(question.scorePercentage, 100);
  assert.equal(session.originalSnapshot.sourceApp, "test_quest");
});

test("mantém entidades persistidas do contrato 1.0.0 sem os novos campos restauráveis", () => {
  const normalized = normalizeTestQuestPayload(createTestQuestResult(), NOW);
  const question = createImportedQuestion({
    id: "legacy-question-1",
    sessionId: "legacy-session-1",
    subjectId: normalized.subjectId,
    normalizedQuestion: normalized.questions[0],
  });
  delete question.scorePercentage;
  const session = createImportedSession({
    id: "legacy-session-1",
    recordId: "legacy-record-1",
    normalizedPayload: normalized,
    questionIds: Array.from({ length: 20 }, (_, index) => `legacy-question-${index + 1}`),
    importedAt: NOW,
  });
  delete session.stats.partial;

  assert.equal(validateImportedQuestion(question).valid, true);
  assert.equal(validateImportedSession(session).valid, true);
});

test("preserva snapshot original separado dos campos normalizados", () => {
  const payload = createTestQuestResult();
  const normalized = normalizeTestQuestPayload(payload, NOW);

  payload.questions[0].statement = "Mudança externa";
  assert.equal(
    normalized.originalSnapshot.questions[0].statement,
    "Enunciado da questão 1",
  );
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  createImportedQuestion,
  createImportedSession,
  normalizeTestQuestPayload,
  validateImportedQuestion,
  validateImportedSession,
} from "../../scripts/domain/imported-session.js";
import { createTestQuestResult } from "../fixtures/testquest-result.js";

const NOW = "2026-08-03T12:15:00.000Z";

test("normaliza contrato do Test Quest e calcula estatísticas pelas questões", () => {
  const normalized = normalizeTestQuestPayload(createTestQuestResult(), NOW);

  assert.equal(normalized.sessionId, "test-quest-session-1");
  assert.equal(normalized.subjectId, "subject-ecology-food-webs");
  assert.equal(normalized.stats.total, 20);
  assert.equal(normalized.stats.answered, 18);
  assert.equal(normalized.stats.correct, 14);
  assert.equal(normalized.stats.incorrect, 4);
  assert.equal(normalized.stats.unanswered, 2);
  assert.equal(normalized.stats.percentage, 70);
  assert.equal(normalized.stats.validForPractice, true);
  assert.match(normalized.payloadFingerprint, /^fnv1a-/);
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
  assert.equal(session.originalSnapshot.sourceApp, "test_quest");
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

import assert from "node:assert/strict";
import test from "node:test";

import {
  confirmMetacognitiveCheck,
  createDefaultGuidedFlow,
  createMetacognitiveCheck,
  markMetacognitiveCheckReviewed,
  normalizeGuidedFlow,
  validateGuidedFlow,
} from "../../scripts/domain/guided-flow.js";

const NOW = "2026-08-03T20:00:00.000Z";
const SUBJECT_ID = "subject-ecology-food-webs";

function createCheck() {
  return createMetacognitiveCheck({
    id: "check-1",
    subjectId: SUBJECT_ID,
    questionId: "question-1",
    sessionId: "session-1",
    reasonTags: ["difficult", "uncertain"],
    whyDemanding: "As alternativas eram muito próximas.",
    correctReasoning: "Comparei cada alternativa com a condição do enunciado.",
    howToRecognize: "Sublinhar a condição que limita a resposta.",
    now: NOW,
  });
}

test("cria roteiro padrão na etapa Base", () => {
  const flow = createDefaultGuidedFlow(NOW);

  assert.equal(flow.currentStage, "base");
  assert.deepEqual(flow.metacognitiveChecks, []);
  assert.equal(validateGuidedFlow(flow, SUBJECT_ID).valid, true);
});

test("normaliza roteiro ausente sem alterar o schema raiz", () => {
  const result = normalizeGuidedFlow(null, SUBJECT_ID, NOW);

  assert.equal(result.changed, true);
  assert.equal(result.guidedFlow.currentStage, "base");
});

test("cria verificação metacognitiva completa sem fabricar um erro", () => {
  const check = createCheck();

  assert.equal(check.analysis.isComplete, true);
  assert.equal(check.review.status, "pending");
  assert.equal(check.questionId, "question-1");
});

test("revisão e confirmação exigem etapas explícitas", () => {
  const reviewed = markMetacognitiveCheckReviewed(
    createCheck(),
    "2026-08-03T20:10:00.000Z",
  );
  const confirmed = confirmMetacognitiveCheck(
    reviewed,
    "question-2",
    "2026-08-03T20:20:00.000Z",
  );

  assert.equal(reviewed.review.status, "reviewed");
  assert.equal(confirmed.review.status, "confirmed");
  assert.equal(confirmed.review.confirmationQuestionId, "question-2");
});

test("confirmação rejeita a mesma questão original", () => {
  const reviewed = markMetacognitiveCheckReviewed(createCheck(), NOW);

  assert.throws(
    () => confirmMetacognitiveCheck(reviewed, "question-1", NOW),
    /outra questão correta/,
  );
});

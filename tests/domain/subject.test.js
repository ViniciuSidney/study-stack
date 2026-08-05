import test from "node:test";
import assert from "node:assert/strict";

import {
  createSubjectFromContext,
  mergeSubjectWithContext,
  validateSubject,
} from "../../scripts/domain/subject.js";
import { normalizeSubjectContext } from "../../scripts/domain/subject-context.js";
import { VALID_SUBJECT_CONTEXT } from "../fixtures/subject-context.js";

const NOW = "2026-08-02T21:00:00.000Z";

function context() {
  return normalizeSubjectContext(VALID_SUBJECT_CONTEXT);
}

test("cria Subject com estado inicial e progresso padrão", () => {
  const subject = createSubjectFromContext(context(), NOW);

  assert.equal(subject.id, "subject-ecology-food-webs");
  assert.equal(subject.studyState, "initial_base");
  assert.equal(subject.progressConfig.goalTotal, 10);
  assert.equal(subject.progressConfig.categoryCaps.practice, 3);
  assert.equal(subject.consolidation.status, "not_eligible");
  assert.equal(validateSubject(subject).valid, true);
});

test("sincronização idêntica não altera o Subject", () => {
  const subject = createSubjectFromContext(context(), NOW);
  const result = mergeSubjectWithContext(
    subject,
    context(),
    "2026-08-03T00:00:00.000Z",
  );

  assert.equal(result.changed, false);
  assert.equal(result.subject, subject);
});

test("sincronização atualiza rótulos sem apagar dados internos", () => {
  const subject = createSubjectFromContext(context(), NOW);
  subject.overview.currentPerception.plainText = "Entendimento inicial";
  const renamedContext = normalizeSubjectContext({
    ...VALID_SUBJECT_CONTEXT,
    subject: {
      ...VALID_SUBJECT_CONTEXT.subject,
      subjectName: "Relações alimentares",
    },
  });
  const result = mergeSubjectWithContext(
    subject,
    renamedContext,
    "2026-08-03T00:00:00.000Z",
  );

  assert.equal(result.changed, true);
  assert.equal(result.subject.subjectName, "Relações alimentares");
  assert.equal(
    result.subject.overview.currentPerception.plainText,
    "Entendimento inicial",
  );
});

test("sincronização adiciona o roteiro a Subjects criados antes da Fundação 10", () => {
  const subject = createSubjectFromContext(context(), NOW);
  delete subject.guidedFlow;
  const result = mergeSubjectWithContext(
    subject,
    context(),
    "2026-08-03T01:00:00.000Z",
  );

  assert.equal(result.changed, true);
  assert.equal(result.subject.guidedFlow.currentStage, "base");
  assert.deepEqual(result.subject.guidedFlow.metacognitiveChecks, []);
  assert.equal(validateSubject(result.subject).valid, true);
});

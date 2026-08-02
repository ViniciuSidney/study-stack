import test from "node:test";
import assert from "node:assert/strict";

import {
  createMissingSubjectContext,
  normalizeSubjectContext,
} from "../../scripts/domain/subject-context.js";
import { VALID_SUBJECT_CONTEXT } from "../fixtures/subject-context.js";

test("normaliza um contexto válido", () => {
  const result = normalizeSubjectContext(VALID_SUBJECT_CONTEXT);

  assert.equal(result.valid, true);
  assert.equal(result.subjectId, VALID_SUBJECT_CONTEXT.subjectId);
  assert.deepEqual(result.errors, []);
});

test("rejeita contexto sem identificador estável", () => {
  const result = normalizeSubjectContext({
    ...VALID_SUBJECT_CONTEXT,
    subjectId: "",
  });

  assert.equal(result.valid, false);
  assert.match(result.errors[0], /subjectId/);
});

test("cria estado explícito de vínculo ausente", () => {
  const result = createMissingSubjectContext("Teste de ausência.");

  assert.equal(result.valid, false);
  assert.equal(result.source, "missing");
  assert.deepEqual(result.errors, ["Teste de ausência."]);
});

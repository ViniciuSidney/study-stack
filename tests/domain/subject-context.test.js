import test from "node:test";
import assert from "node:assert/strict";

import {
  createMissingSubjectContext,
  normalizeSubjectContext,
} from "../../scripts/domain/subject-context.js";
import { VALID_SUBJECT_CONTEXT } from "../fixtures/subject-context.js";

test("normaliza o contrato válido do Concept Compass", () => {
  const result = normalizeSubjectContext(VALID_SUBJECT_CONTEXT);

  assert.equal(result.valid, true);
  assert.equal(result.subjectId, VALID_SUBJECT_CONTEXT.subject.subjectId);
  assert.equal(result.matterName, "Biologia");
  assert.deepEqual(result.errors, []);
});

test("rejeita contexto sem os identificadores hierárquicos", () => {
  const result = normalizeSubjectContext({
    ...VALID_SUBJECT_CONTEXT,
    subject: {
      ...VALID_SUBJECT_CONTEXT.subject,
      matterId: "",
      themeId: "",
    },
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /matterId/);
  assert.match(result.errors.join(" "), /themeId/);
});

test("rejeita versão de contrato incompatível", () => {
  const result = normalizeSubjectContext({
    ...VALID_SUBJECT_CONTEXT,
    contractVersion: "9.0.0",
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /contractVersion incompatível/);
});

test("aceita subjectArea como alias temporário de matterName", () => {
  const { matterName, ...subjectWithoutMatterName } =
    VALID_SUBJECT_CONTEXT.subject;
  const result = normalizeSubjectContext({
    ...VALID_SUBJECT_CONTEXT,
    subject: {
      ...subjectWithoutMatterName,
      subjectArea: matterName,
    },
  });

  assert.equal(result.valid, true);
  assert.equal(result.matterName, "Biologia");
});

test("cria estado explícito de vínculo ausente", () => {
  const result = createMissingSubjectContext("Teste de ausência.");

  assert.equal(result.valid, false);
  assert.equal(result.source, "missing");
  assert.deepEqual(result.errors, ["Teste de ausência."]);
});

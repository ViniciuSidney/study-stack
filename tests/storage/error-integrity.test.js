import test from "node:test";
import assert from "node:assert/strict";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { normalizeSubjectContext } from "../../scripts/domain/subject-context.js";
import { ErrorService } from "../../scripts/services/error-service.js";
import { ExerciseService } from "../../scripts/services/exercise-service.js";
import { SubjectService } from "../../scripts/services/subject-service.js";
import { LocalStorageAdapter } from "../../scripts/storage/local-storage-adapter.js";
import { MigrationRunner } from "../../scripts/storage/migrations/migration-runner.js";
import { StateRepository } from "../../scripts/storage/state-repository.js";
import { createInitialState } from "../../scripts/storage/state-schema.js";
import { validateState } from "../../scripts/storage/state-validator.js";
import { MemoryStorage } from "../fixtures/memory-storage.js";
import { VALID_SUBJECT_CONTEXT } from "../fixtures/subject-context.js";
import { createTestQuestResult } from "../fixtures/testquest-result.js";

function createStateWithErrorAndEvidence() {
  let tick = 0;
  let idTick = 0;
  const base = Date.parse("2026-08-03T16:00:00.000Z");
  const clock = () => new Date(base + tick++ * 60_000).toISOString();
  const repository = new StateRepository({
    storage: new LocalStorageAdapter(new MemoryStorage(), "study-stack"),
    config: APP_CONFIG,
    createInitialState,
    migrationRunner: new MigrationRunner(APP_CONFIG.storage.schemaVersion),
    clock,
  });
  repository.initialize();
  const subject = new SubjectService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
  }).synchronize(normalizeSubjectContext(VALID_SUBJECT_CONTEXT));
  const idGenerator = (prefix) => `${prefix}-${++idTick}`;
  const imported = new ExerciseService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator,
  }).importPayload(createTestQuestResult(), {
    expectedSubjectId: subject.id,
  }).session;
  const errorService = new ErrorService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator,
  });
  const incorrect = imported.questions.find((question) => question.result === "incorrect");
  const correct = imported.questions.find((question) => question.result === "correct");
  const error = errorService.createFromQuestion(incorrect.id).view;
  errorService.addCorrectEvidence(error.errorRecord.id, correct.id);

  return {
    state: repository.getState(),
    errorId: error.errorRecord.id,
    questionId: incorrect.id,
  };
}

test("estado com erro, ocorrência e evidência passa pela integridade referencial", () => {
  const { state } = createStateWithErrorAndEvidence();
  const result = validateState(state, APP_CONFIG.storage.schemaVersion);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validação detecta vínculo reverso ausente entre questão e ErrorRecord", () => {
  const { state, questionId } = createStateWithErrorAndEvidence();
  state.collections.importedQuestions[questionId].errorRecordIds = [];
  const result = validateState(state, APP_CONFIG.storage.schemaVersion);

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /não consta na questão vinculada/);
});

test("validação detecta ocorrência e evidência fora do ErrorRecord correspondente", () => {
  const { state, errorId } = createStateWithErrorAndEvidence();
  const error = state.collections.errorRecords[errorId];
  const occurrenceId = error.occurrenceIds[0];
  const evidenceId = error.evidenceIds[0];
  state.collections.errorOccurrences[occurrenceId].errorRecordId = "error-missing";
  state.collections.errorEvidences[evidenceId].validAfterOccurrenceId = "occurrence-missing";
  const result = validateState(state, APP_CONFIG.storage.schemaVersion);

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /ocorrência|evidência|inexistente/i);
});

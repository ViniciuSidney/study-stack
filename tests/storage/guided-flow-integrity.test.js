import assert from "node:assert/strict";
import test from "node:test";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { normalizeSubjectContext } from "../../scripts/domain/subject-context.js";
import { ExerciseService } from "../../scripts/services/exercise-service.js";
import { GuidedFlowService } from "../../scripts/services/guided-flow-service.js";
import { ProgressService } from "../../scripts/services/progress-service.js";
import { SubjectService } from "../../scripts/services/subject-service.js";
import { LocalStorageAdapter } from "../../scripts/storage/local-storage-adapter.js";
import { MigrationRunner } from "../../scripts/storage/migrations/migration-runner.js";
import { StateRepository } from "../../scripts/storage/state-repository.js";
import { createInitialState } from "../../scripts/storage/state-schema.js";
import { validateState } from "../../scripts/storage/state-validator.js";
import { MemoryStorage } from "../fixtures/memory-storage.js";
import { VALID_SUBJECT_CONTEXT } from "../fixtures/subject-context.js";
import { createTestQuestResult } from "../fixtures/testquest-result.js";

function setup() {
  let tick = 0;
  let idTick = 0;
  const clock = () =>
    `2026-08-03T12:${String(tick++).padStart(2, "0")}:00.000Z`;
  const idGenerator = (prefix) => `${prefix}-${++idTick}`;
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
  const exerciseService = new ExerciseService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator,
  });
  exerciseService.importPayload(createTestQuestResult(), {
    expectedSubjectId: subject.id,
  });
  const progressService = new ProgressService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator,
  });
  const guidedFlowService = new GuidedFlowService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator,
  });
  guidedFlowService.ensure(subject.id);
  progressService.ensureCurrent(subject.id);
  return { repository, subject, guidedFlowService };
}

test("estado valida os vínculos das verificações metacognitivas", () => {
  const { repository, subject, guidedFlowService } = setup();
  const candidate = guidedFlowService.getMetacognitiveView(subject.id).candidates[0];
  guidedFlowService.createMetacognitiveCheck(subject.id, {
    questionId: candidate.question.id,
    reasonTags: ["uncertain"],
    whyDemanding: "As alternativas eram próximas.",
    correctReasoning: "Comparei cada condição.",
    howToRecognize: "Ler os limitadores primeiro.",
  });

  const state = repository.getState();
  const valid = validateState(state, APP_CONFIG.storage.schemaVersion);
  assert.equal(valid.valid, true);

  const broken = structuredClone(state);
  broken.collections.subjects[subject.id].guidedFlow.metacognitiveChecks[0].questionId =
    "question-missing";
  const invalid = validateState(broken, APP_CONFIG.storage.schemaVersion);

  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join(" "), /questão inexistente/);
});

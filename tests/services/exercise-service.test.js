import test from "node:test";
import assert from "node:assert/strict";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { normalizeSubjectContext } from "../../scripts/domain/subject-context.js";
import { ExerciseService } from "../../scripts/services/exercise-service.js";
import { ProgressService } from "../../scripts/services/progress-service.js";
import { RecordService } from "../../scripts/services/record-service.js";
import { SubjectService } from "../../scripts/services/subject-service.js";
import { LocalStorageAdapter } from "../../scripts/storage/local-storage-adapter.js";
import { MigrationRunner } from "../../scripts/storage/migrations/migration-runner.js";
import { StateRepository } from "../../scripts/storage/state-repository.js";
import { createInitialState } from "../../scripts/storage/state-schema.js";
import { MemoryStorage } from "../fixtures/memory-storage.js";
import { VALID_SUBJECT_CONTEXT } from "../fixtures/subject-context.js";
import {
  createTestQuestResult,
  createTestQuestResultV11,
} from "../fixtures/testquest-result.js";

function setup() {
  let tick = 0;
  let idTick = 0;
  const clock = () =>
    `2026-08-03T13:${String(tick++).padStart(2, "0")}:00.000Z`;
  const repository = new StateRepository({
    storage: new LocalStorageAdapter(new MemoryStorage(), "study-stack"),
    config: APP_CONFIG,
    createInitialState,
    migrationRunner: new MigrationRunner(APP_CONFIG.storage.schemaVersion),
    clock,
  });
  repository.initialize();
  const subjectService = new SubjectService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
  });
  const subject = subjectService.synchronize(
    normalizeSubjectContext(VALID_SUBJECT_CONTEXT),
  );
  const idGenerator = (prefix) => `${prefix}-${++idTick}`;
  const exerciseService = new ExerciseService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator,
  });
  const recordService = new RecordService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator,
  });
  const progressService = new ProgressService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator,
  });

  return {
    repository,
    subject,
    exerciseService,
    recordService,
    progressService,
  };
}

test("importa sessão, questões, Record e histórico em uma única operação", () => {
  const { repository, subject, exerciseService } = setup();
  const result = exerciseService.importPayload(createTestQuestResult(), {
    expectedSubjectId: subject.id,
  });

  assert.equal(result.status, "imported");
  assert.equal(result.session.questions.length, 20);
  assert.equal(result.session.record.type, "imported_session");
  assert.equal(result.session.record.status, "completed");
  assert.equal(
    Object.keys(repository.getCollection("importedSessions")).length,
    1,
  );
  assert.equal(
    Object.keys(repository.getCollection("importedQuestions")).length,
    20,
  );
  assert.equal(
    Object.values(repository.getCollection("historyEvents")).some(
      (event) => event.eventType === "imported",
    ),
    true,
  );
});

test("identifica importação idêntica sem duplicar dados", () => {
  const { repository, subject, exerciseService } = setup();
  const payload = createTestQuestResult();
  exerciseService.importPayload(payload, { expectedSubjectId: subject.id });
  const duplicate = exerciseService.importPayload(payload, {
    expectedSubjectId: subject.id,
  });

  assert.equal(duplicate.status, "duplicate");
  assert.equal(
    Object.keys(repository.getCollection("importedSessions")).length,
    1,
  );
  assert.equal(
    Object.keys(repository.getCollection("importedQuestions")).length,
    20,
  );
});

test("preserva reimportação divergente para revisão sem sobrescrever", () => {
  const { repository, subject, exerciseService } = setup();
  exerciseService.importPayload(createTestQuestResult(), {
    expectedSubjectId: subject.id,
  });
  const changed = createTestQuestResult({
    questions: createTestQuestResult().questions.map((question, index) =>
      index === 0 ? { ...question, statement: "Enunciado alterado" } : question,
    ),
  });
  const result = exerciseService.importPayload(changed, {
    expectedSubjectId: subject.id,
  });

  assert.equal(result.status, "needs_review");
  assert.equal(
    Object.keys(repository.getCollection("importedSessions")).length,
    1,
  );
  assert.equal(exerciseService.listPending().length, 1);
  assert.equal(exerciseService.listPending()[0].status, "needs_review");
});

test("preserva payload de outro assunto como vínculo pendente", () => {
  const { repository, subject, exerciseService } = setup();
  const result = exerciseService.importPayload(
    createTestQuestResult({
      subjectContext: { subjectId: "subject-other" },
    }),
    { expectedSubjectId: subject.id },
  );

  assert.equal(result.status, "pending_link");
  assert.equal(
    Object.keys(repository.getCollection("importedSessions")).length,
    0,
  );
  assert.equal(exerciseService.listPending()[0].status, "pending_link");
});

test("lista agregados e salva observação sem alterar snapshot original", () => {
  const { subject, exerciseService } = setup();
  const imported = exerciseService.importPayload(createTestQuestResult(), {
    expectedSubjectId: subject.id,
  });
  const sourceSnapshot = imported.session.session.originalSnapshot;
  const updated = exerciseService.saveSessionNotes(
    imported.session.session.id,
    "Revisar interpretação das questões difíceis.",
  );
  const aggregate = exerciseService.getAggregate(subject.id);

  assert.equal(updated.session.sessionNotes.plainText, "Revisar interpretação das questões difíceis.");
  assert.deepEqual(updated.session.originalSnapshot, sourceSnapshot);
  assert.equal(aggregate.sessions, 1);
  assert.equal(aggregate.questions, 20);
  assert.equal(aggregate.incorrect, 4);
  assert.equal(aggregate.percentage, 70);
});

test("lista válida concede ponto de prática e arquivamento remove a evidência", () => {
  const {
    subject,
    exerciseService,
    recordService,
    progressService,
  } = setup();
  const imported = exerciseService.importPayload(createTestQuestResult(), {
    expectedSubjectId: subject.id,
  });

  const active = progressService.ensureCurrent(subject.id);
  assert.equal(active.categories.practice.activePoints, 1);

  recordService.archive(imported.session.record.id);
  const archived = progressService.ensureCurrent(subject.id);
  assert.equal(archived.categories.practice.activePoints, 0);
});

test("importa contrato 1.1.0 e agrega aproveitamento ponderado", () => {
  const { repository, subject, exerciseService } = setup();
  const result = exerciseService.importPayload(createTestQuestResultV11(), {
    expectedSubjectId: subject.id,
  });
  const aggregate = exerciseService.getAggregate(subject.id);
  const integration = repository.getEntity("integrationState", "global");

  assert.equal(result.status, "imported");
  assert.equal(result.session.session.sourceContractVersion, "1.1.0");
  assert.equal(result.session.session.stats.partial, 1);
  assert.equal(result.session.session.stats.percentage, 68);
  assert.equal(result.session.errorCandidateCount, 4);
  assert.equal(aggregate.partial, 1);
  assert.equal(aggregate.percentage, 68);
  assert.deepEqual(
    integration.testQuest.supportedContractVersions,
    ["1.0.0", "1.1.0"],
  );

  const tampered = repository.getState();
  const partialQuestion = Object.values(
    tampered.collections.importedQuestions,
  ).find((question) => question.result === "partial");
  delete partialQuestion.scorePercentage;
  assert.throws(
    () => repository.replaceState(tampered, { createRecoveryPoint: false }),
    /scorePercentage exigido pela sessão 1.1.0/,
  );
});

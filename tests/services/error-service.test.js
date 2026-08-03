import test from "node:test";
import assert from "node:assert/strict";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { normalizeSubjectContext } from "../../scripts/domain/subject-context.js";
import { ErrorService } from "../../scripts/services/error-service.js";
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
import { createTestQuestResult } from "../fixtures/testquest-result.js";

function setup() {
  let tick = 0;
  let idTick = 0;
  const base = Date.parse("2026-08-03T14:00:00.000Z");
  const clock = () => new Date(base + tick++ * 60_000).toISOString();
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
  const imported = exerciseService.importPayload(createTestQuestResult(), {
    expectedSubjectId: subject.id,
  }).session;
  const errorService = new ErrorService({
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
  const recordService = new RecordService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator,
  });

  const correct = imported.questions.filter((question) => question.result === "correct");
  const incorrect = imported.questions.filter(
    (question) => question.result === "incorrect",
  );
  const unanswered = imported.questions.filter(
    (question) => question.result === "unanswered",
  );

  return {
    repository,
    subject,
    imported,
    correct,
    incorrect,
    unanswered,
    errorService,
    progressService,
    recordService,
  };
}

function completeAnalysis(service, errorId, title = "Erro analisado") {
  return service.saveAnalysis(errorId, {
    title,
    studyDate: "2026-08-03",
    isImportant: false,
    whyItHappened: "Interpretei a relação de forma invertida.",
    correctRule: "A seta indica o fluxo de matéria e energia.",
    howToAvoid: "Identificar quem é consumido antes de seguir as setas.",
    errorTags: ["conceitual", "interpretação"],
    linkedRecordIds: [],
    personalNotes: "Revisar antes da próxima lista.",
  });
}

test("cria Record, ErrorRecord e ocorrência inicial em uma única operação", () => {
  const { repository, incorrect, errorService } = setup();
  const result = errorService.createFromQuestion(incorrect[0].id);

  assert.equal(result.status, "created");
  assert.equal(result.view.record.type, "error_record");
  assert.equal(result.view.record.status, "draft");
  assert.equal(result.view.errorRecord.primaryQuestionId, incorrect[0].id);
  assert.equal(result.view.occurrences.length, 1);
  assert.equal(result.view.occurrences[0].kind, "initial");
  assert.deepEqual(
    repository.getEntity("importedQuestions", incorrect[0].id).errorRecordIds,
    [result.view.errorRecord.id],
  );
  assert.equal(
    Object.values(repository.getCollection("historyEvents")).some(
      (event) => event.eventType === "created" && event.entityType === "error_record",
    ),
    true,
  );
});

test("criação é idempotente para a mesma questão e rejeita resultados incompatíveis", () => {
  const { correct, unanswered, incorrect, errorService } = setup();
  const first = errorService.createFromQuestion(incorrect[0].id);
  const duplicate = errorService.createFromQuestion(incorrect[0].id);

  assert.equal(duplicate.status, "existing");
  assert.equal(duplicate.view.errorRecord.id, first.view.errorRecord.id);
  assert.throws(
    () => errorService.createFromQuestion(correct[0].id),
    /Somente questões incorretas/,
  );
  assert.throws(
    () => errorService.createFromQuestion(unanswered[0].id),
    /Somente questões incorretas/,
  );
});

test("salva rascunho, conclui análise e inclui conteúdo na pesquisa", () => {
  const { incorrect, errorService } = setup();
  const created = errorService.createFromQuestion(incorrect[0].id).view;
  const partial = errorService.saveAnalysis(created.errorRecord.id, {
    title: "Fluxo de energia",
    studyDate: "2026-08-03",
    whyItHappened: "Li a seta ao contrário.",
    correctRule: "",
    howToAvoid: "",
    errorTags: ["interpretação"],
    linkedRecordIds: [],
    personalNotes: "",
  });
  const complete = completeAnalysis(
    errorService,
    created.errorRecord.id,
    "Fluxo de energia e setas",
  );

  assert.equal(partial.record.status, "in_progress");
  assert.equal(partial.errorRecord.analysis.isComplete, false);
  assert.equal(complete.record.status, "completed");
  assert.equal(complete.errorRecord.analysis.isComplete, true);
  assert.match(complete.record.searchPlainText, /interpretei a relacao/);
  assert.match(complete.record.searchPlainText, /fluxo de materia e energia/);
  assert.throws(
    () =>
      errorService.saveAnalysis(created.errorRecord.id, {
        title: "   ",
        studyDate: "2026-08-03",
      }),
    /exige um título/,
  );
});

test("revisão exige análise completa e alimenta a categoria Revisão", () => {
  const { subject, incorrect, errorService, progressService } = setup();
  const created = errorService.createFromQuestion(incorrect[0].id).view;

  assert.throws(
    () => errorService.toggleReviewed(created.errorRecord.id),
    /Conclua a análise/,
  );
  completeAnalysis(errorService, created.errorRecord.id);
  const reviewed = errorService.toggleReviewed(created.errorRecord.id);
  const progress = progressService.ensureCurrent(subject.id);

  assert.equal(reviewed.errorRecord.reviewStatus, "reviewed");
  assert.equal(reviewed.errorRecord.reviewCount, 1);
  assert.equal(progress.categories.review.activePoints, 1);
});

test("duas análises completas concedem os dois pontos de Análise de erros", () => {
  const { subject, incorrect, errorService, progressService } = setup();
  const first = errorService.createFromQuestion(incorrect[0].id).view;
  const second = errorService.createFromQuestion(incorrect[1].id).view;
  completeAnalysis(errorService, first.errorRecord.id, "Primeiro erro");
  completeAnalysis(errorService, second.errorRecord.id, "Segundo erro");

  const progress = progressService.ensureCurrent(subject.id);
  assert.equal(progress.categories.errorAnalysis.activePoints, 2);
  assert.deepEqual(
    new Set(progress.categories.errorAnalysis.evidenceIds),
    new Set([first.errorRecord.id, second.errorRecord.id]),
  );
});

test("duas questões corretas distintas superam o erro e completam a Revisão", () => {
  const { subject, correct, incorrect, errorService, progressService } = setup();
  const created = errorService.createFromQuestion(incorrect[0].id).view;
  completeAnalysis(errorService, created.errorRecord.id);
  errorService.toggleReviewed(created.errorRecord.id);

  const first = errorService.addCorrectEvidence(
    created.errorRecord.id,
    correct[0].id,
  );
  const second = errorService.addCorrectEvidence(
    created.errorRecord.id,
    correct[1].id,
  );
  const progress = progressService.ensureCurrent(subject.id);

  assert.equal(first.errorRecord.currentCorrectStreak, 1);
  assert.equal(first.errorRecord.masteryStatus, "active");
  assert.equal(second.errorRecord.currentCorrectStreak, 2);
  assert.equal(second.errorRecord.masteryStatus, "overcome");
  assert.equal(progress.categories.review.activePoints, 2);
  assert.throws(
    () => errorService.addCorrectEvidence(created.errorRecord.id, correct[2].id),
    /já foi superado/,
  );
});

test("não aceita a mesma questão duas vezes na sequência correta", () => {
  const { correct, incorrect, errorService } = setup();
  const created = errorService.createFromQuestion(incorrect[0].id).view;
  errorService.addCorrectEvidence(created.errorRecord.id, correct[0].id);

  assert.throws(
    () => errorService.addCorrectEvidence(created.errorRecord.id, correct[0].id),
    /já foi usada/,
  );
});

test("reincidência invalida evidências, reinicia a sequência e devolve o erro para revisão", () => {
  const { repository, correct, incorrect, errorService } = setup();
  const created = errorService.createFromQuestion(incorrect[0].id).view;
  completeAnalysis(errorService, created.errorRecord.id);
  errorService.toggleReviewed(created.errorRecord.id);
  const firstEvidence = errorService.addCorrectEvidence(
    created.errorRecord.id,
    correct[0].id,
  ).evidences[0];
  const recurrent = errorService.registerRecurrence(
    created.errorRecord.id,
    incorrect[1].id,
  );

  assert.equal(recurrent.errorRecord.recurrenceCount, 1);
  assert.equal(recurrent.errorRecord.currentCorrectStreak, 0);
  assert.equal(recurrent.errorRecord.reviewStatus, "pending");
  assert.equal(recurrent.errorRecord.masteryStatus, "active");
  assert.ok(repository.getEntity("errorEvidences", firstEvidence.id).invalidatedAt);
  assert.throws(
    () => errorService.registerRecurrence(created.errorRecord.id, incorrect[1].id),
    /já representa uma ocorrência/,
  );
});

test("candidatos excluem questões já usadas na ocorrência ou na sequência atual", () => {
  const { correct, incorrect, errorService } = setup();
  const created = errorService.createFromQuestion(incorrect[0].id).view;
  const recurrenceCandidates = errorService.getEvidenceCandidates(
    created.errorRecord.id,
    "recurrence",
  );
  assert.equal(
    recurrenceCandidates.some((candidate) => candidate.question.id === incorrect[0].id),
    false,
  );

  errorService.addCorrectEvidence(created.errorRecord.id, correct[0].id);
  const evidenceCandidates = errorService.getEvidenceCandidates(
    created.errorRecord.id,
    "evidence",
  );
  assert.equal(
    evidenceCandidates.some((candidate) => candidate.question.id === correct[0].id),
    false,
  );
});

test("arquivamento remove as evidências do cálculo sem apagar o erro", () => {
  const {
    repository,
    subject,
    incorrect,
    errorService,
    progressService,
    recordService,
  } = setup();
  const created = errorService.createFromQuestion(incorrect[0].id).view;
  completeAnalysis(errorService, created.errorRecord.id);
  assert.equal(
    progressService.ensureCurrent(subject.id).categories.errorAnalysis.activePoints,
    1,
  );

  recordService.archive(created.record.id);
  const afterArchive = progressService.ensureCurrent(subject.id);
  assert.equal(afterArchive.categories.errorAnalysis.activePoints, 0);
  assert.ok(repository.getEntity("errorRecords", created.errorRecord.id));
});

import assert from "node:assert/strict";
import test from "node:test";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { normalizeSubjectContext } from "../../scripts/domain/subject-context.js";
import { ExerciseService } from "../../scripts/services/exercise-service.js";
import { GuidedFlowService } from "../../scripts/services/guided-flow-service.js";
import { ProgressService } from "../../scripts/services/progress-service.js";
import { RecordService } from "../../scripts/services/record-service.js";
import { SubjectService } from "../../scripts/services/subject-service.js";
import { SummaryService } from "../../scripts/services/summary-service.js";
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
  const clock = () =>
    `2026-08-03T${String(10 + Math.floor(tick / 60)).padStart(2, "0")}:${String(
      tick++ % 60,
    ).padStart(2, "0")}:00.000Z`;
  const idGenerator = (prefix) => `${prefix}-${++idTick}`;
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
  const recordService = new RecordService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator,
  });
  const summaryService = new SummaryService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator,
  });
  const exerciseService = new ExerciseService({
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
  const guidedFlowService = new GuidedFlowService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator,
  });
  guidedFlowService.ensure(subject.id);
  progressService.ensureCurrent(subject.id);

  return {
    repository,
    subject,
    recordService,
    summaryService,
    exerciseService,
    progressService,
    guidedFlowService,
  };
}

function completeBase(setupResult) {
  const { subject, recordService, summaryService, progressService } = setupResult;
  const record = recordService.create({
    subjectId: subject.id,
    type: "summary",
    title: "Resumo base",
    status: "draft",
    studyDate: "2026-08-03",
    tags: [],
    personalNotes: "",
    isImportant: false,
  });
  summaryService.save(record.id, {
    record: { title: "Resumo base" },
    summary: { mainContent: "Base teórica completa." },
    status: "completed",
  });
  summaryService.toggleStudied(record.id);
  progressService.ensureCurrent(subject.id);
  return record;
}

function allCorrectPayload(index) {
  const questions = Array.from({ length: 20 }, (_, questionIndex) => ({
    id: `session-${index}-question-${questionIndex + 1}`,
    type: "objective",
    difficulty: questionIndex < 10 ? "medium" : "hard",
    statement: `Questão correta ${index}.${questionIndex + 1}`,
    userAnswer: "Resposta correta",
    correctAnswer: "Resposta correta",
    correction: "Raciocínio esperado.",
    result: "correct",
  }));
  return createTestQuestResult({
    sessionId: `all-correct-session-${index}`,
    sentAt: `2026-08-03T1${index}:00:00.000Z`,
    session: {
      title: `Lista sem erros ${index}`,
      date: `2026-08-03T1${index}:00:00.000Z`,
    },
    questions,
  });
}


function mixedPayload(index) {
  const payload = createTestQuestResult({
    sessionId: `mixed-session-${index}`,
    sentAt: `2026-08-03T1${index}:30:00.000Z`,
    session: {
      title: `Lista com erros ${index}`,
      date: `2026-08-03T1${index}:30:00.000Z`,
    },
  });
  return {
    ...payload,
    questions: payload.questions.map((question) => ({
      ...question,
      id: `mixed-${index}-${question.id}`,
    })),
  };
}

function completePractice(setupResult) {
  const { exerciseService, progressService, subject } = setupResult;
  for (let index = 1; index <= 3; index += 1) {
    exerciseService.importPayload(allCorrectPayload(index), {
      expectedSubjectId: subject.id,
    });
  }
  progressService.ensureCurrent(subject.id);
}

test("roteiro começa em Base e bloqueia avanço prematuro", () => {
  const { guidedFlowService, subject } = setup();
  const view = guidedFlowService.getView(subject.id);

  assert.equal(view.currentStage, "base");
  assert.equal(view.recommendedStage, "base");
  assert.equal(view.stages.find((stage) => stage.key === "practice").canBecomeCurrent, false);
  assert.throws(
    () => guidedFlowService.setCurrentStage(subject.id, "practice"),
    /Conclua Base/,
  );
});

test("conclusão mantém a etapa atual até o avanço manual e avisa uma vez", () => {
  const setupResult = setup();
  completeBase(setupResult);
  const { guidedFlowService, subject } = setupResult;
  const before = guidedFlowService.getView(subject.id);

  assert.equal(before.currentStage, "base");
  assert.equal(before.recommendedStage, "practice");
  assert.equal(before.advanceAvailable, true);
  assert.match(guidedFlowService.consumeAdvanceNotice(subject.id).message, /Praticar/);
  assert.equal(guidedFlowService.consumeAdvanceNotice(subject.id), null);

  const after = guidedFlowService.setCurrentStage(subject.id, "practice");
  assert.equal(after.currentStage, "practice");
});

test("prática sem erros oferece verificação metacognitiva", () => {
  const setupResult = setup();
  completeBase(setupResult);
  setupResult.guidedFlowService.setCurrentStage(setupResult.subject.id, "practice");
  completePractice(setupResult);
  const view = setupResult.guidedFlowService.getView(setupResult.subject.id);
  const analysis = view.stages.find((stage) => stage.key === "errorAnalysis");

  assert.equal(view.hasPracticeWithoutErrors, true);
  assert.equal(view.recommendedStage, "errorAnalysis");
  assert.equal(analysis.action.type, "open_metacognitive");
});


test("uma lista sem erros libera a verificação antes de completar Prática", () => {
  const setupResult = setup();
  completeBase(setupResult);
  setupResult.guidedFlowService.setCurrentStage(setupResult.subject.id, "practice");
  setupResult.exerciseService.importPayload(allCorrectPayload(1), {
    expectedSubjectId: setupResult.subject.id,
  });
  setupResult.progressService.ensureCurrent(setupResult.subject.id);

  let view = setupResult.guidedFlowService.getView(setupResult.subject.id);
  let practice = view.stages.find((stage) => stage.key === "practice");

  assert.equal(practice.activePoints, 1);
  assert.equal(practice.action.type, "open_test_quest");
  assert.equal(practice.action.secondary.type, "import_result");
  assert.equal(practice.action.tertiary.type, "open_metacognitive");

  setupResult.exerciseService.importPayload(allCorrectPayload(2), {
    expectedSubjectId: setupResult.subject.id,
  });
  setupResult.exerciseService.importPayload(allCorrectPayload(3), {
    expectedSubjectId: setupResult.subject.id,
  });
  setupResult.progressService.ensureCurrent(setupResult.subject.id);
  view = setupResult.guidedFlowService.getView(setupResult.subject.id);
  practice = view.stages.find((stage) => stage.key === "practice");

  assert.equal(practice.activePoints, 3);
  assert.equal(practice.action.type, "open_exercises");
  assert.equal(practice.action.secondary.type, "open_test_quest");
  assert.equal(practice.action.tertiary.type, "open_metacognitive");
});

test("duas verificações, revisão e confirmação completam o caminho alternativo", () => {
  const setupResult = setup();
  completeBase(setupResult);
  completePractice(setupResult);
  const { guidedFlowService, progressService, subject } = setupResult;
  let metacognitive = guidedFlowService.getMetacognitiveView(subject.id);
  const first = metacognitive.candidates[0].question.id;
  const second = metacognitive.candidates[1].question.id;

  const check1 = guidedFlowService.createMetacognitiveCheck(subject.id, {
    questionId: first,
    reasonTags: ["difficult"],
    whyDemanding: "Alternativas próximas.",
    correctReasoning: "Comparei as condições.",
    howToRecognize: "Ler o limitador antes de responder.",
  });
  const check2 = guidedFlowService.createMetacognitiveCheck(subject.id, {
    questionId: second,
    reasonTags: ["uncertain"],
    whyDemanding: "Fiquei inseguro.",
    correctReasoning: "A relação correta depende da energia.",
    howToRecognize: "Verificar o sentido da seta.",
  });
  let progress = progressService.ensureCurrent(subject.id);
  assert.equal(progress.categories.errorAnalysis.activePoints, 2);

  guidedFlowService.markMetacognitiveReviewed(subject.id, check1.id);
  progress = progressService.ensureCurrent(subject.id);
  assert.equal(progress.categories.review.activePoints, 1);

  metacognitive = guidedFlowService.getMetacognitiveView(subject.id);
  const confirmation = metacognitive.confirmationCandidates.find(
    (candidate) => ![first, second].includes(candidate.question.id),
  ).question.id;
  guidedFlowService.confirmMetacognitive(subject.id, check1.id, confirmation);
  progress = progressService.ensureCurrent(subject.id);

  assert.equal(progress.categories.review.activePoints, 2);
  assert.equal(progress.currentTotal, 9);
  assert.equal(check2.review.status, "pending");
});

test("consolidação é manual e fica suspensa quando uma evidência anterior some", () => {
  const setupResult = setup();
  const summaryRecord = completeBase(setupResult);
  completePractice(setupResult);
  const { guidedFlowService, progressService, recordService, subject } = setupResult;
  let metacognitive = guidedFlowService.getMetacognitiveView(subject.id);
  const [firstCandidate, secondCandidate, confirmationCandidate] =
    metacognitive.candidates;
  const check1 = guidedFlowService.createMetacognitiveCheck(subject.id, {
    questionId: firstCandidate.question.id,
    reasonTags: ["difficult"],
    whyDemanding: "Exigiu comparação.",
    correctReasoning: "Comparei as relações.",
    howToRecognize: "Checar as condições.",
  });
  guidedFlowService.createMetacognitiveCheck(subject.id, {
    questionId: secondCandidate.question.id,
    reasonTags: ["slow"],
    whyDemanding: "Demorei para organizar os dados.",
    correctReasoning: "Organizei a sequência antes de responder.",
    howToRecognize: "Montar uma cadeia curta.",
  });
  guidedFlowService.markMetacognitiveReviewed(subject.id, check1.id);
  guidedFlowService.confirmMetacognitive(
    subject.id,
    check1.id,
    confirmationCandidate.question.id,
  );
  progressService.ensureCurrent(subject.id);

  guidedFlowService.confirmConsolidation(subject.id, "Consigo explicar e aplicar.");
  let progress = progressService.ensureCurrent(subject.id);
  assert.equal(progress.currentTotal, 10);
  assert.equal(
    guidedFlowService.getView(subject.id).currentStage,
    "consolidation",
  );

  recordService.archive(summaryRecord.id);
  progress = progressService.ensureCurrent(subject.id);
  const view = guidedFlowService.getView(subject.id);
  const updatedSubject = setupResult.repository.getEntity("subjects", subject.id);

  assert.equal(progress.categories.consolidation.activePoints, 0);
  assert.equal(updatedSubject.consolidation.status, "suspended");
  assert.equal(view.currentStage, "consolidation");
  assert.equal(view.recommendedStage, "base");
  assert.equal(view.regression, true);
});

test("verificação de prática arquivada permanece histórica e não aceita revisão", () => {
  const setupResult = setup();
  completeBase(setupResult);
  completePractice(setupResult);
  const { guidedFlowService, progressService, recordService, subject } = setupResult;
  const metacognitive = guidedFlowService.getMetacognitiveView(subject.id);
  const candidate = metacognitive.candidates[0];
  const check = guidedFlowService.createMetacognitiveCheck(subject.id, {
    questionId: candidate.question.id,
    reasonTags: ["difficult"],
    whyDemanding: "Exigiu comparar condições próximas.",
    correctReasoning: "Organizei os critérios antes de responder.",
    howToRecognize: "Ler os qualificadores da questão.",
  });

  recordService.archive(candidate.session.recordId);
  progressService.ensureCurrent(subject.id);

  assert.throws(
    () => guidedFlowService.markMetacognitiveReviewed(subject.id, check.id),
    /não está mais ativa e válida/,
  );
  const view = guidedFlowService.getView(subject.id);
  const modalView = guidedFlowService.getMetacognitiveView(subject.id);
  const historical = modalView.checks.find((item) => item.check.id === check.id);

  assert.equal(view.metacognitiveCheckCount, 0);
  assert.equal(view.historicalMetacognitiveCheckCount, 1);
  assert.equal(historical.active, false);
});

test("questões incorretas reais são recomendadas antes do caminho alternativo", () => {
  const setupResult = setup();
  completeBase(setupResult);
  for (let index = 1; index <= 3; index += 1) {
    setupResult.exerciseService.importPayload(mixedPayload(index), {
      expectedSubjectId: setupResult.subject.id,
    });
  }
  setupResult.progressService.ensureCurrent(setupResult.subject.id);

  const view = setupResult.guidedFlowService.getView(setupResult.subject.id);
  const analysis = view.stages.find((stage) => stage.key === "errorAnalysis");

  assert.equal(view.hasPracticeWithoutErrors, false);
  assert.equal(view.recommendedStage, "errorAnalysis");
  assert.equal(analysis.action.type, "open_exercises");
  assert.match(analysis.action.description, /incorreta/);
});

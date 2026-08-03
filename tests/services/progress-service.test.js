import test from "node:test";
import assert from "node:assert/strict";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { normalizeSubjectContext } from "../../scripts/domain/subject-context.js";
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

function setup() {
  let tick = 0;
  let idTick = 0;
  const clock = () =>
    `2026-08-03T10:${String(tick++).padStart(2, "0")}:00.000Z`;
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
    idGenerator: (prefix) => `${prefix}-${++idTick}`,
  });
  const summaryService = new SummaryService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator: (prefix) => `${prefix}-${++idTick}`,
  });
  const progressService = new ProgressService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator: (prefix) => `${prefix}-${++idTick}`,
  });

  return {
    repository,
    subject,
    recordService,
    summaryService,
    progressService,
  };
}

test("persiste um único snapshot e reaproveita fingerprint estável", () => {
  const { repository, subject, progressService } = setup();
  const first = progressService.ensureCurrent(subject.id);
  const second = progressService.ensureCurrent(subject.id);

  assert.equal(first.calculatedAt, second.calculatedAt);
  assert.equal(Object.keys(repository.getCollection("progressSnapshots")).length, 1);
});

test("recalcula Base após conclusão e marcação de estudo", () => {
  const {
    repository,
    subject,
    recordService,
    summaryService,
    progressService,
  } = setup();
  const record = recordService.create({
    subjectId: subject.id,
    type: "summary",
    title: "Resumo",
    status: "draft",
    studyDate: "2026-08-03",
    tags: [],
    personalNotes: "",
    isImportant: false,
  });

  summaryService.save(record.id, {
    record: { title: "Resumo completo" },
    summary: { mainContent: "Uma base teórica válida." },
    status: "completed",
  });
  const completed = progressService.ensureCurrent(subject.id);
  summaryService.toggleStudied(record.id);
  const studied = progressService.ensureCurrent(subject.id);

  assert.equal(completed.currentTotal, 1);
  assert.equal(studied.currentTotal, 2);
  assert.equal(studied.categories.base.activePoints, 2);
  assert.equal(
    Object.values(repository.getCollection("historyEvents")).filter(
      (event) => event.eventType === "progress_changed",
    ).length,
    2,
  );
});

test("arquivamento remove evidência no próximo cálculo", () => {
  const { subject, recordService, summaryService, progressService } = setup();
  const record = recordService.create({
    subjectId: subject.id,
    type: "summary",
    title: "Resumo",
    status: "draft",
    studyDate: "2026-08-03",
    tags: [],
    personalNotes: "",
    isImportant: false,
  });
  summaryService.save(record.id, {
    summary: { mainContent: "Conteúdo." },
    status: "completed",
  });
  assert.equal(progressService.ensureCurrent(subject.id).currentTotal, 1);

  recordService.archive(record.id);
  assert.equal(progressService.ensureCurrent(subject.id).currentTotal, 0);
});

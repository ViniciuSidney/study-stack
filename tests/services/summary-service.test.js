import test from "node:test";
import assert from "node:assert/strict";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { RecordService } from "../../scripts/services/record-service.js";
import { SummaryService } from "../../scripts/services/summary-service.js";
import { LocalStorageAdapter } from "../../scripts/storage/local-storage-adapter.js";
import { MigrationRunner } from "../../scripts/storage/migrations/migration-runner.js";
import { StateRepository } from "../../scripts/storage/state-repository.js";
import { createInitialState } from "../../scripts/storage/state-schema.js";
import { MemoryStorage } from "../fixtures/memory-storage.js";

function setup() {
  let tick = 0;
  let idTick = 0;
  const clock = () => `2026-08-02T${String(20 + Math.floor(tick / 60)).padStart(2, "0")}:${String(tick++ % 60).padStart(2, "0")}:00.000Z`;
  const repository = new StateRepository({
    storage: new LocalStorageAdapter(new MemoryStorage(), "study-stack"),
    config: APP_CONFIG,
    createInitialState,
    migrationRunner: new MigrationRunner(APP_CONFIG.storage.schemaVersion),
    clock,
  });
  repository.initialize();
  repository.transaction((draft) => {
    draft.collections.subjects["subject-1"] = {
      id: "subject-1",
      lastActivityAt: null,
      updatedAt: clock(),
      entityVersion: 1,
    };
  });

  const recordService = new RecordService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator: (prefix) => `${prefix}-${++idTick}`,
  });
  const record = recordService.create({
    subjectId: "subject-1",
    type: "summary",
    title: "Resumo inicial",
    status: "draft",
    studyDate: "2026-08-02",
    tags: [],
    personalNotes: "",
    isImportant: false,
  });
  const service = new SummaryService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator: (prefix) => `${prefix}-${++idTick}`,
  });

  return { repository, record, recordService, service };
}

test("salva conteúdo específico e inclui texto no índice de busca", () => {
  const { record, recordService, service } = setup();
  const view = service.save(record.id, {
    record: { title: "Cadeias e teias" },
    summary: {
      mainContent: { content: "<p>Produtores iniciam o fluxo de energia.</p>" },
      sourceType: "class",
    },
    status: "in_progress",
    isStudied: false,
  });

  assert.equal(view.record.status, "in_progress");
  assert.equal(view.summary.sourceType, "class");
  assert.equal(
    recordService.listBySubject("subject-1", { search: "produtores" }).length,
    1,
  );
});

test("infere conclusão quando título e conteúdo principal estão válidos", () => {
  const { record, service } = setup();
  const completed = service.save(record.id, {
    record: { title: "Resumo completo" },
    summary: { mainContent: "Conteúdo principal válido." },
    status: "draft",
  });

  assert.equal(completed.record.status, "completed");
  assert.ok(completed.record.completedAt);
});

test("bloqueia conclusão sem título e conteúdo principal", () => {
  const { record, service } = setup();

  assert.throws(
    () =>
      service.save(record.id, {
        record: { title: "" },
        summary: { mainContent: "" },
        status: "completed",
      }),
    /título e conteúdo principal/,
  );
});

test("conclui Resumo válido e permite reabertura", () => {
  const { record, service } = setup();
  const completed = service.save(record.id, {
    record: { title: "Resumo completo" },
    summary: { mainContent: "Conteúdo principal válido." },
    status: "completed",
  });
  const reopened = service.save(record.id, { status: "in_progress" });

  assert.equal(completed.record.status, "completed");
  assert.ok(completed.record.completedAt);
  assert.equal(reopened.record.status, "in_progress");
});

test("marca estudo sem alterar o status do Record", () => {
  const { record, service } = setup();
  const studied = service.toggleStudied(record.id);

  assert.equal(studied.summary.isStudied, true);
  assert.equal(studied.record.status, "draft");
  assert.equal(studied.summary.studyMarkHistory.length, 1);
});

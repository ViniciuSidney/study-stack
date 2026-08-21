import test from "node:test";
import assert from "node:assert/strict";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { DataResetService } from "../../scripts/services/data-reset-service.js";
import { RecordService } from "../../scripts/services/record-service.js";
import { LocalStorageAdapter } from "../../scripts/storage/local-storage-adapter.js";
import { MigrationRunner } from "../../scripts/storage/migrations/migration-runner.js";
import { StateRepository } from "../../scripts/storage/state-repository.js";
import { createInitialState } from "../../scripts/storage/state-schema.js";
import { MemoryStorage } from "../fixtures/memory-storage.js";

function setup() {
  let tick = 0;
  const clock = () => `2026-08-21T15:${String(tick++).padStart(2, "0")}:00.000Z`;
  const storage = new LocalStorageAdapter(new MemoryStorage(), "study-stack");
  const repository = new StateRepository({
    storage,
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
    draft.collections.settings.global.ui.theme = "dark";
    draft.collections.integrationState.global.conceptCompass.status = "connected";
  });

  const records = new RecordService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator: () => "record-1",
  });
  records.create({
    subjectId: "subject-1",
    type: "summary",
    title: "Resumo para exclusão",
    status: "draft",
    studyDate: "2026-08-21",
    tags: [],
    personalNotes: "",
    isImportant: false,
  });

  const service = new DataResetService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    schemaVersion: APP_CONFIG.storage.schemaVersion,
    preferenceDefaults: APP_CONFIG.preferenceDefaults,
  });

  return { repository, service };
}

test("exclusão de estudo preserva preferências e integrações e cria recuperação", () => {
  const { repository, service } = setup();
  const summary = service.getStudyDataSummary();

  assert.equal(summary.subjects, 1);
  assert.equal(summary.records, 1);

  const result = service.deleteStudyData();

  assert.equal(repository.getEntity("subjects", "subject-1"), null);
  assert.equal(repository.getEntity("records", "record-1"), null);
  assert.equal(repository.getEntity("settings", "global").ui.theme, "dark");
  assert.equal(
    repository.getEntity("integrationState", "global").conceptCompass.status,
    "connected",
  );
  assert.equal(result.recoveryPointCreated, true);
  assert.ok(repository.getRecoveryPoint());
});

test("redefinição completa volta preferências e integrações ao estado inicial", () => {
  const { repository, service } = setup();

  service.deleteStudyData();
  assert.ok(repository.getRecoveryPoint());

  service.resetApplication();

  assert.equal(
    repository.getEntity("settings", "global").ui.theme,
    APP_CONFIG.preferenceDefaults.theme,
  );
  assert.equal(
    repository.getEntity("integrationState", "global").conceptCompass.status,
    "idle",
  );
  assert.equal(repository.getRecoveryPoint(), null);
  assert.equal(Object.keys(repository.getCollection("records")).length, 0);
});

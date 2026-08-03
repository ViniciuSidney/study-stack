import test from "node:test";
import assert from "node:assert/strict";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { createBackupEnvelope } from "../../scripts/domain/backup.js";
import { BackupService } from "../../scripts/services/backup-service.js";
import { LocalStorageAdapter } from "../../scripts/storage/local-storage-adapter.js";
import { MigrationRunner } from "../../scripts/storage/migrations/migration-runner.js";
import { StateRepository } from "../../scripts/storage/state-repository.js";
import { createInitialState } from "../../scripts/storage/state-schema.js";
import { MemoryStorage } from "../fixtures/memory-storage.js";

function setup() {
  let tick = 0;
  const clock = () => `2026-08-03T14:00:${String(tick++).padStart(2, "0")}.000Z`;
  const storage = new LocalStorageAdapter(new MemoryStorage(), "study-stack");
  const repository = new StateRepository({
    storage,
    config: APP_CONFIG,
    createInitialState,
    migrationRunner: new MigrationRunner(APP_CONFIG.storage.schemaVersion),
    clock,
  });
  repository.initialize();
  const service = new BackupService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    schemaVersion: APP_CONFIG.storage.schemaVersion,
    idGenerator: () => "backup-test",
  });
  return { repository, service };
}

test("cria JSON restaurável e registra o momento do backup", () => {
  const { repository, service } = setup();
  const result = service.createBackup();

  assert.match(result.fileName, /^study-stack-backup-/);
  assert.equal(service.parse(result.json).exportId, "backup-test");
  assert.ok(repository.getEntity("settings", "global").lastBackupAt);
});

test("substituição cria ponto de recuperação e permite desfazer", () => {
  const { repository, service } = setup();
  const incomingState = repository.getState();
  incomingState.collections.subjects.alpha = { id: "alpha", entityVersion: 1 };
  const replacement = createBackupEnvelope({
    state: incomingState,
    appVersion: APP_CONFIG.appVersion,
    now: "2026-08-03T14:10:00.000Z",
    exportId: "replacement",
  });

  service.restore(replacement, "replace");
  assert.equal(repository.getEntity("subjects", "alpha").id, "alpha");
  assert.ok(repository.getRecoveryPoint());

  service.restoreRecoveryPoint();
  assert.equal(repository.getEntity("subjects", "alpha"), null);
  assert.equal(repository.getRecoveryPoint(), null);
});

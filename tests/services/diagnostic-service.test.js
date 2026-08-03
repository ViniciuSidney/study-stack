import test from "node:test";
import assert from "node:assert/strict";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { DiagnosticService } from "../../scripts/services/diagnostic-service.js";
import { LocalStorageAdapter } from "../../scripts/storage/local-storage-adapter.js";
import { MigrationRunner } from "../../scripts/storage/migrations/migration-runner.js";
import { StateRepository } from "../../scripts/storage/state-repository.js";
import { createInitialState } from "../../scripts/storage/state-schema.js";
import { MemoryStorage } from "../fixtures/memory-storage.js";

function setup() {
  const storage = new LocalStorageAdapter(new MemoryStorage(), "study-stack");
  const repository = new StateRepository({
    storage,
    config: APP_CONFIG,
    createInitialState,
    migrationRunner: new MigrationRunner(APP_CONFIG.storage.schemaVersion),
    clock: () => "2026-08-03T14:00:00.000Z",
  });
  repository.initialize();
  const service = new DiagnosticService({
    repository,
    clock: () => "2026-08-03T14:05:00.000Z",
    schemaVersion: APP_CONFIG.storage.schemaVersion,
  });
  return { repository, service };
}

test("estado inicial recebe diagnóstico saudável", () => {
  const { service } = setup();
  const report = service.run();

  assert.equal(report.status, "healthy");
  assert.equal(report.validationErrors.length, 0);
  assert.ok(report.storageBytes > 0);
});

test("importação pendente produz diagnóstico de atenção", () => {
  const { repository, service } = setup();
  repository.transaction((draft) => {
    draft.collections.pendingImports.pending = {
      id: "pending",
      receivedAt: "2026-08-03T14:00:00.000Z",
      resolvedAt: null,
      entityVersion: 1,
    };
  });

  const report = service.run();
  assert.equal(report.status, "warning");
  assert.equal(report.pendingImports.length, 1);
  assert.match(report.warnings.join(" "), /aguardam revisão/);
});


test("registra evento técnico sem armazenar conteúdo integral do estudo", () => {
  const { repository, service } = setup();
  service.record({
    category: "restore",
    operation: "preview_restore",
    message: "Backup incompatível.",
  });

  const logs = Object.values(repository.getCollection("technicalLogs"));
  assert.equal(logs.length, 1);
  assert.equal(logs[0].category, "restore");
  assert.equal(logs[0].message, "Backup incompatível.");
});

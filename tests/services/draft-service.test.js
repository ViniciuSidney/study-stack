import test from "node:test";
import assert from "node:assert/strict";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { DraftService } from "../../scripts/services/draft-service.js";
import { LocalStorageAdapter } from "../../scripts/storage/local-storage-adapter.js";
import { MigrationRunner } from "../../scripts/storage/migrations/migration-runner.js";
import { StateRepository } from "../../scripts/storage/state-repository.js";
import { createInitialState } from "../../scripts/storage/state-schema.js";
import { MemoryStorage } from "../fixtures/memory-storage.js";

function setup() {
  let tick = 0;
  const repository = new StateRepository({
    storage: new LocalStorageAdapter(new MemoryStorage(), "study-stack"),
    config: APP_CONFIG,
    createInitialState,
    migrationRunner: new MigrationRunner(APP_CONFIG.storage.schemaVersion),
    clock: () => `2026-08-02T22:00:0${tick++}.000Z`,
  });
  repository.initialize();

  return {
    repository,
    service: new DraftService({
      repository,
      clock: () => `2026-08-02T23:00:0${tick++}.000Z`,
    }),
  };
}

test("salva e recupera um buffer estável por tipo e Record", () => {
  const { service } = setup();
  const buffer = service.save({
    subjectId: "subject-1",
    recordId: "record-1",
    recordType: "summary",
    modalInstanceId: "modal-1",
    originalState: { title: "Antes" },
    workingState: { title: "Depois" },
  });

  assert.equal(buffer.id, "draft-summary-record-1");
  assert.equal(service.get("summary", "record-1").workingState.title, "Depois");
});

test("novo autosave preserva originalState da primeira abertura", () => {
  const { service } = setup();
  service.save({
    subjectId: "subject-1",
    recordId: "record-1",
    recordType: "summary",
    modalInstanceId: "modal-1",
    originalState: { title: "Original" },
    workingState: { title: "Versão 1" },
  });
  const next = service.save({
    subjectId: "subject-1",
    recordId: "record-1",
    recordType: "summary",
    modalInstanceId: "modal-1",
    originalState: { title: "Não substituir" },
    workingState: { title: "Versão 2" },
  });

  assert.equal(next.originalState.title, "Original");
  assert.equal(next.workingState.title, "Versão 2");
});

test("remove buffer sem afetar o restante do estado", () => {
  const { repository, service } = setup();
  service.save({
    subjectId: "subject-1",
    recordId: "record-1",
    recordType: "summary",
    modalInstanceId: "modal-1",
    originalState: {},
    workingState: {},
  });

  assert.equal(service.remove("summary", "record-1"), true);
  assert.equal(service.get("summary", "record-1"), null);
  assert.ok(repository.getEntity("settings", "global"));
});

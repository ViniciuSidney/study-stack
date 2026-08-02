import test from "node:test";
import assert from "node:assert/strict";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { LocalStorageAdapter } from "../../scripts/storage/local-storage-adapter.js";
import { MigrationRunner } from "../../scripts/storage/migrations/migration-runner.js";
import { StateRepository } from "../../scripts/storage/state-repository.js";
import { createInitialState } from "../../scripts/storage/state-schema.js";
import { MemoryStorage } from "../fixtures/memory-storage.js";

function createRepository(memory = new MemoryStorage()) {
  let tick = 0;
  const storage = new LocalStorageAdapter(memory, "study-stack");
  const repository = new StateRepository({
    storage,
    config: APP_CONFIG,
    createInitialState,
    migrationRunner: new MigrationRunner("1.0.0"),
    clock: () => `2026-08-02T21:00:0${tick++}.000Z`,
  });

  return { repository, storage, memory };
}

test("inicializa e persiste o estado quando a chave ainda não existe", () => {
  const { repository, memory } = createRepository();
  const state = repository.initialize();

  assert.equal(state.schemaVersion, "1.0.0");
  assert.equal(memory.values.has("study-stack:v1:state"), true);
});

test("transação atualiza coleção, integridade e updatedAt", () => {
  const { repository } = createRepository();
  const initial = repository.initialize();

  repository.transaction((draft) => {
    draft.collections.subjects.alpha = {
      id: "alpha",
      entityVersion: 1,
    };
  });

  const next = repository.getState();
  assert.equal(next.integrity.collectionCounts.subjects, 1);
  assert.notEqual(next.updatedAt, initial.updatedAt);
});

test("getState retorna cópia sem permitir mutação externa", () => {
  const { repository } = createRepository();
  repository.initialize();
  const snapshot = repository.getState();
  snapshot.collections.settings.global.ui.theme = "dark";

  assert.equal(
    repository.getEntity("settings", "global").ui.theme,
    "system",
  );
});

test("rejeita schema incompatível antes de abrir o estado", () => {
  const memory = new MemoryStorage({
    "study-stack:v1:state": JSON.stringify({
      schemaVersion: "9.0.0",
    }),
  });
  const { repository } = createRepository(memory);

  assert.throws(() => repository.initialize(), /não é compatível/);
});

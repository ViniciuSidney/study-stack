import test from "node:test";
import assert from "node:assert/strict";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { PreferencesService } from "../../scripts/services/preferences-service.js";
import { LocalStorageAdapter } from "../../scripts/storage/local-storage-adapter.js";
import { MigrationRunner } from "../../scripts/storage/migrations/migration-runner.js";
import { StateRepository } from "../../scripts/storage/state-repository.js";
import { createInitialState } from "../../scripts/storage/state-schema.js";
import { MemoryStorage } from "../fixtures/memory-storage.js";

function setup(legacy = null) {
  const memory = new MemoryStorage();
  const storage = new LocalStorageAdapter(memory, "study-stack");
  const repository = new StateRepository({
    storage,
    config: APP_CONFIG,
    createInitialState,
    migrationRunner: new MigrationRunner("1.0.0"),
    clock: () => "2026-08-02T21:00:00.000Z",
  });
  repository.initialize();

  if (legacy) {
    storage.set("preferences", legacy);
  }

  const service = new PreferencesService({
    repository,
    legacyStorage: storage,
    defaults: APP_CONFIG.preferenceDefaults,
    clock: () => "2026-08-02T22:00:00.000Z",
  });

  return { repository, storage, service };
}

test("carrega preferências da coleção settings", () => {
  const { service } = setup();
  const preferences = service.load();

  assert.equal(preferences.theme, "system");
  assert.equal(preferences.sidebarOpen, true);
});

test("migra a antiga chave preferences uma única vez", () => {
  const { repository, storage, service } = setup({
    theme: "dark",
    sidebarOpen: false,
  });
  const preferences = service.load();
  const settings = repository.getEntity("settings", "global");

  assert.equal(preferences.theme, "dark");
  assert.equal(settings.ui.sidebarOpen, false);
  assert.equal(storage.get("preferences", null), null);
  assert.ok(settings.legacyPreferencesMigratedAt);
});

test("reset preserva entidade settings e restaura apenas UI", () => {
  const { repository, service } = setup();
  const changed = service.update(service.load(), { theme: "dark" });
  assert.equal(changed.theme, "dark");

  const reset = service.reset();
  const settings = repository.getEntity("settings", "global");
  assert.equal(reset.theme, "system");
  assert.equal(settings.id, "global");
  assert.equal(settings.defaultProgressGoal, 10);
});

import test from "node:test";
import assert from "node:assert/strict";

import { COLLECTION_NAMES } from "../../scripts/config/storage-config.js";
import { createInitialState } from "../../scripts/storage/state-schema.js";
import { validateState } from "../../scripts/storage/state-validator.js";

const NOW = "2026-08-02T21:00:00.000Z";

function createState() {
  return createInitialState({
    now: NOW,
    appVersion: "0.1.0-dev.2",
    schemaVersion: "1.0.0",
    preferenceDefaults: {
      theme: "system",
      sidebarOpen: true,
      showCounters: true,
      reducedMotion: false,
      startSection: "overview",
    },
  });
}

test("cria todas as coleções previstas no schema v1", () => {
  const state = createState();

  assert.deepEqual(Object.keys(state.collections), [...COLLECTION_NAMES]);
  assert.equal(state.collections.settings.global.id, "global");
  assert.equal(state.collections.integrationState.global.id, "global");
});

test("estado inicial passa pela validação estrutural", () => {
  const result = validateState(createState(), "1.0.0");

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validação detecta coleção ausente e ID divergente", () => {
  const state = createState();
  delete state.collections.records;
  state.collections.settings.global.id = "outro";
  const result = validateState(state, "1.0.0");

  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /records/);
  assert.match(result.errors.join(" "), /identificador divergente/);
});

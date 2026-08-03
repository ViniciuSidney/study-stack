import test from "node:test";
import assert from "node:assert/strict";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import {
  buildRestorePreview,
  createBackupEnvelope,
  validateBackupEnvelope,
} from "../../scripts/domain/backup.js";
import { createInitialState } from "../../scripts/storage/state-schema.js";

function createState(now = "2026-08-03T14:00:00.000Z") {
  return createInitialState({
    now,
    appVersion: APP_CONFIG.appVersion,
    schemaVersion: APP_CONFIG.storage.schemaVersion,
    preferenceDefaults: APP_CONFIG.preferenceDefaults,
  });
}

test("backup separa rascunhos e passa pela validação integral", () => {
  const state = createState();
  state.collections.draftBuffers.draft1 = {
    id: "draft1",
    entityVersion: 1,
  };

  const backup = createBackupEnvelope({
    state,
    appVersion: APP_CONFIG.appVersion,
    now: "2026-08-03T14:05:00.000Z",
    exportId: "backup-1",
  });
  const validation = validateBackupEnvelope(
    backup,
    APP_CONFIG.storage.schemaVersion,
  );

  assert.equal(Object.keys(backup.data.collections.draftBuffers).length, 0);
  assert.equal(Object.keys(backup.drafts).length, 1);
  assert.equal(validation.valid, true);
  assert.equal(validation.summary.draftCount, 1);
});

test("alteração no conteúdo invalida a assinatura do backup", () => {
  const backup = structuredClone(
    createBackupEnvelope({
      state: createState(),
      appVersion: APP_CONFIG.appVersion,
      now: "2026-08-03T14:05:00.000Z",
      exportId: "backup-2",
    }),
  );
  backup.data.appVersion = "alterado";

  const validation = validateBackupEnvelope(
    backup,
    APP_CONFIG.storage.schemaVersion,
  );

  assert.equal(validation.valid, false);
  assert.match(validation.errors.join(" "), /assinatura de integridade/);
});

test("mesclagem adiciona entidades novas e preserva conflitos", () => {
  const current = createState();
  const incoming = createState("2026-08-01T14:00:00.000Z");
  incoming.collections.subjects.alpha = { id: "alpha", entityVersion: 1 };
  incoming.collections.settings.global.ui.theme = "dark";
  const envelope = createBackupEnvelope({
    state: incoming,
    appVersion: APP_CONFIG.appVersion,
    now: "2026-08-03T14:05:00.000Z",
    exportId: "backup-3",
  });

  const preview = buildRestorePreview({
    currentState: current,
    envelope,
    mode: "merge",
    expectedSchemaVersion: APP_CONFIG.storage.schemaVersion,
  });

  assert.equal(preview.valid, true);
  assert.equal(preview.additions.subjects, 1);
  assert.equal(preview.candidate.collections.subjects.alpha.id, "alpha");
  assert.equal(preview.candidate.collections.settings.global.ui.theme, "system");
  assert.equal(
    preview.conflicts.some((conflict) => conflict.collectionName === "settings"),
    true,
  );
});

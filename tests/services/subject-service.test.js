import test from "node:test";
import assert from "node:assert/strict";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { normalizeSubjectContext } from "../../scripts/domain/subject-context.js";
import { SubjectService } from "../../scripts/services/subject-service.js";
import { LocalStorageAdapter } from "../../scripts/storage/local-storage-adapter.js";
import { MigrationRunner } from "../../scripts/storage/migrations/migration-runner.js";
import { StateRepository } from "../../scripts/storage/state-repository.js";
import { createInitialState } from "../../scripts/storage/state-schema.js";
import { MemoryStorage } from "../fixtures/memory-storage.js";
import { VALID_SUBJECT_CONTEXT } from "../fixtures/subject-context.js";

function setup() {
  let tick = 0;
  const repository = new StateRepository({
    storage: new LocalStorageAdapter(
      new MemoryStorage(),
      "study-stack",
    ),
    config: APP_CONFIG,
    createInitialState,
    migrationRunner: new MigrationRunner("1.0.0"),
    clock: () => `2026-08-02T21:00:0${tick++}.000Z`,
  });
  repository.initialize();
  const service = new SubjectService({
    repository,
    clock: () => `2026-08-02T22:00:0${tick++}.000Z`,
    appVersion: APP_CONFIG.appVersion,
  });

  return { repository, service };
}

test("primeira sincronização cria Subject sem gerar evento de atividade", () => {
  const { repository, service } = setup();
  const subject = service.synchronize(
    normalizeSubjectContext(VALID_SUBJECT_CONTEXT),
  );

  assert.equal(subject.subjectName, "Cadeias e Teias Alimentares");
  assert.equal(Object.keys(repository.getCollection("subjects")).length, 1);
  assert.equal(
    Object.keys(repository.getCollection("historyEvents")).length,
    0,
  );
});

test("nova abertura do mesmo assunto continua sem criar histórico técnico", () => {
  const { repository, service } = setup();
  const context = normalizeSubjectContext(VALID_SUBJECT_CONTEXT);
  service.synchronize(context);
  service.synchronize(context);

  assert.equal(Object.keys(repository.getCollection("subjects")).length, 1);
  assert.equal(
    Object.keys(repository.getCollection("historyEvents")).length,
    0,
  );
});

test("contexto inválido é registrado no estado de integração", () => {
  const { repository, service } = setup();
  service.registerContextIssue({
    contractVersion: "9.0.0",
    errors: ["Contrato incompatível."],
  });
  const integration = repository.getEntity("integrationState", "global");

  assert.equal(integration.conceptCompass.status, "invalid_context");
  assert.match(integration.conceptCompass.lastIssue, /incompatível/);
});

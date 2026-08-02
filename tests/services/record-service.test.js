import test from "node:test";
import assert from "node:assert/strict";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { RecordService } from "../../scripts/services/record-service.js";
import { LocalStorageAdapter } from "../../scripts/storage/local-storage-adapter.js";
import { MigrationRunner } from "../../scripts/storage/migrations/migration-runner.js";
import { StateRepository } from "../../scripts/storage/state-repository.js";
import { createInitialState } from "../../scripts/storage/state-schema.js";
import { MemoryStorage } from "../fixtures/memory-storage.js";

function setup() {
  let clockTick = 0;
  let idTick = 0;
  const memory = new MemoryStorage();
  const storage = new LocalStorageAdapter(memory, "study-stack");
  const repository = new StateRepository({
    storage,
    config: APP_CONFIG,
    createInitialState,
    migrationRunner: new MigrationRunner(APP_CONFIG.storage.schemaVersion),
    clock: () => `2026-08-02T22:${String(clockTick++).padStart(2, "0")}:00.000Z`,
  });
  repository.initialize();
  repository.transaction((draft) => {
    draft.collections.subjects["subject-1"] = {
      id: "subject-1",
      lastActivityAt: null,
      updatedAt: "2026-08-02T22:00:00.000Z",
      entityVersion: 1,
    };
  });

  const service = new RecordService({
    repository,
    clock: () => `2026-08-02T23:${String(clockTick++).padStart(2, "0")}:00.000Z`,
    appVersion: APP_CONFIG.appVersion,
    idGenerator: (prefix) => `${prefix}-${++idTick}`,
  });

  return { repository, service };
}

function input(overrides = {}) {
  return {
    subjectId: "subject-1",
    type: "summary",
    title: "Resumo inicial",
    status: "draft",
    studyDate: "2026-08-02",
    tags: [],
    personalNotes: "",
    isImportant: false,
    ...overrides,
  };
}

test("cria Record, atualiza o Subject e registra histórico", () => {
  const { repository, service } = setup();
  const record = service.create(input());
  const subject = repository.getEntity("subjects", "subject-1");
  const events = service.listHistory("subject-1");

  assert.equal(record.id, "record-1");
  assert.equal(subject.lastActivityAt, record.createdAt);
  assert.equal(events.length, 1);
  assert.equal(events[0].eventType, "created");
  assert.equal(service.getCounts("subject-1").summaries, 1);
  assert.equal(repository.getEntity("summaries", record.id).recordId, record.id);
});

test("rejeita criação manual de tipo reservado à integração", () => {
  const { service } = setup();

  assert.throws(
    () => service.create(input({ type: "imported_session" })),
    /apenas para Resumos e Anotações/,
  );
});

test("edita, altera status e marca como importante", () => {
  const { service } = setup();
  const record = service.create(input());

  service.update(record.id, {
    title: "Resumo revisado",
    tags: ["ecologia"],
    personalNotes: "Leitura concluída parcialmente.",
    isImportant: false,
  });
  service.changeStatus(record.id, "in_progress");
  const important = service.toggleImportant(record.id);

  assert.equal(important.title, "Resumo revisado");
  assert.equal(important.status, "in_progress");
  assert.equal(important.isImportant, true);
  assert.equal(service.listHistory("subject-1").length, 4);
});

test("arquiva e restaura preservando o mesmo ID", () => {
  const { service } = setup();
  const record = service.create(input({ type: "note" }));

  service.archive(record.id, "Organização");
  assert.equal(service.listBySubject("subject-1").length, 0);
  assert.equal(
    service.listBySubject("subject-1", { archived: true }).length,
    1,
  );
  assert.equal(service.getCounts("subject-1").archived, 1);

  const restored = service.restore(record.id);
  assert.equal(restored.id, record.id);
  assert.equal(restored.archivedAt, null);
  assert.equal(service.getCounts("subject-1").notes, 1);
});

test("lista registros por tipo, status, importância e busca", () => {
  const { service } = setup();
  service.create(input({ title: "Produtores", isImportant: true }));
  service.create(
    input({
      type: "note",
      title: "Consumidores",
      status: "in_progress",
    }),
  );

  assert.equal(
    service.listBySubject("subject-1", { type: "summary" }).length,
    1,
  );
  assert.equal(
    service.listBySubject("subject-1", { status: "in_progress" }).length,
    1,
  );
  assert.equal(
    service.listBySubject("subject-1", { importantOnly: true }).length,
    1,
  );
  assert.equal(
    service.listBySubject("subject-1", { search: "consumidores" }).length,
    1,
  );
});

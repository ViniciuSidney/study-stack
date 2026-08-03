import test from "node:test";
import assert from "node:assert/strict";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { NoteService } from "../../scripts/services/note-service.js";
import { RecordService } from "../../scripts/services/record-service.js";
import { LocalStorageAdapter } from "../../scripts/storage/local-storage-adapter.js";
import { MigrationRunner } from "../../scripts/storage/migrations/migration-runner.js";
import { StateRepository } from "../../scripts/storage/state-repository.js";
import { createInitialState } from "../../scripts/storage/state-schema.js";
import { MemoryStorage } from "../fixtures/memory-storage.js";

function setup() {
  let tick = 0;
  let idTick = 0;
  const clock = () =>
    `2026-08-03T${String(10 + Math.floor(tick / 60)).padStart(2, "0")}:${String(
      tick++ % 60,
    ).padStart(2, "0")}:00.000Z`;
  const repository = new StateRepository({
    storage: new LocalStorageAdapter(new MemoryStorage(), "study-stack"),
    config: APP_CONFIG,
    createInitialState,
    migrationRunner: new MigrationRunner(APP_CONFIG.storage.schemaVersion),
    clock,
  });
  repository.initialize();
  repository.transaction((draft) => {
    for (const id of ["subject-1", "subject-2"]) {
      draft.collections.subjects[id] = {
        id,
        lastActivityAt: null,
        updatedAt: clock(),
        entityVersion: 1,
      };
    }
  });

  const idGenerator = (prefix) => `${prefix}-${++idTick}`;
  const recordService = new RecordService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator,
  });
  const noteService = new NoteService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator,
  });

  return { repository, recordService, noteService };
}

function createNote(recordService, overrides = {}) {
  return recordService.create({
    subjectId: "subject-1",
    type: "note",
    title: "Anotação inicial",
    status: "draft",
    studyDate: "2026-08-03",
    tags: [],
    personalNotes: "",
    isImportant: false,
    ...overrides,
  });
}

test("salva conteúdo da Anotação e o inclui na busca", () => {
  const { recordService, noteService } = setup();
  const record = createNote(recordService);
  const view = noteService.save(record.id, {
    record: { title: "Conexão ecológica" },
    note: { content: "Produtores sustentam o primeiro nível trófico." },
    status: "in_progress",
  });

  assert.equal(view.record.status, "in_progress");
  assert.equal(view.note.content.plainText.includes("Produtores"), true);
  assert.equal(
    recordService.listBySubject("subject-1", { search: "trofico" }).length,
    1,
  );
});

test("bloqueia conclusão sem título e conteúdo", () => {
  const { recordService, noteService } = setup();
  const record = createNote(recordService);

  assert.throws(
    () =>
      noteService.save(record.id, {
        record: { title: "" },
        note: { content: "" },
        status: "completed",
      }),
    /título e conteúdo/,
  );
});

test("vincula apenas registros do mesmo assunto", () => {
  const { recordService, noteService } = setup();
  const note = createNote(recordService);
  const summary = recordService.create({
    subjectId: "subject-1",
    type: "summary",
    title: "Resumo relacionado",
    status: "draft",
    studyDate: "2026-08-03",
    tags: [],
    personalNotes: "",
    isImportant: false,
  });
  const foreign = createNote(recordService, { subjectId: "subject-2" });

  const linked = noteService.save(note.id, {
    note: { content: "Ligação válida.", linkedRecordIds: [summary.id] },
  });
  assert.deepEqual(linked.note.linkedRecordIds, [summary.id]);

  assert.throws(
    () =>
      noteService.save(note.id, {
        note: { linkedRecordIds: [foreign.id] },
      }),
    /mesmo assunto/,
  );
});

test("cria Apenas um detalhe de forma atômica e deriva o título", () => {
  const { repository, noteService } = setup();
  const view = noteService.createQuickDetail({
    subjectId: "subject-1",
    title: "",
    content: "[ ] Confirmar consumidor secundário",
    studyDate: "2026-08-03",
    tags: ["dúvida"],
    isImportant: true,
  });

  assert.equal(view.record.title, "Confirmar consumidor secundário");
  assert.equal(view.record.status, "in_progress");
  assert.equal(view.note.createdFromQuickDetail, true);
  assert.equal(view.record.isImportant, true);
  assert.equal(repository.getEntity("notes", view.record.id).recordId, view.record.id);
});

test("registra a primeira abertura do detalhe no editor completo", () => {
  const { noteService } = setup();
  const quick = noteService.createQuickDetail({
    subjectId: "subject-1",
    content: "Uma observação curta.",
    studyDate: "2026-08-03",
  });
  const expanded = noteService.markExpanded(quick.record.id);
  const repeated = noteService.markExpanded(quick.record.id);

  assert.ok(expanded.note.quickDetailExpandedAt);
  assert.equal(
    repeated.note.quickDetailExpandedAt,
    expanded.note.quickDetailExpandedAt,
  );
});

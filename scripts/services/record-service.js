import {
  archiveRecord,
  changeRecordStatus,
  createRecord,
  isManualRecordType,
  restoreRecord,
  updateRecord,
  validateRecord,
} from "../domain/record.js";
import { createRichContent } from "../domain/rich-content.js";
import { createId } from "../utils/id.js";

const TYPE_LABELS = Object.freeze({
  summary: "Resumo",
  note: "Anotação",
  imported_session: "Lista importada",
  error_record: "Registro de erro",
});

const STATUS_LABELS = Object.freeze({
  draft: "Rascunho",
  in_progress: "Em andamento",
  completed: "Concluído",
});


function createSpecificEntity(record, now) {
  if (record.type === "summary") {
    return {
      collection: "summaries",
      entity: {
        id: record.id,
        recordId: record.id,
        mainContent: createRichContent("", now),
        studyObjective: null,
        keyConcepts: null,
        examples: null,
        remainingQuestions: null,
        synthesis: null,
        sourceType: null,
        sourceDescription: null,
        references: [],
        isStudied: false,
        studiedAt: null,
        studyMarkHistory: [],
        entityVersion: 1,
      },
    };
  }

  return {
    collection: "notes",
    entity: {
      id: record.id,
      recordId: record.id,
      content: createRichContent("", now),
      linkedRecordIds: [],
      createdFromQuickDetail: false,
      quickDetailExpandedAt: null,
      entityVersion: 1,
    },
  };
}

function compareRecords(a, b) {
  return (
    b.studyDate.localeCompare(a.studyDate) ||
    b.updatedAt.localeCompare(a.updatedAt) ||
    a.title.localeCompare(b.title, "pt-BR")
  );
}

export class RecordService {
  constructor({ repository, clock, appVersion, idGenerator = createId }) {
    this.repository = repository;
    this.clock = clock;
    this.appVersion = appVersion;
    this.idGenerator = idGenerator;
  }

  create(input) {
    this.#assertSubject(input.subjectId);

    if (!isManualRecordType(input.type)) {
      throw new TypeError(
        "A criação manual está disponível apenas para Resumos e Anotações.",
      );
    }

    const now = this.clock();
    const record = createRecord(
      {
        ...input,
        id: this.idGenerator("record"),
      },
      now,
    );

    const specific = createSpecificEntity(record, now);

    this.repository.transaction((draft) => {
      draft.collections.records[record.id] = record;
      draft.collections[specific.collection][record.id] = specific.entity;
      this.#touchSubject(draft, record.subjectId, now);
      this.#appendEvent(draft, {
        record,
        eventType: "created",
        summary: `${TYPE_LABELS[record.type]} criado como ${STATUS_LABELS[record.status].toLocaleLowerCase("pt-BR")}.`,
        now,
      });
    });

    return this.getById(record.id);
  }

  update(recordId, changes) {
    const current = this.#getRequired(recordId);
    const now = this.clock();
    const next = updateRecord(current, changes, now);

    this.repository.transaction((draft) => {
      draft.collections.records[recordId] = next;
      this.#touchSubject(draft, next.subjectId, now);
      this.#appendEvent(draft, {
        record: next,
        eventType: "edited",
        summary: `${TYPE_LABELS[next.type]} editado.`,
        now,
      });
    });

    return this.getById(recordId);
  }

  changeStatus(recordId, status, options = {}) {
    const current = this.#getRequired(recordId);
    const now = this.clock();
    const next = changeRecordStatus(current, status, now, options);

    this.repository.transaction((draft) => {
      draft.collections.records[recordId] = next;
      this.#touchSubject(draft, next.subjectId, now);
      this.#appendEvent(draft, {
        record: next,
        eventType: "status_changed",
        summary: `${TYPE_LABELS[next.type]} marcado como ${STATUS_LABELS[next.status].toLocaleLowerCase("pt-BR")}.`,
        now,
        metadata: { previousStatus: current.status, nextStatus: next.status },
      });
    });

    return this.getById(recordId);
  }

  toggleImportant(recordId) {
    const current = this.#getRequired(recordId);
    const now = this.clock();
    const next = updateRecord(
      current,
      { isImportant: !current.isImportant },
      now,
    );

    this.repository.transaction((draft) => {
      draft.collections.records[recordId] = next;
      this.#touchSubject(draft, next.subjectId, now);
      this.#appendEvent(draft, {
        record: next,
        eventType: next.isImportant
          ? "marked_important"
          : "unmarked_important",
        summary: next.isImportant
          ? `${TYPE_LABELS[next.type]} marcado como importante.`
          : `${TYPE_LABELS[next.type]} removido dos importantes.`,
        now,
      });
    });

    return this.getById(recordId);
  }

  archive(recordId, reason = "") {
    const current = this.#getRequired(recordId);
    const now = this.clock();
    const next = archiveRecord(current, now, reason);

    this.repository.transaction((draft) => {
      draft.collections.records[recordId] = next;
      this.#touchSubject(draft, next.subjectId, now);
      this.#appendEvent(draft, {
        record: next,
        eventType: "archived",
        summary: `${TYPE_LABELS[next.type]} arquivado.`,
        now,
        metadata: { reason: next.archiveReason },
      });
    });

    return this.getById(recordId);
  }

  restore(recordId) {
    const current = this.#getRequired(recordId);
    const now = this.clock();
    const next = restoreRecord(current, now);

    this.repository.transaction((draft) => {
      draft.collections.records[recordId] = next;
      this.#touchSubject(draft, next.subjectId, now);
      this.#appendEvent(draft, {
        record: next,
        eventType: "restored",
        summary: `${TYPE_LABELS[next.type]} restaurado.`,
        now,
      });
    });

    return this.getById(recordId);
  }

  getById(recordId) {
    return this.repository.getEntity("records", recordId);
  }

  listBySubject(subjectId, filters = {}) {
    const records = Object.values(this.repository.getCollection("records"));
    const archived = filters.archived ?? false;
    const search = String(filters.search ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLocaleLowerCase("pt-BR")
      .trim();

    return records
      .filter((record) => record.subjectId === subjectId)
      .filter((record) => Boolean(record.archivedAt) === archived)
      .filter((record) => !filters.type || record.type === filters.type)
      .filter((record) => !filters.status || record.status === filters.status)
      .filter((record) => !filters.importantOnly || record.isImportant)
      .filter((record) => !search || record.searchPlainText.includes(search))
      .sort(compareRecords);
  }

  getCounts(subjectId) {
    const all = Object.values(this.repository.getCollection("records")).filter(
      (record) => record.subjectId === subjectId,
    );
    const active = all.filter((record) => !record.archivedAt);

    return Object.freeze({
      total: active.length,
      summaries: active.filter((record) => record.type === "summary").length,
      notes: active.filter((record) => record.type === "note").length,
      exercises: active.filter((record) => record.type === "imported_session").length,
      errors: active.filter((record) => record.type === "error_record").length,
      archived: all.filter((record) => Boolean(record.archivedAt)).length,
      important: active.filter((record) => record.isImportant).length,
      drafts: active.filter((record) => record.status === "draft").length,
      inProgress: active.filter((record) => record.status === "in_progress").length,
      completed: active.filter((record) => record.status === "completed").length,
    });
  }

  listHistory(subjectId) {
    return Object.values(this.repository.getCollection("historyEvents"))
      .filter((event) => event.subjectId === subjectId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  #getRequired(recordId) {
    const record = this.getById(recordId);

    if (!record) {
      throw new RangeError("Registro não encontrado.");
    }

    const validation = validateRecord(record);

    if (!validation.valid) {
      throw new TypeError(validation.errors.join(" "));
    }

    return record;
  }

  #assertSubject(subjectId) {
    if (!this.repository.getEntity("subjects", subjectId)) {
      throw new RangeError("O assunto informado não existe.");
    }
  }

  #touchSubject(draft, subjectId, now) {
    const subject = draft.collections.subjects[subjectId];

    if (!subject) {
      throw new RangeError("O assunto informado não existe.");
    }

    subject.lastActivityAt = now;
    subject.updatedAt = now;
  }

  #appendEvent(draft, { record, eventType, summary, now, metadata = null }) {
    const id = this.idGenerator("history");
    draft.collections.historyEvents[id] = {
      id,
      subjectId: record.subjectId,
      entityType: "record",
      entityId: record.id,
      eventType,
      occurredAt: now,
      summary,
      metadata,
      origin: "user",
      appVersion: this.appVersion,
      entityVersion: 1,
    };
  }
}

import {
  changeRecordStatus,
  createRecord,
  refreshRecordSearchIndex,
  updateRecord,
  validateRecord,
} from "../domain/record.js";
import {
  createEmptyNote,
  deriveQuickDetailTitle,
  getChecklistStats,
  getNoteSearchText,
  isNoteCompletionReady,
  markQuickDetailExpanded,
  updateNote,
  validateNote,
} from "../domain/note.js";
import { createId } from "../utils/id.js";

const STATUS_LABELS = Object.freeze({
  draft: "rascunho",
  in_progress: "em andamento",
  completed: "concluída",
});

function normalizeString(value) {
  return String(value ?? "").trim();
}

function compareLinkOptions(a, b) {
  return (
    Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt)) ||
    b.studyDate.localeCompare(a.studyDate) ||
    a.title.localeCompare(b.title, "pt-BR")
  );
}

export class NoteService {
  constructor({ repository, clock, appVersion, idGenerator = createId }) {
    this.repository = repository;
    this.clock = clock;
    this.appVersion = appVersion;
    this.idGenerator = idGenerator;
  }

  getByRecordId(recordId) {
    return this.repository.getEntity("notes", recordId);
  }

  getView(recordId) {
    const record = this.#getRequiredRecord(recordId);
    const note = this.#getRequiredNote(recordId);
    const linkedRecords = this.#resolveLinkedRecords(note, record.subjectId);

    return Object.freeze({
      record,
      note,
      linkedRecords,
      completionReady: isNoteCompletionReady(note, record),
      checklist: getChecklistStats(note),
    });
  }

  listViewsBySubject(subjectId, records = null) {
    const source =
      records ?? Object.values(this.repository.getCollection("records"));

    return source
      .filter((record) => record.subjectId === subjectId)
      .filter((record) => record.type === "note")
      .map((record) => this.getView(record.id));
  }

  getLinkOptions(subjectId, excludeRecordId = null) {
    return Object.values(this.repository.getCollection("records"))
      .filter((record) => record.subjectId === subjectId)
      .filter((record) => record.id !== excludeRecordId)
      .sort(compareLinkOptions)
      .map((record) =>
        Object.freeze({
          id: record.id,
          title: record.title || "Registro sem título",
          type: record.type,
          status: record.status,
          studyDate: record.studyDate,
          archivedAt: record.archivedAt,
        }),
      );
  }

  save(recordId, input) {
    const currentRecord = this.#getRequiredRecord(recordId);
    const currentNote = this.#getRequiredNote(recordId);

    if (currentRecord.archivedAt) {
      throw new TypeError("Uma Anotação arquivada não pode ser editada.");
    }

    const now = this.clock();
    let nextRecord = updateRecord(currentRecord, input.record ?? {}, now);
    let nextNote = updateNote(currentNote, input.note ?? {}, now);
    const linkedRecords = this.#validateLinkedRecords(
      nextNote.linkedRecordIds,
      nextRecord,
    );
    const completionReady = isNoteCompletionReady(nextNote, nextRecord);
    const targetStatus = input.status ?? nextRecord.status;
    const statusChanged = targetStatus !== currentRecord.status;
    const linksChanged =
      JSON.stringify(currentNote.linkedRecordIds) !==
      JSON.stringify(nextNote.linkedRecordIds);

    if (targetStatus === "completed" && !completionReady) {
      throw new TypeError("A conclusão exige título e conteúdo válidos.");
    }

    if (targetStatus !== nextRecord.status) {
      nextRecord = changeRecordStatus(nextRecord, targetStatus, now, {
        completionReady,
      });
    }

    nextRecord = refreshRecordSearchIndex(
      nextRecord,
      getNoteSearchText(
        nextNote,
        linkedRecords.map((record) => record.title),
      ),
      now,
    );

    this.repository.transaction((draft) => {
      draft.collections.records[recordId] = nextRecord;
      draft.collections.notes[recordId] = nextNote;
      this.#touchSubject(draft, nextRecord.subjectId, now);
      this.#appendEvent(draft, {
        subjectId: nextRecord.subjectId,
        entityType: "note",
        entityId: recordId,
        eventType: "edited",
        summary: "Conteúdo da Anotação atualizado.",
        now,
      });

      if (statusChanged) {
        this.#appendEvent(draft, {
          subjectId: nextRecord.subjectId,
          entityType: "record",
          entityId: recordId,
          eventType: "status_changed",
          summary: `Anotação marcada como ${STATUS_LABELS[targetStatus]}.`,
          now,
          metadata: {
            previousStatus: currentRecord.status,
            nextStatus: targetStatus,
          },
        });
      }

      if (linksChanged) {
        this.#appendEvent(draft, {
          subjectId: nextRecord.subjectId,
          entityType: "note",
          entityId: recordId,
          eventType: "links_changed",
          summary: "Vínculos da Anotação atualizados.",
          now,
          metadata: {
            previousLinkedRecordIds: currentNote.linkedRecordIds,
            nextLinkedRecordIds: nextNote.linkedRecordIds,
          },
        });
      }
    });

    return this.getView(recordId);
  }

  createQuickDetail(input) {
    const subjectId = normalizeString(input?.subjectId);
    this.#assertSubject(subjectId);

    const now = this.clock();
    const content = input?.content;
    const provisionalNote = updateNote(
      createEmptyNote("temporary", now, { createdFromQuickDetail: true }),
      { content },
      now,
    );

    if (!provisionalNote.content.plainText) {
      throw new TypeError("Escreva o detalhe antes de salvar.");
    }

    const recordId = this.idGenerator("record");
    const explicitTitle = normalizeString(input?.title);
    const title =
      explicitTitle || deriveQuickDetailTitle(provisionalNote.content);
    let record = createRecord(
      {
        id: recordId,
        subjectId,
        type: "note",
        title,
        status: "in_progress",
        studyDate: input?.studyDate,
        tags: input?.tags ?? [],
        personalNotes: "",
        isImportant: Boolean(input?.isImportant),
      },
      now,
    );
    const note = updateNote(
      createEmptyNote(recordId, now, { createdFromQuickDetail: true }),
      { content },
      now,
    );
    record = refreshRecordSearchIndex(
      record,
      getNoteSearchText(note),
      now,
    );

    this.repository.transaction((draft) => {
      draft.collections.records[recordId] = record;
      draft.collections.notes[recordId] = note;
      this.#touchSubject(draft, subjectId, now);
      this.#appendEvent(draft, {
        subjectId,
        entityType: "note",
        entityId: recordId,
        eventType: "quick_detail_created",
        summary: "Anotação criada pelo fluxo Apenas um detalhe.",
        now,
      });
    });

    return this.getView(recordId);
  }

  markExpanded(recordId) {
    const record = this.#getRequiredRecord(recordId);
    const currentNote = this.#getRequiredNote(recordId);

    if (!currentNote.createdFromQuickDetail || currentNote.quickDetailExpandedAt) {
      return this.getView(recordId);
    }

    const now = this.clock();
    const nextNote = markQuickDetailExpanded(currentNote, now);

    this.repository.transaction((draft) => {
      draft.collections.notes[recordId] = nextNote;
      this.#touchSubject(draft, record.subjectId, now);
      this.#appendEvent(draft, {
        subjectId: record.subjectId,
        entityType: "note",
        entityId: recordId,
        eventType: "quick_detail_expanded",
        summary: "Detalhe rápido aberto no editor completo.",
        now,
      });
    });

    return this.getView(recordId);
  }

  #resolveLinkedRecords(note, subjectId) {
    return note.linkedRecordIds
      .map((id) => this.repository.getEntity("records", id))
      .filter((record) => record?.subjectId === subjectId);
  }

  #validateLinkedRecords(ids, ownerRecord) {
    return ids.map((id) => {
      const linked = this.repository.getEntity("records", id);

      if (!linked) {
        throw new RangeError(`O registro vinculado ${id} não existe.`);
      }

      if (linked.subjectId !== ownerRecord.subjectId) {
        throw new TypeError(
          "Anotações só podem vincular registros do mesmo assunto.",
        );
      }

      if (linked.id === ownerRecord.id) {
        throw new TypeError("Uma Anotação não pode vincular a si mesma.");
      }

      return linked;
    });
  }

  #getRequiredRecord(recordId) {
    const record = this.repository.getEntity("records", recordId);

    if (!record) {
      throw new RangeError("Registro de Anotação não encontrado.");
    }

    if (record.type !== "note") {
      throw new TypeError("O registro informado não é uma Anotação.");
    }

    const validation = validateRecord(record);

    if (!validation.valid) {
      throw new TypeError(validation.errors.join(" "));
    }

    return record;
  }

  #getRequiredNote(recordId) {
    const note = this.getByRecordId(recordId);

    if (!note) {
      throw new RangeError("Conteúdo específico da Anotação não encontrado.");
    }

    const validation = validateNote(note);

    if (!validation.valid) {
      throw new TypeError(validation.errors.join(" "));
    }

    return note;
  }

  #assertSubject(subjectId) {
    if (!subjectId || !this.repository.getEntity("subjects", subjectId)) {
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

  #appendEvent(
    draft,
    {
      subjectId,
      entityType,
      entityId,
      eventType,
      summary,
      now,
      metadata = null,
    },
  ) {
    const id = this.idGenerator("history");
    draft.collections.historyEvents[id] = {
      id,
      subjectId,
      entityType,
      entityId,
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

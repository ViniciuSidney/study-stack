import {
  changeRecordStatus,
  refreshRecordSearchIndex,
  updateRecord,
  validateRecord,
} from "../domain/record.js";
import {
  getSummarySearchText,
  isSummaryCompletionReady,
  setSummaryStudied,
  updateSummary,
  validateSummary,
} from "../domain/summary.js";
import { createId } from "../utils/id.js";

const STATUS_LABELS = Object.freeze({
  draft: "rascunho",
  in_progress: "em andamento",
  completed: "concluído",
});

export class SummaryService {
  constructor({ repository, clock, appVersion, idGenerator = createId }) {
    this.repository = repository;
    this.clock = clock;
    this.appVersion = appVersion;
    this.idGenerator = idGenerator;
  }

  getByRecordId(recordId) {
    return this.repository.getEntity("summaries", recordId);
  }

  getView(recordId) {
    const record = this.#getRequiredRecord(recordId);
    const summary = this.#getRequiredSummary(recordId);

    return Object.freeze({
      record,
      summary,
      completionReady: isSummaryCompletionReady(summary, record),
    });
  }

  listViewsBySubject(subjectId, records = null) {
    const source = records ?? Object.values(this.repository.getCollection("records"));

    return source
      .filter((record) => record.subjectId === subjectId)
      .filter((record) => record.type === "summary")
      .map((record) => {
        const summary = this.getByRecordId(record.id);
        return {
          record,
          summary,
          completionReady: isSummaryCompletionReady(summary, record),
        };
      });
  }

  save(recordId, input) {
    const currentRecord = this.#getRequiredRecord(recordId);
    const currentSummary = this.#getRequiredSummary(recordId);

    if (currentRecord.archivedAt) {
      throw new TypeError("Um Resumo arquivado não pode ser editado.");
    }

    const now = this.clock();
    let nextRecord = updateRecord(currentRecord, input.record ?? {}, now);
    let nextSummary = updateSummary(currentSummary, input.summary ?? {}, now);
    const studiedChanged =
      Object.hasOwn(input ?? {}, "isStudied") &&
      Boolean(input.isStudied) !== currentSummary.isStudied;

    if (studiedChanged) {
      nextSummary = setSummaryStudied(
        nextSummary,
        input.isStudied,
        now,
        this.idGenerator("study-mark"),
      );
    }

    const completionReady = isSummaryCompletionReady(nextSummary, nextRecord);
    const explicitlyRequestedDifferentStatus =
      Object.hasOwn(input ?? {}, "status") &&
      input.status &&
      input.status !== currentRecord.status;
    const inferredStatus = completionReady
      ? "completed"
      : currentRecord.status === "completed"
        ? "in_progress"
        : currentRecord.status;
    const targetStatus = explicitlyRequestedDifferentStatus
      ? input.status
      : inferredStatus;
    const statusChanged = targetStatus !== currentRecord.status;

    if (targetStatus === "completed" && !completionReady) {
      throw new TypeError(
        "A conclusão exige título e conteúdo principal válidos.",
      );
    }

    if (targetStatus !== nextRecord.status) {
      nextRecord = changeRecordStatus(nextRecord, targetStatus, now, {
        completionReady,
      });
    }

    nextRecord = refreshRecordSearchIndex(
      nextRecord,
      getSummarySearchText(nextSummary),
      now,
    );

    this.repository.transaction((draft) => {
      draft.collections.records[recordId] = nextRecord;
      draft.collections.summaries[recordId] = nextSummary;
      this.#touchSubject(draft, nextRecord.subjectId, now);
      this.#appendEvent(draft, {
        subjectId: nextRecord.subjectId,
        entityType: "summary",
        entityId: recordId,
        eventType: "edited",
        summary: "Conteúdo do Resumo atualizado.",
        now,
      });

      if (statusChanged) {
        this.#appendEvent(draft, {
          subjectId: nextRecord.subjectId,
          entityType: "record",
          entityId: recordId,
          eventType: "status_changed",
          summary: `Resumo marcado como ${STATUS_LABELS[targetStatus]}.`,
          now,
          metadata: {
            previousStatus: currentRecord.status,
            nextStatus: targetStatus,
          },
        });
      }

      if (studiedChanged) {
        this.#appendEvent(draft, {
          subjectId: nextRecord.subjectId,
          entityType: "summary",
          entityId: recordId,
          eventType: nextSummary.isStudied
            ? "marked_studied"
            : "unmarked_studied",
          summary: nextSummary.isStudied
            ? "Resumo marcado como estudado."
            : "Marcação de estudo removida do Resumo.",
          now,
        });
      }
    });

    return this.getView(recordId);
  }

  toggleStudied(recordId) {
    const currentRecord = this.#getRequiredRecord(recordId);
    const currentSummary = this.#getRequiredSummary(recordId);

    if (currentRecord.archivedAt) {
      throw new TypeError("Um Resumo arquivado não pode ser alterado.");
    }

    const now = this.clock();
    const nextSummary = setSummaryStudied(
      currentSummary,
      !currentSummary.isStudied,
      now,
      this.idGenerator("study-mark"),
    );
    const nextRecord = refreshRecordSearchIndex(
      currentRecord,
      getSummarySearchText(nextSummary),
      now,
    );

    this.repository.transaction((draft) => {
      draft.collections.records[recordId] = nextRecord;
      draft.collections.summaries[recordId] = nextSummary;
      this.#touchSubject(draft, nextRecord.subjectId, now);
      this.#appendEvent(draft, {
        subjectId: nextRecord.subjectId,
        entityType: "summary",
        entityId: recordId,
        eventType: nextSummary.isStudied
          ? "marked_studied"
          : "unmarked_studied",
        summary: nextSummary.isStudied
          ? "Resumo marcado como estudado."
          : "Marcação de estudo removida do Resumo.",
        now,
      });
    });

    return this.getView(recordId);
  }

  #getRequiredRecord(recordId) {
    const record = this.repository.getEntity("records", recordId);

    if (!record) {
      throw new RangeError("Registro de Resumo não encontrado.");
    }

    if (record.type !== "summary") {
      throw new TypeError("O registro informado não é um Resumo.");
    }

    const validation = validateRecord(record);

    if (!validation.valid) {
      throw new TypeError(validation.errors.join(" "));
    }

    return record;
  }

  #getRequiredSummary(recordId) {
    const summary = this.getByRecordId(recordId);

    if (!summary) {
      throw new RangeError("Conteúdo específico do Resumo não encontrado.");
    }

    const validation = validateSummary(summary);

    if (!validation.valid) {
      throw new TypeError(validation.errors.join(" "));
    }

    return summary;
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

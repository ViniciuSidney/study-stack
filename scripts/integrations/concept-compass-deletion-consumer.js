import { APP_CONFIG } from "../config/app-config.js";
import { LocalStorageAdapter } from "../storage/local-storage-adapter.js";
import { MigrationRunner } from "../storage/migrations/migration-runner.js";
import { StateRepository } from "../storage/state-repository.js";
import { createInitialState } from "../storage/state-schema.js";

export const CONCEPT_COMPASS_DELETION_PROTOCOL = Object.freeze({
  contractVersion: "1.0.0",
  sourceApp: "concept_compass",
  targetApp: "study_stack",
  commandKey: "study-stack:integration:deletion-commands:v1",
  acknowledgementKey: "study-stack:integration:deletion-acks:v1",
  conceptCompassDataKey: "organizador-conteudos:data",
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function values(collection) {
  return Object.values(collection ?? {});
}

function entries(collection) {
  return Object.entries(collection ?? {});
}

function deleteByIds(collection, ids) {
  let removed = 0;
  for (const id of ids) {
    if (!Object.hasOwn(collection, id)) continue;
    delete collection[id];
    removed += 1;
  }
  return removed;
}

function idsWhere(collection, predicate) {
  return entries(collection)
    .filter(([, entity]) => predicate(entity))
    .map(([id]) => id);
}

function normalizeDeletedSubjects(value) {
  return isPlainObject(value) ? { ...value } : {};
}

export function deleteStudyStackSubjectFromDraft(draft, command, now) {
  const subjectId = command.subjectId;
  const collections = draft.collections;
  const subjectExisted = Boolean(collections.subjects?.[subjectId]);

  const recordIds = new Set(
    idsWhere(collections.records, (entity) => entity?.subjectId === subjectId),
  );
  const sessionIds = new Set(
    idsWhere(
      collections.importedSessions,
      (entity) => entity?.subjectId === subjectId || recordIds.has(entity?.recordId),
    ),
  );
  const questionIds = new Set(
    idsWhere(
      collections.importedQuestions,
      (entity) => entity?.subjectId === subjectId || sessionIds.has(entity?.sessionId),
    ),
  );
  const errorRecordIds = new Set(
    idsWhere(
      collections.errorRecords,
      (entity) => entity?.subjectId === subjectId || recordIds.has(entity?.recordId),
    ),
  );
  const occurrenceIds = new Set(
    idsWhere(
      collections.errorOccurrences,
      (entity) =>
        errorRecordIds.has(entity?.errorRecordId) || questionIds.has(entity?.questionId),
    ),
  );
  const evidenceIds = new Set(
    idsWhere(
      collections.errorEvidences,
      (entity) =>
        errorRecordIds.has(entity?.errorRecordId) ||
        questionIds.has(entity?.questionId) ||
        occurrenceIds.has(entity?.validAfterOccurrenceId),
    ),
  );
  const summaryIds = new Set(
    idsWhere(
      collections.summaries,
      (entity) => entity?.subjectId === subjectId || recordIds.has(entity?.id),
    ),
  );
  const noteIds = new Set(
    idsWhere(
      collections.notes,
      (entity) => entity?.subjectId === subjectId || recordIds.has(entity?.id),
    ),
  );
  const historyIds = new Set(
    idsWhere(collections.historyEvents, (entity) => entity?.subjectId === subjectId),
  );
  const snapshotIds = new Set(
    idsWhere(collections.progressSnapshots, (entity) => entity?.subjectId === subjectId),
  );
  const pendingImportIds = new Set(
    idsWhere(
      collections.pendingImports,
      (entity) =>
        entity?.subjectId === subjectId ||
        entity?.subjectContext?.subjectId === subjectId ||
        entity?.payload?.subjectContext?.subjectId === subjectId,
    ),
  );
  const draftIds = new Set(
    idsWhere(
      collections.draftBuffers,
      (entity) => entity?.subjectId === subjectId || recordIds.has(entity?.recordId),
    ),
  );
  const technicalLogIds = new Set(
    idsWhere(collections.technicalLogs, (entity) => entity?.subjectId === subjectId),
  );

  const removed = {
    subjects: deleteByIds(collections.subjects, new Set([subjectId])),
    records: deleteByIds(collections.records, recordIds),
    summaries: deleteByIds(collections.summaries, summaryIds),
    notes: deleteByIds(collections.notes, noteIds),
    importedSessions: deleteByIds(collections.importedSessions, sessionIds),
    importedQuestions: deleteByIds(collections.importedQuestions, questionIds),
    errorRecords: deleteByIds(collections.errorRecords, errorRecordIds),
    errorOccurrences: deleteByIds(collections.errorOccurrences, occurrenceIds),
    errorEvidences: deleteByIds(collections.errorEvidences, evidenceIds),
    historyEvents: deleteByIds(collections.historyEvents, historyIds),
    progressSnapshots: deleteByIds(collections.progressSnapshots, snapshotIds),
    pendingImports: deleteByIds(collections.pendingImports, pendingImportIds),
    draftBuffers: deleteByIds(collections.draftBuffers, draftIds),
    technicalLogs: deleteByIds(collections.technicalLogs, technicalLogIds),
  };

  for (const note of values(collections.notes)) {
    if (!Array.isArray(note.linkedRecordIds)) continue;
    note.linkedRecordIds = note.linkedRecordIds.filter((id) => !recordIds.has(id));
  }

  for (const question of values(collections.importedQuestions)) {
    if (!Array.isArray(question.errorRecordIds)) continue;
    question.errorRecordIds = question.errorRecordIds.filter((id) => !errorRecordIds.has(id));
  }

  const integration = collections.integrationState?.global;
  if (integration) {
    const conceptCompass = integration.conceptCompass ?? {};
    const deletedSubjects = normalizeDeletedSubjects(conceptCompass.deletedSubjects);
    deletedSubjects[subjectId] = {
      subjectId,
      commandId: command.commandId,
      deletedAt: now,
      matterId: command.matterId ?? null,
      themeId: command.themeId ?? null,
    };

    integration.conceptCompass = {
      ...conceptCompass,
      status: "subject_deleted",
      lastSubjectId:
        conceptCompass.lastSubjectId === subjectId ? null : conceptCompass.lastSubjectId ?? null,
      lastReceivedAt: command.committedAt ?? command.requestedAt ?? now,
      lastIssue: null,
      deletedSubjects,
    };
    integration.updatedAt = now;
  }

  return {
    subjectId,
    existed: subjectExisted,
    removed,
  };
}

function createRepository(windowObject, clock) {
  const storage = new LocalStorageAdapter(
    windowObject.localStorage,
    APP_CONFIG.storageNamespace,
  );
  const repository = new StateRepository({
    storage,
    config: APP_CONFIG,
    createInitialState,
    migrationRunner: new MigrationRunner(APP_CONFIG.storage.schemaVersion),
    clock,
  });
  repository.initialize();
  return repository;
}

function emptyAcknowledgements(now) {
  return {
    contractVersion: CONCEPT_COMPASS_DELETION_PROTOCOL.contractVersion,
    sourceApp: CONCEPT_COMPASS_DELETION_PROTOCOL.targetApp,
    updatedAt: now,
    acknowledgements: {},
  };
}

export class ConceptCompassDeletionConsumer {
  constructor({
    window,
    repository = null,
    clock = () => new Date().toISOString(),
    onSubjectsDeleted = null,
    protocol = CONCEPT_COMPASS_DELETION_PROTOCOL,
  }) {
    if (!window?.localStorage) {
      throw new TypeError("Window e localStorage são obrigatórios para a exclusão vinculada.");
    }

    this.window = window;
    this.repository = repository;
    this.clock = clock;
    this.onSubjectsDeleted = onSubjectsDeleted;
    this.protocol = protocol;
    this.installed = false;
    this.boundStorage = (event) => {
      if (event?.key === this.protocol.commandKey) this.consume();
    };
    this.boundFocus = () => this.consume();
    this.boundVisibility = () => {
      if (this.window.document?.visibilityState !== "hidden") this.consume();
    };
  }

  install() {
    if (this.installed) return this;
    this.window.addEventListener("storage", this.boundStorage);
    this.window.addEventListener("focus", this.boundFocus);
    this.window.document?.addEventListener?.("visibilitychange", this.boundVisibility);
    this.installed = true;
    return this;
  }

  destroy() {
    if (!this.installed) return;
    this.window.removeEventListener("storage", this.boundStorage);
    this.window.removeEventListener("focus", this.boundFocus);
    this.window.document?.removeEventListener?.("visibilitychange", this.boundVisibility);
    this.installed = false;
  }

  consume() {
    const envelope = this.#readCommandEnvelope();
    if (!envelope) {
      return { processed: 0, deletedSubjectIds: [] };
    }

    const readyCommands = entries(envelope.commands)
      .map(([, command]) => command)
      .filter((command) => this.#isReadyCommand(command));

    if (readyCommands.length === 0) {
      return { processed: 0, deletedSubjectIds: [] };
    }

    const repository = this.repository ?? createRepository(this.window, this.clock);
    const now = this.clock();
    const acknowledgements = this.#readAcknowledgements(now);
    const processedCommandIds = [];
    const deletedSubjectIds = [];

    for (const command of readyCommands) {
      try {
        const outcome = repository.transaction((draft) =>
          deleteStudyStackSubjectFromDraft(draft, command, now),
        ).result;

        acknowledgements.acknowledgements[command.commandId] = {
          commandId: command.commandId,
          subjectId: command.subjectId,
          status: outcome.existed ? "deleted" : "not_found",
          processedAt: now,
          removed: outcome.removed,
        };
        processedCommandIds.push(command.commandId);
        deletedSubjectIds.push(command.subjectId);
      } catch (error) {
        acknowledgements.acknowledgements[command.commandId] = {
          commandId: command.commandId,
          subjectId: command.subjectId,
          status: "failed",
          processedAt: now,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    acknowledgements.updatedAt = now;
    this.window.localStorage.setItem(
      this.protocol.acknowledgementKey,
      JSON.stringify(acknowledgements),
    );

    if (processedCommandIds.length > 0) {
      const nextEnvelope = {
        ...envelope,
        updatedAt: now,
        commands: { ...envelope.commands },
      };
      for (const commandId of processedCommandIds) delete nextEnvelope.commands[commandId];

      if (Object.keys(nextEnvelope.commands).length === 0) {
        this.window.localStorage.removeItem(this.protocol.commandKey);
      } else {
        this.window.localStorage.setItem(
          this.protocol.commandKey,
          JSON.stringify(nextEnvelope),
        );
      }
    }

    const uniqueDeletedIds = [...new Set(deletedSubjectIds)];
    if (uniqueDeletedIds.length > 0 && typeof this.onSubjectsDeleted === "function") {
      this.onSubjectsDeleted({ subjectIds: uniqueDeletedIds });
    }

    return {
      processed: processedCommandIds.length,
      deletedSubjectIds: uniqueDeletedIds,
    };
  }

  #readCommandEnvelope() {
    const raw = this.window.localStorage.getItem(this.protocol.commandKey);
    if (!raw) return null;

    let envelope;
    try {
      envelope = JSON.parse(raw);
    } catch {
      return null;
    }

    if (
      !isPlainObject(envelope) ||
      envelope.contractVersion !== this.protocol.contractVersion ||
      envelope.sourceApp !== this.protocol.sourceApp ||
      !isPlainObject(envelope.commands)
    ) {
      return null;
    }

    return envelope;
  }

  #readAcknowledgements(now) {
    const raw = this.window.localStorage.getItem(this.protocol.acknowledgementKey);
    if (!raw) return emptyAcknowledgements(now);

    try {
      const parsed = JSON.parse(raw);
      if (
        isPlainObject(parsed) &&
        parsed.contractVersion === this.protocol.contractVersion &&
        parsed.sourceApp === this.protocol.targetApp &&
        isPlainObject(parsed.acknowledgements)
      ) {
        return parsed;
      }
    } catch {
      // Um envelope corrompido é substituído por um novo envelope de confirmação.
    }

    return emptyAcknowledgements(now);
  }

  #isReadyCommand(command) {
    return (
      isPlainObject(command) &&
      command.contractVersion === this.protocol.contractVersion &&
      command.sourceApp === this.protocol.sourceApp &&
      command.type === "delete_subject" &&
      ["ready", "prepared"].includes(command.status) &&
      typeof command.commandId === "string" &&
      typeof command.subjectId === "string" &&
      Boolean(command.subjectId.trim()) &&
      (command.status === "ready" || this.#conceptCompassConfirmsDeletion(command.subjectId))
    );
  }

  #conceptCompassConfirmsDeletion(subjectId) {
    const raw = this.window.localStorage.getItem(this.protocol.conceptCompassDataKey);
    if (!raw) return false;

    try {
      const data = JSON.parse(raw);
      return (data?.assuntos ?? []).every((assunto) => assunto?.id !== subjectId);
    } catch {
      return false;
    }
  }
}

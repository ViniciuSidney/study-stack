import { createInitialState } from "../storage/state-schema.js";

const STUDY_COLLECTIONS = Object.freeze([
  "subjects",
  "records",
  "summaries",
  "notes",
  "importedSessions",
  "importedQuestions",
  "errorRecords",
  "errorOccurrences",
  "errorEvidences",
  "historyEvents",
  "progressSnapshots",
  "pendingImports",
  "draftBuffers",
]);

function countCollection(state, name) {
  return Object.keys(state.collections[name] ?? {}).length;
}

export class DataResetService {
  constructor({
    repository,
    clock,
    appVersion,
    schemaVersion,
    preferenceDefaults,
  }) {
    this.repository = repository;
    this.clock = clock;
    this.appVersion = appVersion;
    this.schemaVersion = schemaVersion;
    this.preferenceDefaults = preferenceDefaults;
  }

  getStudyDataSummary() {
    const state = this.repository.getState();
    const counts = Object.fromEntries(
      STUDY_COLLECTIONS.map((name) => [name, countCollection(state, name)]),
    );

    return Object.freeze({
      subjects: counts.subjects,
      records: counts.records,
      sessions: counts.importedSessions,
      questions: counts.importedQuestions,
      errors: counts.errorRecords,
      drafts: counts.draftBuffers,
      pendingImports: counts.pendingImports,
      totalItems: Object.values(counts).reduce((sum, value) => sum + value, 0),
    });
  }

  deleteStudyData() {
    const current = this.repository.getState();
    const summary = this.getStudyDataSummary();
    const now = this.clock();
    const next = this.#createBlankState(now);

    next.createdAt = current.createdAt;
    next.migrationHistory = structuredClone(current.migrationHistory ?? []);
    next.collections.settings = structuredClone(current.collections.settings);
    next.collections.integrationState = structuredClone(
      current.collections.integrationState,
    );
    next.collections.technicalLogs = structuredClone(
      current.collections.technicalLogs,
    );

    this.repository.replaceState(next, { createRecoveryPoint: true });

    return Object.freeze({
      mode: "study-data",
      summary,
      recoveryPointCreated: Boolean(this.repository.getRecoveryPoint()),
    });
  }

  resetApplication() {
    const now = this.clock();
    const next = this.#createBlankState(now);

    this.repository.replaceState(next, { createRecoveryPoint: false });
    this.repository.clearRecoveryPoint();

    return Object.freeze({
      mode: "full-reset",
      resetAt: now,
    });
  }

  #createBlankState(now) {
    return createInitialState({
      now,
      appVersion: this.appVersion,
      schemaVersion: this.schemaVersion,
      preferenceDefaults: this.preferenceDefaults,
    });
  }
}

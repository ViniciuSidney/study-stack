export const COLLECTION_NAMES = Object.freeze([
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
  "technicalLogs",
  "settings",
  "integrationState",
]);

export const STORAGE_CONFIG = Object.freeze({
  schemaVersion: "1.0.0",
  stateKey: "v1:state",
  recoveryKey: "v1:recovery",
  settingsId: "global",
  integrationStateId: "global",
  collectionNames: COLLECTION_NAMES,
});

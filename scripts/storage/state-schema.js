import { COLLECTION_NAMES } from "../config/storage-config.js";

function createCollectionMap() {
  return Object.create(null);
}

function createCollectionSet() {
  return Object.fromEntries(
    COLLECTION_NAMES.map((name) => [name, createCollectionMap()]),
  );
}

export function createDefaultSettings({
  now,
  schemaVersion,
  preferenceDefaults,
}) {
  return {
    id: "global",
    schemaVersion,
    autosaveDelayMs: 900,
    locale: "pt-BR",
    dateFormat: "dd/MM/yyyy",
    defaultProgressGoal: 10,
    technicalLogLimit: 100,
    lastBackupAt: null,
    lastSuccessfulMigration: null,
    ui: { ...preferenceDefaults },
    legacyPreferencesMigratedAt: null,
    createdAt: now,
    updatedAt: now,
    entityVersion: 1,
  };
}

export function createDefaultIntegrationState({ now }) {
  return {
    id: "global",
    conceptCompass: {
      status: "idle",
      supportedContractVersions: ["1.0.0"],
      lastContractVersion: null,
      lastSubjectId: null,
      lastReceivedAt: null,
      lastIssue: null,
      deletedSubjects: {},
    },
    testQuest: {
      status: "idle",
      supportedContractVersions: ["1.0.0", "1.1.0"],
      lastContractVersion: null,
      lastSessionId: null,
      lastReceivedAt: null,
      lastIssue: null,
    },
    flashcore: {
      status: "future",
      supportedContractVersions: [],
      lastReceivedAt: null,
    },
    createdAt: now,
    updatedAt: now,
    entityVersion: 1,
  };
}

export function createInitialState({
  now,
  appVersion,
  schemaVersion,
  preferenceDefaults,
}) {
  const collections = createCollectionSet();

  collections.settings.global = createDefaultSettings({
    now,
    schemaVersion,
    preferenceDefaults,
  });
  collections.integrationState.global = createDefaultIntegrationState({
    now,
  });

  return {
    schemaVersion,
    appVersion,
    createdAt: now,
    updatedAt: now,
    collections,
    migrationHistory: [],
    integrity: {
      status: "valid",
      checkedAt: now,
      collectionCounts: Object.fromEntries(
        COLLECTION_NAMES.map((name) => [
          name,
          Object.keys(collections[name]).length,
        ]),
      ),
    },
  };
}

export function updateIntegrity(state, now) {
  state.integrity = {
    status: "valid",
    checkedAt: now,
    collectionCounts: Object.fromEntries(
      COLLECTION_NAMES.map((name) => [
        name,
        Object.keys(state.collections[name]).length,
      ]),
    ),
  };

  return state;
}

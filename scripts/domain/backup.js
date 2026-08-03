import { validateState } from "../storage/state-validator.js";

export const BACKUP_APP_NAME = "Study Stack";
export const BACKUP_FORMAT_VERSION = "1.0.0";
export const RESTORE_MODES = Object.freeze(["merge", "replace"]);

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function sortValue(value) {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortValue(value[key])]),
    );
  }

  return value;
}

export function stableStringify(value) {
  return JSON.stringify(sortValue(value));
}

export function fingerprintValue(value) {
  const input = stableStringify(value);
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function summarizeState(state) {
  const collections = state?.collections ?? {};
  const records = Object.values(collections.records ?? {});

  return Object.freeze({
    subjectCount: Object.keys(collections.subjects ?? {}).length,
    recordCount: records.length,
    activeRecordCount: records.filter((record) => !record.archivedAt).length,
    archivedRecordCount: records.filter((record) => Boolean(record.archivedAt)).length,
    pendingImportCount: Object.values(collections.pendingImports ?? {}).filter(
      (entry) => !entry.resolvedAt,
    ).length,
    draftCount: Object.keys(collections.draftBuffers ?? {}).length,
    collectionCounts: Object.fromEntries(
      Object.entries(collections).map(([name, collection]) => [
        name,
        Object.keys(collection ?? {}).length,
      ]),
    ),
  });
}

function createBackupState(state) {
  const data = structuredClone(state);
  const drafts = structuredClone(data.collections.draftBuffers ?? {});
  data.collections.draftBuffers = Object.create(null);

  return { data, drafts };
}

export function createBackupEnvelope({
  state,
  appVersion,
  now,
  exportId,
}) {
  const { data, drafts } = createBackupState(state);
  const payloadForIntegrity = { data, drafts };

  return Object.freeze({
    app: BACKUP_APP_NAME,
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    appVersion,
    schemaVersion: state.schemaVersion,
    exportedAt: now,
    exportId,
    summary: summarizeState(state),
    data,
    drafts,
    integrity: {
      algorithm: "fnv1a-32",
      fingerprint: fingerprintValue(payloadForIntegrity),
    },
  });
}

function composeStateFromEnvelope(envelope) {
  const candidate = structuredClone(envelope.data);
  candidate.collections.draftBuffers = structuredClone(envelope.drafts ?? {});
  return candidate;
}

export function validateBackupEnvelope(envelope, expectedSchemaVersion) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(envelope)) {
    return { valid: false, errors: ["O backup deve ser um objeto JSON."], warnings };
  }

  if (envelope.app !== BACKUP_APP_NAME) {
    errors.push("O arquivo não pertence ao Study Stack.");
  }

  if (envelope.backupFormatVersion !== BACKUP_FORMAT_VERSION) {
    errors.push(
      `Formato de backup incompatível: esperado ${BACKUP_FORMAT_VERSION}.`,
    );
  }

  if (envelope.schemaVersion !== expectedSchemaVersion) {
    errors.push(
      `Schema incompatível: esperado ${expectedSchemaVersion}, recebido ${
        envelope.schemaVersion ?? "desconhecido"
      }.`,
    );
  }

  if (typeof envelope.exportId !== "string" || !envelope.exportId.trim()) {
    errors.push("exportId ausente.");
  }

  if (
    typeof envelope.exportedAt !== "string" ||
    Number.isNaN(Date.parse(envelope.exportedAt))
  ) {
    errors.push("exportedAt inválido.");
  }

  if (!isPlainObject(envelope.data)) {
    errors.push("A área data do backup está ausente ou inválida.");
  }

  if (errors.length) {
    return { valid: false, errors, warnings, state: null };
  }

  let state;
  try {
    state = composeStateFromEnvelope(envelope);
  } catch {
    return {
      valid: false,
      errors: ["Não foi possível reconstruir o estado do backup."],
      warnings,
      state: null,
    };
  }

  const stateValidation = validateState(state, expectedSchemaVersion);
  errors.push(...stateValidation.errors);

  const expectedFingerprint = envelope.integrity?.fingerprint;
  if (expectedFingerprint) {
    const actualFingerprint = fingerprintValue({
      data: envelope.data,
      drafts: envelope.drafts ?? {},
    });

    if (actualFingerprint !== expectedFingerprint) {
      errors.push("A assinatura de integridade do backup não confere.");
    }
  } else {
    warnings.push("O backup não possui assinatura de integridade.");
  }

  const calculatedSummary = summarizeState(state);
  if (
    envelope.summary?.recordCount !== undefined &&
    envelope.summary.recordCount !== calculatedSummary.recordCount
  ) {
    warnings.push("A quantidade de registros diverge do resumo do arquivo.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    state: errors.length ? null : state,
    summary: calculatedSummary,
  };
}

function mergeMigrationHistory(current, incoming) {
  const seen = new Set();
  const result = [];

  for (const entry of [...(current ?? []), ...(incoming ?? [])]) {
    const key = stableStringify(entry);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(structuredClone(entry));
    }
  }

  return result;
}

export function createMergeCandidate(currentState, incomingState) {
  const candidate = structuredClone(currentState);
  const additions = Object.create(null);
  const identical = Object.create(null);
  const conflicts = [];

  for (const [collectionName, incomingCollection] of Object.entries(
    incomingState.collections,
  )) {
    additions[collectionName] = 0;
    identical[collectionName] = 0;
    const targetCollection = candidate.collections[collectionName];

    for (const [id, incomingEntity] of Object.entries(incomingCollection)) {
      const currentEntity = targetCollection[id];

      if (!currentEntity) {
        targetCollection[id] = structuredClone(incomingEntity);
        additions[collectionName] += 1;
        continue;
      }

      if (stableStringify(currentEntity) === stableStringify(incomingEntity)) {
        identical[collectionName] += 1;
        continue;
      }

      conflicts.push({
        collectionName,
        id,
        currentUpdatedAt: currentEntity.updatedAt ?? null,
        incomingUpdatedAt: incomingEntity.updatedAt ?? null,
      });
    }
  }

  candidate.migrationHistory = mergeMigrationHistory(
    candidate.migrationHistory,
    incomingState.migrationHistory,
  );
  candidate.createdAt =
    Date.parse(incomingState.createdAt) < Date.parse(candidate.createdAt)
      ? incomingState.createdAt
      : candidate.createdAt;

  return { candidate, additions, identical, conflicts };
}

export function buildRestorePreview({
  currentState,
  envelope,
  mode,
  expectedSchemaVersion,
}) {
  if (!RESTORE_MODES.includes(mode)) {
    throw new RangeError(`Modo de restauração desconhecido: ${mode}.`);
  }

  const validation = validateBackupEnvelope(envelope, expectedSchemaVersion);
  if (!validation.valid) {
    return Object.freeze({
      valid: false,
      mode,
      errors: validation.errors,
      warnings: validation.warnings,
      candidate: null,
      conflicts: [],
      additions: {},
      identical: {},
      summary: null,
    });
  }

  let candidate;
  let additions = {};
  let identical = {};
  let conflicts = [];

  if (mode === "replace") {
    candidate = structuredClone(validation.state);
  } else {
    const merge = createMergeCandidate(currentState, validation.state);
    candidate = merge.candidate;
    additions = merge.additions;
    identical = merge.identical;
    conflicts = merge.conflicts;
  }

  const candidateValidation = validateState(candidate, expectedSchemaVersion);
  const errors = [...candidateValidation.errors];
  const warnings = [...validation.warnings];

  if (mode === "merge" && conflicts.length) {
    warnings.push(
      `${conflicts.length} conflito(s) serão preservados no estado atual, sem sobrescrita.`,
    );
  }

  return Object.freeze({
    valid: errors.length === 0,
    mode,
    errors,
    warnings,
    candidate: errors.length ? null : candidate,
    conflicts,
    additions,
    identical,
    summary: validation.summary,
  });
}

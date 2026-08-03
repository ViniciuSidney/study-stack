import { validateState } from "../storage/state-validator.js";

function byteLength(value) {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function formatIntegration(integration) {
  return Object.fromEntries(
    Object.entries(integration ?? {})
      .filter(([key]) => key !== "id" && key !== "createdAt" && key !== "updatedAt" && key !== "entityVersion")
      .map(([key, value]) => [key, value?.status ?? "unknown"]),
  );
}

export class DiagnosticService {
  constructor({ repository, clock, schemaVersion }) {
    this.repository = repository;
    this.clock = clock;
    this.schemaVersion = schemaVersion;
  }


  record({
    category = "unexpected",
    operation,
    severity = "error",
    message,
    recoverable = true,
    entityRefs = [],
  }) {
    const now = this.clock();
    const id = `technical-log-${now}-${Math.random().toString(36).slice(2, 8)}`;

    return this.repository.transaction((draft) => {
      draft.collections.technicalLogs[id] = {
        id,
        occurredAt: now,
        category,
        operation: String(operation || "unknown"),
        severity,
        message: String(message || "Falha não detalhada."),
        entityRefs: [...entityRefs],
        recoverable: Boolean(recoverable),
        resolvedAt: null,
        appVersion: draft.appVersion,
        entityVersion: 1,
      };

      const settings = draft.collections.settings.global;
      const limit = Math.max(10, Number(settings.technicalLogLimit) || 100);
      const ordered = Object.values(draft.collections.technicalLogs).sort(
        (a, b) => b.occurredAt.localeCompare(a.occurredAt),
      );
      for (const oldLog of ordered.slice(limit)) {
        delete draft.collections.technicalLogs[oldLog.id];
      }

      return draft.collections.technicalLogs[id];
    }).result;
  }

  run() {
    const state = this.repository.getState();
    const validation = validateState(state, this.schemaVersion);
    const collectionCounts = Object.fromEntries(
      Object.entries(state.collections).map(([name, collection]) => [
        name,
        Object.keys(collection).length,
      ]),
    );
    const countMismatches = Object.entries(collectionCounts)
      .filter(
        ([name, count]) => state.integrity.collectionCounts?.[name] !== count,
      )
      .map(([name, count]) => ({
        collection: name,
        expected: state.integrity.collectionCounts?.[name] ?? null,
        actual: count,
      }));
    const pendingImports = Object.values(state.collections.pendingImports).filter(
      (entry) => !entry.resolvedAt,
    );
    const drafts = Object.values(state.collections.draftBuffers);
    const technicalLogs = Object.values(state.collections.technicalLogs).sort(
      (a, b) => b.occurredAt.localeCompare(a.occurredAt),
    );
    const now = this.clock();
    const expiredDrafts = drafts.filter(
      (draft) => draft.expiresAt && Date.parse(draft.expiresAt) < Date.parse(now),
    );
    const warnings = [];

    if (pendingImports.length) {
      warnings.push(`${pendingImports.length} importação(ões) aguardam revisão.`);
    }
    if (drafts.length) {
      warnings.push(`${drafts.length} rascunho(s) recuperável(is) estão armazenados.`);
    }
    if (expiredDrafts.length) {
      warnings.push(`${expiredDrafts.length} rascunho(s) estão além da validade prevista.`);
    }
    if (countMismatches.length) {
      warnings.push("As contagens de integridade precisam ser recalculadas.");
    }

    const status = !validation.valid
      ? "error"
      : warnings.length
        ? "warning"
        : "healthy";

    return Object.freeze({
      status,
      checkedAt: now,
      schemaVersion: state.schemaVersion,
      appVersion: state.appVersion,
      stateCreatedAt: state.createdAt,
      stateUpdatedAt: state.updatedAt,
      storageBytes: byteLength(state),
      collectionCounts,
      validationErrors: validation.errors,
      warnings,
      countMismatches,
      pendingImports,
      drafts,
      expiredDrafts,
      technicalLogs: technicalLogs.slice(0, 20),
      technicalLogCount: technicalLogs.length,
      integrations: formatIntegration(state.collections.integrationState.global),
      recoveryPoint: this.repository.getRecoveryPoint(),
    });
  }
}

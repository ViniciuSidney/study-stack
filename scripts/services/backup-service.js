import {
  buildRestorePreview,
  createBackupEnvelope,
} from "../domain/backup.js";
import { createId } from "../utils/id.js";

function buildFileName(now) {
  const stamp = now.replace(/[:.]/g, "-");
  return `study-stack-backup-${stamp}.json`;
}

export class BackupService {
  constructor({ repository, clock, appVersion, schemaVersion, idGenerator = createId }) {
    this.repository = repository;
    this.clock = clock;
    this.appVersion = appVersion;
    this.schemaVersion = schemaVersion;
    this.idGenerator = idGenerator;
  }

  createBackup() {
    const now = this.clock();

    this.repository.transaction((draft) => {
      const settings = draft.collections.settings.global;
      settings.lastBackupAt = now;
      settings.updatedAt = now;
      settings.entityVersion = Math.max(1, settings.entityVersion ?? 1);
    });

    const state = this.repository.getState();
    const envelope = createBackupEnvelope({
      state,
      appVersion: this.appVersion,
      now,
      exportId: this.idGenerator("backup"),
    });

    return Object.freeze({
      envelope,
      fileName: buildFileName(now),
      json: `${JSON.stringify(envelope, null, 2)}\n`,
    });
  }

  parse(text) {
    if (typeof text !== "string" || !text.trim()) {
      throw new TypeError("O conteúdo do backup está vazio.");
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      throw new SyntaxError("O arquivo selecionado não contém JSON válido.", {
        cause: error,
      });
    }
  }

  preview(envelope, mode) {
    return buildRestorePreview({
      currentState: this.repository.getState(),
      envelope,
      mode,
      expectedSchemaVersion: this.schemaVersion,
    });
  }

  restore(envelope, mode) {
    const preview = this.preview(envelope, mode);
    if (!preview.valid || !preview.candidate) {
      throw new TypeError(
        preview.errors.join(" ") || "O backup não pode ser restaurado.",
      );
    }

    const now = this.clock();
    this.repository.replaceState(preview.candidate, {
      createRecoveryPoint: true,
    });

    this.repository.transaction((draft) => {
      const logId = this.idGenerator("technical-log");
      draft.collections.technicalLogs[logId] = {
        id: logId,
        occurredAt: now,
        category: "restore",
        operation: mode === "replace" ? "replace_state" : "merge_state",
        severity: "info",
        message:
          mode === "replace"
            ? "Estado substituído por backup validado."
            : "Backup mesclado sem sobrescrever conflitos.",
        entityRefs: [],
        recoverable: true,
        resolvedAt: null,
        appVersion: this.appVersion,
        entityVersion: 1,
      };

      const settings = draft.collections.settings.global;
      settings.updatedAt = now;

      const limit = Math.max(10, Number(settings.technicalLogLimit) || 100);
      const orderedLogs = Object.values(draft.collections.technicalLogs).sort(
        (a, b) => b.occurredAt.localeCompare(a.occurredAt),
      );
      for (const oldLog of orderedLogs.slice(limit)) {
        delete draft.collections.technicalLogs[oldLog.id];
      }
    });

    return Object.freeze({
      mode,
      conflicts: preview.conflicts,
      additions: preview.additions,
      state: this.repository.getState(),
    });
  }

  getRecoveryPoint() {
    return this.repository.getRecoveryPoint();
  }

  restoreRecoveryPoint() {
    return this.repository.restoreRecoveryPoint();
  }

  clearRecoveryPoint() {
    this.repository.clearRecoveryPoint();
  }
}

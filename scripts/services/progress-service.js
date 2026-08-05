import {
  PROGRESS_CALCULATION_VERSION,
  calculateProgress,
} from "../domain/progress.js";
import { createId } from "../utils/id.js";

function nonConsolidationPoints(snapshot) {
  return ["base", "practice", "errorAnalysis", "review"].reduce(
    (total, key) => total + snapshot.categories[key].activePoints,
    0,
  );
}

export class ProgressService {
  constructor({ repository, clock, appVersion, idGenerator = createId }) {
    this.repository = repository;
    this.clock = clock;
    this.appVersion = appVersion;
    this.idGenerator = idGenerator;
  }

  getCurrent(subjectId) {
    return this.ensureCurrent(subjectId);
  }

  ensureCurrent(subjectId, { force = false } = {}) {
    const subject = this.repository.getEntity("subjects", subjectId);

    if (!subject) {
      throw new RangeError("Assunto não encontrado para calcular o progresso.");
    }

    const now = this.clock();
    const input = {
      subject,
      records: this.repository.getCollection("records"),
      summaries: this.repository.getCollection("summaries"),
      importedSessions: this.repository.getCollection("importedSessions"),
      errorRecords: this.repository.getCollection("errorRecords"),
      calculatedAt: now,
    };
    let snapshot = calculateProgress(input);
    const current = this.repository.getEntity("progressSnapshots", snapshot.id);

    if (
      !force &&
      current?.calculationVersion === PROGRESS_CALCULATION_VERSION &&
      current.inputFingerprint === snapshot.inputFingerprint
    ) {
      return current;
    }

    const previousTotal = current?.currentTotal ?? 0;
    const pointsBeforeConsolidation = nonConsolidationPoints(snapshot);
    const currentConsolidationStatus = subject.consolidation?.status ?? "not_eligible";
    let nextConsolidationStatus = currentConsolidationStatus;

    if (currentConsolidationStatus === "confirmed") {
      nextConsolidationStatus =
        pointsBeforeConsolidation >= 9 ? "confirmed" : "suspended";
    } else if (currentConsolidationStatus === "suspended") {
      nextConsolidationStatus = "suspended";
    } else {
      nextConsolidationStatus =
        pointsBeforeConsolidation >= 9 ? "eligible" : "not_eligible";
    }

    if (nextConsolidationStatus !== currentConsolidationStatus) {
      const subjectForCalculation = structuredClone(subject);
      subjectForCalculation.consolidation.status = nextConsolidationStatus;
      snapshot = calculateProgress({ ...input, subject: subjectForCalculation });
    }

    this.repository.transaction((draft) => {
      draft.collections.progressSnapshots[snapshot.id] = snapshot;
      const draftSubject = draft.collections.subjects[subjectId];

      if (draftSubject.consolidation.status !== nextConsolidationStatus) {
        draftSubject.consolidation.status = nextConsolidationStatus;
        draftSubject.consolidation.suspendedAt =
          nextConsolidationStatus === "suspended" ? now : null;
        draftSubject.consolidation.lastReason =
          nextConsolidationStatus === "eligible"
            ? "As categorias anteriores alcançaram 9 pontos."
            : nextConsolidationStatus === "suspended"
              ? "A consolidação foi suspensa porque uma evidência anterior deixou de contar."
              : "As categorias anteriores ainda não alcançaram 9 pontos.";
        draftSubject.updatedAt = now;
      }

      if (snapshot.currentTotal !== previousTotal) {
        const eventId = this.idGenerator("history");
        draft.collections.historyEvents[eventId] = {
          id: eventId,
          subjectId,
          entityType: "progress_snapshot",
          entityId: snapshot.id,
          eventType: "progress_changed",
          occurredAt: now,
          summary: `Progresso recalculado: ${snapshot.currentTotal}/${snapshot.goalTotal}.`,
          metadata: {
            previousTotal,
            currentTotal: snapshot.currentTotal,
            percentage: snapshot.percentage,
            calculationVersion: snapshot.calculationVersion,
          },
          origin: "system",
          appVersion: this.appVersion,
          entityVersion: 1,
        };
      }
    });

    return this.repository.getEntity("progressSnapshots", snapshot.id);
  }
}

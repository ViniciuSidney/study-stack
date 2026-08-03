import { getRichContentPlainText } from "./rich-content.js";

export const PROGRESS_CALCULATION_VERSION = "1.0.0";

export const PROGRESS_CATEGORY_DEFINITIONS = Object.freeze({
  base: Object.freeze({ label: "Base", cap: 2 }),
  practice: Object.freeze({ label: "Prática", cap: 3 }),
  errorAnalysis: Object.freeze({ label: "Análise de erros", cap: 2 }),
  review: Object.freeze({ label: "Revisão", cap: 2 }),
  consolidation: Object.freeze({ label: "Consolidação", cap: 1 }),
});

function normalizeCollection(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : Object.values(value);
}

function stableHash(value) {
  const text = JSON.stringify(value);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function activeRecordsForSubject(records, subjectId) {
  return normalizeCollection(records).filter(
    (record) => record.subjectId === subjectId && !record.archivedAt,
  );
}

function buildRecordMap(records) {
  return new Map(normalizeCollection(records).map((record) => [record.id, record]));
}

function summaryEvidence({ subjectId, records, summaries }) {
  const summaryMap = new Map(
    normalizeCollection(summaries).map((summary) => [summary.recordId, summary]),
  );
  const completed = activeRecordsForSubject(records, subjectId)
    .filter((record) => record.type === "summary" && record.status === "completed")
    .filter((record) => getRichContentPlainText(summaryMap.get(record.id)?.mainContent));
  const studied = completed.filter(
    (record) => summaryMap.get(record.id)?.isStudied === true,
  );

  const evidenceIds = [];
  if (completed[0]) {
    evidenceIds.push(completed[0].id);
  }
  if (studied[0] && !evidenceIds.includes(studied[0].id)) {
    evidenceIds.push(studied[0].id);
  }

  return {
    points: Number(completed.length > 0) + Number(studied.length > 0),
    evidenceIds,
    completedIds: completed.map((record) => record.id),
    studiedIds: studied.map((record) => record.id),
  };
}

function practiceEvidence({ subjectId, records, importedSessions }) {
  const recordMap = buildRecordMap(records);
  const valid = normalizeCollection(importedSessions).filter((session) => {
    if (session.subjectId !== subjectId) {
      return false;
    }

    const record = recordMap.get(session.recordId);
    if (record?.archivedAt) {
      return false;
    }

    return Boolean(
      session.stats?.validForPractice ?? Number(session.stats?.answered) >= 15,
    );
  });

  return {
    points: Math.min(PROGRESS_CATEGORY_DEFINITIONS.practice.cap, valid.length),
    evidenceIds: valid.map((session) => session.id),
  };
}

function errorEvidence({ subjectId, records, errorRecords }) {
  const recordMap = buildRecordMap(records);
  const active = normalizeCollection(errorRecords).filter((errorRecord) => {
    if (errorRecord.subjectId !== subjectId) {
      return false;
    }

    const record = recordMap.get(errorRecord.recordId);
    return !record?.archivedAt;
  });
  const analyzed = active.filter((errorRecord) => errorRecord.analysis?.isComplete);
  const reviewed = active.filter((errorRecord) => errorRecord.reviewStatus === "reviewed");
  const overcome = active.filter((errorRecord) => errorRecord.masteryStatus === "overcome");

  return {
    analysisPoints: Math.min(
      PROGRESS_CATEGORY_DEFINITIONS.errorAnalysis.cap,
      analyzed.length,
    ),
    analysisEvidenceIds: analyzed.map((errorRecord) => errorRecord.id),
    reviewPoints:
      Number(reviewed.length > 0) + Number(overcome.length > 0),
    reviewEvidenceIds: [
      ...new Set([
        ...reviewed.map((errorRecord) => errorRecord.id),
        ...overcome.map((errorRecord) => errorRecord.id),
      ]),
    ],
  };
}

function createCategory(definition, activePoints, evidenceIds) {
  return {
    activePoints: Math.max(0, Math.min(definition.cap, activePoints)),
    cap: definition.cap,
    evidenceIds: [...evidenceIds],
  };
}

export function buildProgressInputFingerprint({
  subject,
  records = [],
  summaries = [],
  importedSessions = [],
  errorRecords = [],
}) {
  const subjectId = subject?.id;
  const relevantRecords = activeRecordsForSubject(records, subjectId)
    .filter((record) =>
      ["summary", "imported_session", "error_record"].includes(record.type),
    )
    .map((record) => ({
      id: record.id,
      type: record.type,
      status: record.status,
      archivedAt: record.archivedAt,
      updatedAt: record.updatedAt,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const summaryState = normalizeCollection(summaries)
    .filter((summary) => relevantRecords.some((record) => record.id === summary.recordId))
    .map((summary) => ({
      recordId: summary.recordId,
      isStudied: summary.isStudied,
      hasMainContent: Boolean(getRichContentPlainText(summary.mainContent)),
      contentUpdatedAt: summary.mainContent?.updatedAt ?? null,
      studiedAt: summary.studiedAt,
    }))
    .sort((a, b) => a.recordId.localeCompare(b.recordId));

  const sessionState = normalizeCollection(importedSessions)
    .filter((session) => session.subjectId === subjectId)
    .map((session) => ({
      id: session.id,
      recordId: session.recordId,
      answered: session.stats?.answered ?? 0,
      validForPractice: session.stats?.validForPractice ?? false,
      importStatus: session.importStatus,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const errorState = normalizeCollection(errorRecords)
    .filter((errorRecord) => errorRecord.subjectId === subjectId)
    .map((errorRecord) => ({
      id: errorRecord.id,
      recordId: errorRecord.recordId,
      analysisComplete: Boolean(errorRecord.analysis?.isComplete),
      reviewStatus: errorRecord.reviewStatus,
      masteryStatus: errorRecord.masteryStatus,
      recurrenceCount: errorRecord.recurrenceCount ?? 0,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return stableHash({
    calculationVersion: PROGRESS_CALCULATION_VERSION,
    subjectId,
    goalTotal: subject?.progressConfig?.goalTotal ?? 10,
    manualAdjustment: subject?.progressConfig?.manualAdjustment ?? null,
    consolidationStatus: ["confirmed", "suspended"].includes(
      subject?.consolidation?.status,
    )
      ? subject.consolidation.status
      : "unconfirmed",
    relevantRecords,
    summaryState,
    sessionState,
    errorState,
  });
}

export function calculateProgress({
  subject,
  records = [],
  summaries = [],
  importedSessions = [],
  errorRecords = [],
  calculatedAt,
}) {
  if (!subject?.id) {
    throw new TypeError("O cálculo de progresso exige um Subject válido.");
  }

  const base = summaryEvidence({
    subjectId: subject.id,
    records,
    summaries,
  });
  const practice = practiceEvidence({
    subjectId: subject.id,
    records,
    importedSessions,
  });
  const errors = errorEvidence({
    subjectId: subject.id,
    records,
    errorRecords,
  });
  const consolidationPoints =
    subject.consolidation?.status === "confirmed" ? 1 : 0;

  const categories = {
    base: createCategory(
      PROGRESS_CATEGORY_DEFINITIONS.base,
      base.points,
      base.evidenceIds,
    ),
    practice: createCategory(
      PROGRESS_CATEGORY_DEFINITIONS.practice,
      practice.points,
      practice.evidenceIds,
    ),
    errorAnalysis: createCategory(
      PROGRESS_CATEGORY_DEFINITIONS.errorAnalysis,
      errors.analysisPoints,
      errors.analysisEvidenceIds,
    ),
    review: createCategory(
      PROGRESS_CATEGORY_DEFINITIONS.review,
      errors.reviewPoints,
      errors.reviewEvidenceIds,
    ),
    consolidation: createCategory(
      PROGRESS_CATEGORY_DEFINITIONS.consolidation,
      consolidationPoints,
      consolidationPoints ? [subject.id] : [],
    ),
  };

  const evidenceTotal = Object.values(categories).reduce(
    (total, category) => total + category.activePoints,
    0,
  );
  const goalTotal = Math.max(1, Number(subject.progressConfig?.goalTotal) || 10);
  const adjustment = Number(subject.progressConfig?.manualAdjustment?.value ?? 0);
  const currentTotal = Math.max(
    0,
    Math.min(goalTotal, evidenceTotal + (Number.isFinite(adjustment) ? adjustment : 0)),
  );
  const percentage = Math.round((currentTotal / goalTotal) * 100);
  const suspendedReasons = [];

  if (categories.base.activePoints < categories.base.cap) {
    suspendedReasons.push(
      categories.base.activePoints === 0
        ? "A Base exige ao menos um Resumo concluído."
        : "Marque um Resumo concluído como estudado para completar a Base.",
    );
  }
  if (categories.practice.activePoints === 0) {
    suspendedReasons.push(
      "Prática aguardando listas válidas importadas do Test Quest.",
    );
  }
  if (categories.errorAnalysis.activePoints === 0) {
    suspendedReasons.push("Análise aguardando Registros de Erro completos.");
  }
  if (categories.review.activePoints === 0) {
    suspendedReasons.push("Revisão aguardando evidências de erros revisados.");
  }
  if (categories.consolidation.activePoints === 0) {
    suspendedReasons.push(
      "Consolidação exige 9 pontos anteriores e confirmação manual.",
    );
  }

  const inputFingerprint = buildProgressInputFingerprint({
    subject,
    records,
    summaries,
    importedSessions,
    errorRecords,
  });

  return {
    id: `progress-${subject.id}`,
    subjectId: subject.id,
    calculationVersion: PROGRESS_CALCULATION_VERSION,
    calculatedAt,
    goalTotal,
    currentTotal,
    percentage,
    categories,
    evidenceRefs: Object.fromEntries(
      Object.entries(categories).map(([key, category]) => [key, category.evidenceIds]),
    ),
    suspendedReasons,
    manualAdjustmentApplied: subject.progressConfig?.manualAdjustment ?? null,
    inputFingerprint,
    entityVersion: 1,
  };
}

export function validateProgressSnapshot(snapshot) {
  const errors = [];

  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return { valid: false, errors: ["ProgressSnapshot deve ser um objeto."] };
  }

  for (const key of ["id", "subjectId", "calculationVersion", "inputFingerprint"]) {
    if (typeof snapshot[key] !== "string" || !snapshot[key].trim()) {
      errors.push(`${key} ausente.`);
    }
  }

  if (
    typeof snapshot.calculatedAt !== "string" ||
    Number.isNaN(Date.parse(snapshot.calculatedAt))
  ) {
    errors.push("calculatedAt inválido.");
  }

  if (!Number.isFinite(snapshot.goalTotal) || snapshot.goalTotal <= 0) {
    errors.push("goalTotal inválido.");
  }

  if (
    !Number.isFinite(snapshot.currentTotal) ||
    snapshot.currentTotal < 0 ||
    snapshot.currentTotal > snapshot.goalTotal
  ) {
    errors.push("currentTotal inválido.");
  }

  if (
    !Number.isFinite(snapshot.percentage) ||
    snapshot.percentage < 0 ||
    snapshot.percentage > 100
  ) {
    errors.push("percentage inválido.");
  }

  if (!snapshot.categories || typeof snapshot.categories !== "object") {
    errors.push("categories inválido.");
  } else {
    for (const [key, definition] of Object.entries(PROGRESS_CATEGORY_DEFINITIONS)) {
      const category = snapshot.categories[key];
      if (!category || typeof category !== "object") {
        errors.push(`categories.${key} ausente.`);
        continue;
      }
      if (
        !Number.isFinite(category.activePoints) ||
        category.activePoints < 0 ||
        category.activePoints > definition.cap
      ) {
        errors.push(`categories.${key}.activePoints inválido.`);
      }
      if (category.cap !== definition.cap) {
        errors.push(`categories.${key}.cap inválido.`);
      }
      if (!Array.isArray(category.evidenceIds)) {
        errors.push(`categories.${key}.evidenceIds inválido.`);
      }
    }
  }

  if (!Array.isArray(snapshot.suspendedReasons)) {
    errors.push("suspendedReasons deve ser um array.");
  }

  if (!Number.isInteger(snapshot.entityVersion) || snapshot.entityVersion < 1) {
    errors.push("entityVersion inválido.");
  }

  return { valid: errors.length === 0, errors };
}

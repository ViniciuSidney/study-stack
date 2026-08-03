import {
  createRichContent,
  getRichContentPlainText,
  validateRichContent,
} from "./rich-content.js";

export const SUBJECT_STUDY_STATES = Object.freeze([
  "initial_base",
  "in_practice",
  "in_review",
  "consolidated",
  "custom",
]);

const STUDY_STATES = new Set(SUBJECT_STUDY_STATES);
const OVERVIEW_RICH_FIELDS = Object.freeze([
  "nextStep",
  "mainDifficulty",
  "currentPerception",
  "progressObservation",
]);

function richTextEmpty() {
  return {
    format: "sanitized_html",
    content: "",
    plainText: "",
    contentVersion: "1.0.0",
    updatedAt: null,
  };
}

function sourceFieldsFromContext(context) {
  return {
    matterId: context.matterId,
    themeId: context.themeId,
    matterName: context.matterName,
    themeName: context.themeName,
    subjectName: context.subjectName,
    sourceApp: "concept_compass",
    sourceContractVersion: context.contractVersion,
    sourceArchived: context.sourceArchived,
    sourceAvailable: true,
    returnUrl: context.returnUrl || null,
    navigationContext: context.navigationContext || null,
  };
}

export function createSubjectFromContext(context, now) {
  if (!context?.valid) {
    throw new TypeError("Um contexto válido é obrigatório.");
  }

  return {
    id: context.subjectId,
    ...sourceFieldsFromContext(context),
    studyState: "initial_base",
    overview: {
      nextStep: richTextEmpty(),
      mainDifficulty: richTextEmpty(),
      currentPerception: richTextEmpty(),
      progressObservation: richTextEmpty(),
      perceivedMastery: null,
      updatedAt: null,
    },
    progressConfig: {
      goalTotal: 10,
      categoryCaps: {
        base: 2,
        practice: 3,
        errorAnalysis: 2,
        review: 2,
        consolidation: 1,
      },
      manualAdjustment: null,
      calculationVersion: "1.0.0",
    },
    consolidation: {
      status: "not_eligible",
      confirmedAt: null,
      suspendedAt: null,
      finalObservation: null,
      lastReason: null,
      confirmationCount: 0,
    },
    lastActivityAt: null,
    sourceLastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
    entityVersion: 1,
  };
}

export function mergeSubjectWithContext(subject, context, now) {
  if (!subject || subject.id !== context.subjectId) {
    throw new TypeError("O assunto e o contexto devem possuir o mesmo ID.");
  }

  const sourceFields = sourceFieldsFromContext(context);
  const changed = Object.entries(sourceFields).some(
    ([key, value]) => JSON.stringify(subject[key] ?? null) !== JSON.stringify(value),
  );

  if (!changed) {
    return { subject, changed: false };
  }

  return {
    changed: true,
    subject: {
      ...subject,
      ...sourceFields,
      sourceLastSyncedAt: now,
      updatedAt: now,
      entityVersion: Math.max(1, Number(subject.entityVersion) || 1),
    },
  };
}

export function updateSubjectOverview(subject, input, now) {
  if (!subject || typeof subject !== "object" || Array.isArray(subject)) {
    throw new TypeError("Um Subject existente é obrigatório.");
  }

  const next = structuredClone(subject);
  const overviewInput = input?.overview ?? input ?? {};

  for (const field of OVERVIEW_RICH_FIELDS) {
    if (Object.hasOwn(overviewInput, field)) {
      next.overview[field] = createRichContent(overviewInput[field], now);
    }
  }

  if (Object.hasOwn(overviewInput, "perceivedMastery")) {
    const rawValue = overviewInput.perceivedMastery;
    const value = rawValue === "" || rawValue === null ? null : Number(rawValue);

    if (
      value !== null &&
      (!Number.isInteger(value) || value < 0 || value > 100)
    ) {
      throw new TypeError("O domínio percebido deve ficar entre 0 e 100.");
    }

    next.overview.perceivedMastery = value;
  }

  if (Object.hasOwn(input ?? {}, "studyState")) {
    if (!STUDY_STATES.has(input.studyState)) {
      throw new TypeError("Estado de estudo inválido.");
    }
    next.studyState = input.studyState;
  }

  next.overview.updatedAt = now;
  next.lastActivityAt = now;
  next.updatedAt = now;

  const validation = validateSubject(next);
  if (!validation.valid) {
    throw new TypeError(validation.errors.join(" "));
  }

  return next;
}

export function hasOverviewContent(subject) {
  return Boolean(
    OVERVIEW_RICH_FIELDS.some((field) =>
      getRichContentPlainText(subject?.overview?.[field]),
    ) || Number.isInteger(subject?.overview?.perceivedMastery),
  );
}

export function validateSubject(subject) {
  const errors = [];

  if (!subject || typeof subject !== "object") {
    return { valid: false, errors: ["Subject deve ser um objeto."] };
  }

  for (const key of [
    "id",
    "matterId",
    "themeId",
    "matterName",
    "themeName",
    "subjectName",
  ]) {
    if (typeof subject[key] !== "string" || !subject[key].trim()) {
      errors.push(`${key} ausente.`);
    }
  }

  if (!STUDY_STATES.has(subject.studyState)) {
    errors.push("studyState inválido.");
  }

  if (subject.sourceApp !== "concept_compass") {
    errors.push("sourceApp inválido.");
  }

  if (!subject.overview || typeof subject.overview !== "object") {
    errors.push("overview inválido.");
  } else {
    for (const field of OVERVIEW_RICH_FIELDS) {
      const validation = validateRichContent(subject.overview[field]);
      errors.push(...validation.errors.map((error) => `overview.${field}: ${error}`));
    }

    const mastery = subject.overview.perceivedMastery;
    if (
      mastery !== null &&
      (!Number.isInteger(mastery) || mastery < 0 || mastery > 100)
    ) {
      errors.push("overview.perceivedMastery inválido.");
    }

    if (
      subject.overview.updatedAt !== null &&
      (typeof subject.overview.updatedAt !== "string" ||
        Number.isNaN(Date.parse(subject.overview.updatedAt)))
    ) {
      errors.push("overview.updatedAt inválido.");
    }
  }

  if (
    !subject.progressConfig ||
    !Number.isFinite(subject.progressConfig.goalTotal) ||
    subject.progressConfig.goalTotal <= 0
  ) {
    errors.push("progressConfig.goalTotal inválido.");
  }

  if (!subject.consolidation || typeof subject.consolidation !== "object") {
    errors.push("consolidation inválido.");
  }

  if (!Number.isInteger(subject.entityVersion) || subject.entityVersion < 1) {
    errors.push("entityVersion inválido.");
  }

  return { valid: errors.length === 0, errors };
}

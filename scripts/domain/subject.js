const STUDY_STATES = new Set([
  "initial_base",
  "in_practice",
  "in_review",
  "consolidated",
  "custom",
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

  return { valid: errors.length === 0, errors };
}

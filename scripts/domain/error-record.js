import {
  createOptionalRichContent,
  getRichContentPlainText,
  validateRichContent,
} from "./rich-content.js";

export const ERROR_REVIEW_STATUSES = Object.freeze(["pending", "reviewed"]);
export const ERROR_MASTERY_STATUSES = Object.freeze(["active", "overcome"]);
export const ERROR_OCCURRENCE_KINDS = Object.freeze(["initial", "recurrence"]);
export const ERROR_EVIDENCE_RESULTS = Object.freeze(["correct", "incorrect"]);
export const ERROR_TAG_OPTIONS = Object.freeze([
  "conceitual",
  "interpretação",
  "cálculo",
  "distração",
  "memorização",
  "procedimento",
  "outro",
]);

const REVIEW_STATUS_SET = new Set(ERROR_REVIEW_STATUSES);
const MASTERY_STATUS_SET = new Set(ERROR_MASTERY_STATUSES);
const OCCURRENCE_KIND_SET = new Set(ERROR_OCCURRENCE_KINDS);
const EVIDENCE_RESULT_SET = new Set(ERROR_EVIDENCE_RESULTS);

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeStringArray(value, max = 30) {
  const source = Array.isArray(value) ? value : [];
  return [...new Set(source.map(normalizeString).filter(Boolean))].slice(0, max);
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isIsoDateTime(value, { optional = false } = {}) {
  if (value === null && optional) {
    return true;
  }

  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function createAnalysis(input, now) {
  const whyItHappened = createOptionalRichContent(input?.whyItHappened, now);
  const correctRule = createOptionalRichContent(input?.correctRule, now);
  const howToAvoid = createOptionalRichContent(input?.howToAvoid, now);
  const isComplete = Boolean(
    getRichContentPlainText(whyItHappened) &&
      getRichContentPlainText(correctRule) &&
      getRichContentPlainText(howToAvoid),
  );

  return {
    whyItHappened,
    correctRule,
    howToAvoid,
    isComplete,
    updatedAt: now,
  };
}

export function createErrorRecord({
  id,
  recordId,
  subjectId,
  questionId,
  occurrenceId,
  now,
}) {
  const errorRecord = {
    id: normalizeString(id),
    recordId: normalizeString(recordId),
    subjectId: normalizeString(subjectId),
    primaryQuestionId: normalizeString(questionId),
    linkedQuestionIds: [normalizeString(questionId)],
    analysis: createAnalysis({}, null),
    errorTags: [],
    linkedRecordIds: [],
    reviewStatus: "pending",
    masteryStatus: "active",
    reviewCount: 0,
    recurrenceCount: 0,
    occurrenceIds: [normalizeString(occurrenceId)],
    evidenceIds: [],
    currentCorrectStreak: 0,
    lastOccurrenceAt: now,
    lastReviewedAt: null,
    overcomeAt: null,
    flashcoreLink: null,
    createdAt: now,
    updatedAt: now,
    entityVersion: 1,
  };

  const validation = validateErrorRecord(errorRecord);
  if (!validation.valid) {
    throw new TypeError(validation.errors.join(" "));
  }

  return errorRecord;
}

export function createErrorOccurrence({
  id,
  errorRecordId,
  question,
  occurredAt,
  kind = "initial",
  notes = null,
}) {
  const occurrence = {
    id: normalizeString(id),
    errorRecordId: normalizeString(errorRecordId),
    questionId: normalizeString(question?.id),
    sessionId: normalizeString(question?.sessionId) || null,
    occurredAt,
    kind,
    userAnswerSnapshot: question?.userAnswer
      ? structuredClone(question.userAnswer)
      : null,
    correctAnswerSnapshot: question?.correctAnswer
      ? structuredClone(question.correctAnswer)
      : null,
    causeUpdateSuggested: kind === "recurrence",
    notes: createOptionalRichContent(notes, occurredAt),
    entityVersion: 1,
  };

  const validation = validateErrorOccurrence(occurrence);
  if (!validation.valid) {
    throw new TypeError(validation.errors.join(" "));
  }

  return occurrence;
}

export function createErrorEvidence({
  id,
  errorRecordId,
  question,
  answeredAt,
  sequencePosition,
  validAfterOccurrenceId,
}) {
  const evidence = {
    id: normalizeString(id),
    errorRecordId: normalizeString(errorRecordId),
    questionId: normalizeString(question?.id),
    sessionId: normalizeString(question?.sessionId) || null,
    answeredAt,
    result: question?.result === "correct" ? "correct" : "incorrect",
    sequencePosition,
    validAfterOccurrenceId: normalizeString(validAfterOccurrenceId),
    sourceApp: "test_quest",
    invalidatedAt: null,
    entityVersion: 1,
  };

  const validation = validateErrorEvidence(evidence);
  if (!validation.valid) {
    throw new TypeError(validation.errors.join(" "));
  }

  return evidence;
}

export function updateErrorAnalysis(errorRecord, input, now) {
  const next = structuredClone(errorRecord);
  next.analysis = createAnalysis(input, now);
  if (!next.analysis.isComplete && next.reviewStatus === "reviewed") {
    next.reviewStatus = "pending";
  }
  next.errorTags = normalizeStringArray(input?.errorTags, 12);
  next.linkedRecordIds = normalizeStringArray(input?.linkedRecordIds, 30);
  next.updatedAt = now;

  const validation = validateErrorRecord(next);
  if (!validation.valid) {
    throw new TypeError(validation.errors.join(" "));
  }

  return next;
}

export function setErrorReviewStatus(errorRecord, reviewed, now) {
  const next = structuredClone(errorRecord);
  const nextStatus = reviewed ? "reviewed" : "pending";

  if (next.reviewStatus === nextStatus) {
    return next;
  }

  next.reviewStatus = nextStatus;
  next.lastReviewedAt = reviewed ? now : next.lastReviewedAt;
  next.reviewCount += reviewed ? 1 : 0;
  next.updatedAt = now;

  return next;
}

export function registerErrorRecurrence(
  errorRecord,
  { occurrenceId, questionId, occurredAt },
) {
  const next = structuredClone(errorRecord);
  next.linkedQuestionIds = normalizeStringArray([
    ...next.linkedQuestionIds,
    questionId,
  ]);
  next.occurrenceIds = normalizeStringArray([
    ...next.occurrenceIds,
    occurrenceId,
  ]);
  next.recurrenceCount += 1;
  next.reviewStatus = "pending";
  next.masteryStatus = "active";
  next.currentCorrectStreak = 0;
  next.lastOccurrenceAt = occurredAt;
  next.overcomeAt = null;
  next.updatedAt = occurredAt;

  return next;
}

export function registerCorrectEvidence(
  errorRecord,
  { evidenceId, questionId, answeredAt },
) {
  const next = structuredClone(errorRecord);
  next.linkedQuestionIds = normalizeStringArray([
    ...next.linkedQuestionIds,
    questionId,
  ]);
  next.evidenceIds = normalizeStringArray([...next.evidenceIds, evidenceId]);
  next.currentCorrectStreak = Math.min(2, next.currentCorrectStreak + 1);
  next.masteryStatus = next.currentCorrectStreak >= 2 ? "overcome" : "active";
  next.overcomeAt = next.masteryStatus === "overcome" ? answeredAt : null;
  next.updatedAt = answeredAt;

  return next;
}

export function validateErrorRecord(errorRecord) {
  const errors = [];

  if (!isPlainObject(errorRecord)) {
    return { valid: false, errors: ["ErrorRecord deve ser um objeto."] };
  }

  for (const key of [
    "id",
    "recordId",
    "subjectId",
    "primaryQuestionId",
  ]) {
    if (typeof errorRecord[key] !== "string" || !errorRecord[key].trim()) {
      errors.push(`${key} ausente.`);
    }
  }

  for (const key of [
    "linkedQuestionIds",
    "errorTags",
    "linkedRecordIds",
    "occurrenceIds",
    "evidenceIds",
  ]) {
    if (
      !Array.isArray(errorRecord[key]) ||
      errorRecord[key].some((value) => typeof value !== "string" || !value.trim()) ||
      new Set(errorRecord[key]).size !== errorRecord[key].length
    ) {
      errors.push(`${key} inválido.`);
    }
  }

  if (!errorRecord.linkedQuestionIds?.includes(errorRecord.primaryQuestionId)) {
    errors.push("primaryQuestionId deve constar em linkedQuestionIds.");
  }

  if (!isPlainObject(errorRecord.analysis)) {
    errors.push("analysis inválido.");
  } else {
    for (const field of ["whyItHappened", "correctRule", "howToAvoid"]) {
      const validation = validateRichContent(errorRecord.analysis[field], {
        optional: true,
      });
      errors.push(...validation.errors.map((error) => `analysis.${field}: ${error}`));
    }

    const expectedComplete = Boolean(
      getRichContentPlainText(errorRecord.analysis.whyItHappened) &&
        getRichContentPlainText(errorRecord.analysis.correctRule) &&
        getRichContentPlainText(errorRecord.analysis.howToAvoid),
    );
    if (errorRecord.analysis.isComplete !== expectedComplete) {
      errors.push("analysis.isComplete diverge dos campos obrigatórios.");
    }
    if (!isIsoDateTime(errorRecord.analysis.updatedAt, { optional: true })) {
      errors.push("analysis.updatedAt inválido.");
    }
  }

  if (!REVIEW_STATUS_SET.has(errorRecord.reviewStatus)) {
    errors.push("reviewStatus inválido.");
  }
  if (!MASTERY_STATUS_SET.has(errorRecord.masteryStatus)) {
    errors.push("masteryStatus inválido.");
  }
  for (const key of ["reviewCount", "recurrenceCount"]) {
    if (!Number.isInteger(errorRecord[key]) || errorRecord[key] < 0) {
      errors.push(`${key} inválido.`);
    }
  }
  if (
    !Number.isInteger(errorRecord.currentCorrectStreak) ||
    errorRecord.currentCorrectStreak < 0 ||
    errorRecord.currentCorrectStreak > 2
  ) {
    errors.push("currentCorrectStreak inválido.");
  }
  if (
    (errorRecord.masteryStatus === "overcome") !==
    (errorRecord.currentCorrectStreak === 2)
  ) {
    errors.push(
      "masteryStatus deve corresponder à sequência de duas evidências corretas.",
    );
  }
  if (errorRecord.masteryStatus === "overcome" && !errorRecord.overcomeAt) {
    errors.push("Um erro superado exige overcomeAt.");
  }
  if (errorRecord.reviewStatus === "reviewed" && !errorRecord.analysis?.isComplete) {
    errors.push("Um erro revisado exige análise completa.");
  }
  if (errorRecord.occurrenceIds?.length !== errorRecord.recurrenceCount + 1) {
    errors.push("occurrenceIds diverge de recurrenceCount.");
  }

  for (const key of ["lastOccurrenceAt", "createdAt", "updatedAt"]) {
    if (!isIsoDateTime(errorRecord[key])) {
      errors.push(`${key} inválido.`);
    }
  }
  for (const key of ["lastReviewedAt", "overcomeAt"]) {
    if (!isIsoDateTime(errorRecord[key], { optional: true })) {
      errors.push(`${key} inválido.`);
    }
  }

  if (errorRecord.flashcoreLink !== null && !isPlainObject(errorRecord.flashcoreLink)) {
    errors.push("flashcoreLink inválido.");
  }
  if (!Number.isInteger(errorRecord.entityVersion) || errorRecord.entityVersion < 1) {
    errors.push("entityVersion inválido.");
  }

  return { valid: errors.length === 0, errors };
}

export function validateErrorOccurrence(occurrence) {
  const errors = [];

  if (!isPlainObject(occurrence)) {
    return { valid: false, errors: ["ErrorOccurrence deve ser um objeto."] };
  }
  for (const key of ["id", "errorRecordId", "questionId"]) {
    if (typeof occurrence[key] !== "string" || !occurrence[key].trim()) {
      errors.push(`${key} ausente.`);
    }
  }
  if (!isIsoDateTime(occurrence.occurredAt)) {
    errors.push("occurredAt inválido.");
  }
  if (!OCCURRENCE_KIND_SET.has(occurrence.kind)) {
    errors.push("kind inválido.");
  }
  for (const field of ["userAnswerSnapshot", "correctAnswerSnapshot", "notes"]) {
    const validation = validateRichContent(occurrence[field], { optional: true });
    errors.push(...validation.errors.map((error) => `${field}: ${error}`));
  }
  if (typeof occurrence.causeUpdateSuggested !== "boolean") {
    errors.push("causeUpdateSuggested inválido.");
  }
  if (!Number.isInteger(occurrence.entityVersion) || occurrence.entityVersion < 1) {
    errors.push("entityVersion inválido.");
  }

  return { valid: errors.length === 0, errors };
}

export function validateErrorEvidence(evidence) {
  const errors = [];

  if (!isPlainObject(evidence)) {
    return { valid: false, errors: ["ErrorEvidence deve ser um objeto."] };
  }
  for (const key of [
    "id",
    "errorRecordId",
    "questionId",
    "validAfterOccurrenceId",
  ]) {
    if (typeof evidence[key] !== "string" || !evidence[key].trim()) {
      errors.push(`${key} ausente.`);
    }
  }
  if (!isIsoDateTime(evidence.answeredAt)) {
    errors.push("answeredAt inválido.");
  }
  if (!EVIDENCE_RESULT_SET.has(evidence.result)) {
    errors.push("result inválido.");
  }
  if (!Number.isInteger(evidence.sequencePosition) || evidence.sequencePosition < 1) {
    errors.push("sequencePosition inválido.");
  }
  if (evidence.sourceApp !== "test_quest") {
    errors.push("sourceApp inválido.");
  }
  if (!isIsoDateTime(evidence.invalidatedAt, { optional: true })) {
    errors.push("invalidatedAt inválido.");
  }
  if (!Number.isInteger(evidence.entityVersion) || evidence.entityVersion < 1) {
    errors.push("entityVersion inválido.");
  }

  return { valid: errors.length === 0, errors };
}

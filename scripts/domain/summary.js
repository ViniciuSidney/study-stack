import {
  createOptionalRichContent,
  createRichContent,
  createRichContentFromHtml,
  getRichContentPlainText,
  validateRichContent,
} from "./rich-content.js";

export const SUMMARY_SOURCE_TYPES = Object.freeze([
  "ai",
  "handout",
  "class",
  "video",
  "book",
  "website",
  "other",
]);

const SOURCE_TYPE_SET = new Set(SUMMARY_SOURCE_TYPES);
const OPTIONAL_RICH_FIELDS = Object.freeze([
  "studyObjective",
  "keyConcepts",
  "examples",
  "remainingQuestions",
  "synthesis",
]);

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeReferences(value) {
  const source = Array.isArray(value)
    ? value
    : String(value ?? "").split(/\r?\n/gu);

  return [
    ...new Set(
      source
        .map((reference) => normalizeString(reference))
        .filter(Boolean),
    ),
  ].slice(0, 30);
}

function normalizeSourceType(value) {
  const sourceType = normalizeString(value);

  if (!sourceType) {
    return null;
  }

  if (!SOURCE_TYPE_SET.has(sourceType)) {
    throw new TypeError("Tipo de fonte do Resumo inválido.");
  }

  return sourceType;
}

function toRichContent(value, now, { optional = false } = {}) {
  if (optional) {
    return createOptionalRichContent(value, now);
  }

  if (typeof value === "string") {
    return createRichContent(value, now);
  }

  return createRichContentFromHtml(value, now);
}

export function createEmptySummary(recordId, now) {
  const id = normalizeString(recordId);

  if (!id) {
    throw new TypeError("O Summary exige um recordId.");
  }

  return {
    id,
    recordId: id,
    mainContent: createRichContent("", now),
    studyObjective: null,
    keyConcepts: null,
    examples: null,
    remainingQuestions: null,
    synthesis: null,
    sourceType: null,
    sourceDescription: null,
    references: [],
    isStudied: false,
    studiedAt: null,
    studyMarkHistory: [],
    entityVersion: 1,
  };
}

export function updateSummary(summary, changes, now) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new TypeError("Summary existente é obrigatório.");
  }

  if (changes?.recordId && changes.recordId !== summary.recordId) {
    throw new TypeError("O vínculo do Summary não pode ser alterado.");
  }

  const next = structuredClone(summary);

  if (Object.hasOwn(changes ?? {}, "mainContent")) {
    next.mainContent = toRichContent(changes.mainContent, now);
  }

  for (const field of OPTIONAL_RICH_FIELDS) {
    if (Object.hasOwn(changes ?? {}, field)) {
      next[field] = toRichContent(changes[field], now, { optional: true });
    }
  }

  if (Object.hasOwn(changes ?? {}, "sourceType")) {
    next.sourceType = normalizeSourceType(changes.sourceType);
  }

  if (Object.hasOwn(changes ?? {}, "sourceDescription")) {
    next.sourceDescription = normalizeString(changes.sourceDescription) || null;
  }

  if (Object.hasOwn(changes ?? {}, "references")) {
    next.references = normalizeReferences(changes.references);
  }

  const validation = validateSummary(next);

  if (!validation.valid) {
    throw new TypeError(validation.errors.join(" "));
  }

  return next;
}

export function setSummaryStudied(summary, isStudied, now, eventId) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new TypeError("Summary existente é obrigatório.");
  }

  const studied = Boolean(isStudied);

  if (summary.isStudied === studied) {
    return structuredClone(summary);
  }

  const next = structuredClone(summary);
  next.isStudied = studied;
  next.studiedAt = studied ? now : null;
  next.studyMarkHistory.push({
    id: normalizeString(eventId) || `study-mark-${now}`,
    isStudied: studied,
    occurredAt: now,
  });

  const validation = validateSummary(next);

  if (!validation.valid) {
    throw new TypeError(validation.errors.join(" "));
  }

  return next;
}

export function isSummaryCompletionReady(summary, record = null) {
  return Boolean(
    normalizeString(record?.title) &&
      getRichContentPlainText(summary?.mainContent),
  );
}

export function getSummarySearchText(summary) {
  if (!summary) {
    return "";
  }

  return [
    getRichContentPlainText(summary.mainContent),
    ...OPTIONAL_RICH_FIELDS.map((field) => getRichContentPlainText(summary[field])),
    summary.sourceDescription ?? "",
    ...(summary.references ?? []),
  ]
    .join(" ")
    .trim();
}

export function validateSummary(summary) {
  const errors = [];

  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return { valid: false, errors: ["Summary deve ser um objeto."] };
  }

  for (const key of ["id", "recordId"]) {
    if (typeof summary[key] !== "string" || !summary[key].trim()) {
      errors.push(`${key} ausente.`);
    }
  }

  if (summary.id !== summary.recordId) {
    errors.push("O ID do Summary deve ser igual ao recordId.");
  }

  const mainValidation = validateRichContent(summary.mainContent);
  errors.push(...mainValidation.errors.map((error) => `mainContent: ${error}`));

  for (const field of OPTIONAL_RICH_FIELDS) {
    const validation = validateRichContent(summary[field], { optional: true });
    errors.push(...validation.errors.map((error) => `${field}: ${error}`));
  }

  if (summary.sourceType !== null && !SOURCE_TYPE_SET.has(summary.sourceType)) {
    errors.push("sourceType inválido.");
  }

  if (
    summary.sourceDescription !== null &&
    typeof summary.sourceDescription !== "string"
  ) {
    errors.push("sourceDescription inválida.");
  }

  if (
    !Array.isArray(summary.references) ||
    summary.references.some(
      (reference) => typeof reference !== "string" || !reference.trim(),
    )
  ) {
    errors.push("references inválidas.");
  }

  if (typeof summary.isStudied !== "boolean") {
    errors.push("isStudied inválido.");
  }

  if (
    summary.studiedAt !== null &&
    (typeof summary.studiedAt !== "string" ||
      Number.isNaN(Date.parse(summary.studiedAt)))
  ) {
    errors.push("studiedAt inválido.");
  }

  if (!Array.isArray(summary.studyMarkHistory)) {
    errors.push("studyMarkHistory deve ser um array.");
  } else {
    summary.studyMarkHistory.forEach((event, index) => {
      if (!event || typeof event !== "object" || Array.isArray(event)) {
        errors.push(`studyMarkHistory.${index} inválido.`);
        return;
      }

      if (typeof event.id !== "string" || !event.id.trim()) {
        errors.push(`studyMarkHistory.${index}.id ausente.`);
      }

      if (typeof event.isStudied !== "boolean") {
        errors.push(`studyMarkHistory.${index}.isStudied inválido.`);
      }

      if (
        typeof event.occurredAt !== "string" ||
        Number.isNaN(Date.parse(event.occurredAt))
      ) {
        errors.push(`studyMarkHistory.${index}.occurredAt inválido.`);
      }
    });
  }

  if (!Number.isInteger(summary.entityVersion) || summary.entityVersion < 1) {
    errors.push("entityVersion inválido.");
  }

  return { valid: errors.length === 0, errors };
}

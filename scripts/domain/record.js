import {
  createRichContent,
  getRichContentPlainText,
  validateRichContent,
} from "./rich-content.js";

export const RECORD_TYPES = Object.freeze([
  "summary",
  "note",
  "imported_session",
  "error_record",
]);

export const MANUAL_RECORD_TYPES = Object.freeze(["summary", "note"]);
export const RECORD_STATUSES = Object.freeze([
  "draft",
  "in_progress",
  "completed",
]);

const RECORD_TYPE_SET = new Set(RECORD_TYPES);
const MANUAL_TYPE_SET = new Set(MANUAL_RECORD_TYPES);
const RECORD_STATUS_SET = new Set(RECORD_STATUSES);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeTags(tags) {
  const source = Array.isArray(tags)
    ? tags
    : String(tags ?? "").split(/[;,]/u);
  const normalized = source
    .map((tag) => normalizeString(tag).toLocaleLowerCase("pt-BR"))
    .filter(Boolean);

  return [...new Set(normalized)].slice(0, 20);
}

function isValidDate(value) {
  if (!DATE_PATTERN.test(value ?? "")) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function assertValidDate(value, fieldName) {
  if (!isValidDate(value)) {
    throw new TypeError(`${fieldName} deve usar uma data válida em YYYY-MM-DD.`);
  }
}

export function buildRecordSearchPlainText(record, extraText = "") {
  const extra = Array.isArray(extraText) ? extraText : [extraText];

  return [
    record.title,
    ...record.tags,
    getRichContentPlainText(record.personalNotes),
    ...extra,
  ]
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function isManualRecordType(type) {
  return MANUAL_TYPE_SET.has(type);
}

export function createRecord(input, now) {
  const id = normalizeString(input?.id);
  const subjectId = normalizeString(input?.subjectId);
  const type = normalizeString(input?.type);
  const title = normalizeString(input?.title);
  const status = normalizeString(input?.status || "draft");
  const studyDate = normalizeString(input?.studyDate);

  if (!id) {
    throw new TypeError("O Record exige um ID.");
  }

  if (!subjectId) {
    throw new TypeError("O Record exige um subjectId.");
  }

  if (!RECORD_TYPE_SET.has(type)) {
    throw new TypeError("Tipo de Record inválido.");
  }

  if (!RECORD_STATUS_SET.has(status)) {
    throw new TypeError("Status de Record inválido.");
  }

  if (status === "completed" && input?.allowCompletion !== true) {
    throw new TypeError(
      "A conclusão exige validação do conteúdo específico do registro.",
    );
  }

  assertValidDate(studyDate, "studyDate");

  const record = {
    id,
    subjectId,
    type,
    title,
    status,
    studyDate,
    createdAt: now,
    updatedAt: now,
    completedAt: status === "completed" ? now : null,
    isImportant: Boolean(input?.isImportant),
    tags: normalizeTags(input?.tags),
    personalNotes: createRichContent(input?.personalNotes, now),
    archivedAt: null,
    archiveReason: null,
    source: input?.source ? structuredClone(input.source) : null,
    entityVersion: 1,
    searchPlainText: "",
  };

  record.searchPlainText = buildRecordSearchPlainText(record);
  const validation = validateRecord(record);

  if (!validation.valid) {
    throw new TypeError(validation.errors.join(" "));
  }

  return record;
}

export function updateRecord(record, changes, now) {
  if (!record || typeof record !== "object") {
    throw new TypeError("Record existente é obrigatório.");
  }

  if (changes?.type && changes.type !== record.type) {
    throw new TypeError("O tipo do registro não pode ser alterado.");
  }

  if (changes?.subjectId && changes.subjectId !== record.subjectId) {
    throw new TypeError("O assunto do registro não pode ser alterado.");
  }

  const next = structuredClone(record);

  if (Object.hasOwn(changes ?? {}, "title")) {
    next.title = normalizeString(changes.title);
  }

  if (Object.hasOwn(changes ?? {}, "studyDate")) {
    const studyDate = normalizeString(changes.studyDate);
    assertValidDate(studyDate, "studyDate");
    next.studyDate = studyDate;
  }

  if (Object.hasOwn(changes ?? {}, "isImportant")) {
    next.isImportant = Boolean(changes.isImportant);
  }

  if (Object.hasOwn(changes ?? {}, "tags")) {
    next.tags = normalizeTags(changes.tags);
  }

  if (Object.hasOwn(changes ?? {}, "personalNotes")) {
    next.personalNotes = createRichContent(changes.personalNotes, now);
  }

  next.updatedAt = now;
  next.searchPlainText = buildRecordSearchPlainText(next);

  const validation = validateRecord(next);

  if (!validation.valid) {
    throw new TypeError(validation.errors.join(" "));
  }

  return next;
}

export function refreshRecordSearchIndex(record, extraText, now = null) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError("Record existente é obrigatório.");
  }

  const next = structuredClone(record);
  next.searchPlainText = buildRecordSearchPlainText(next, extraText);

  if (now !== null) {
    next.updatedAt = now;
  }

  const validation = validateRecord(next);

  if (!validation.valid) {
    throw new TypeError(validation.errors.join(" "));
  }

  return next;
}

export function changeRecordStatus(
  record,
  status,
  now,
  { completionReady = false } = {},
) {
  if (!RECORD_STATUS_SET.has(status)) {
    throw new TypeError("Status de Record inválido.");
  }

  if (status === "completed" && !completionReady) {
    throw new TypeError(
      "A conclusão exige validação do conteúdo específico do registro.",
    );
  }

  if (record.archivedAt) {
    throw new TypeError("Um registro arquivado não pode mudar de status.");
  }

  if (record.status === status) {
    return structuredClone(record);
  }

  const next = structuredClone(record);
  next.status = status;
  next.updatedAt = now;

  if (status === "completed") {
    next.completedAt = now;
  }

  return next;
}

export function archiveRecord(record, now, reason = "") {
  if (record.archivedAt) {
    return structuredClone(record);
  }

  const next = structuredClone(record);
  next.archivedAt = now;
  next.archiveReason = normalizeString(reason) || null;
  next.updatedAt = now;
  return next;
}

export function restoreRecord(record, now) {
  if (!record.archivedAt) {
    return structuredClone(record);
  }

  const next = structuredClone(record);
  next.archivedAt = null;
  next.archiveReason = null;
  next.updatedAt = now;
  return next;
}

export function validateRecord(record) {
  const errors = [];

  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return { valid: false, errors: ["Record deve ser um objeto."] };
  }

  for (const key of ["id", "subjectId"]) {
    if (typeof record[key] !== "string" || !record[key].trim()) {
      errors.push(`${key} ausente.`);
    }
  }

  if (!RECORD_TYPE_SET.has(record.type)) {
    errors.push("type inválido.");
  }

  if (!RECORD_STATUS_SET.has(record.status)) {
    errors.push("status inválido.");
  }

  if (typeof record.title !== "string") {
    errors.push("title deve ser uma string.");
  }

  if (!isValidDate(record.studyDate)) {
    errors.push("studyDate inválido.");
  }

  for (const key of ["createdAt", "updatedAt"]) {
    if (typeof record[key] !== "string" || Number.isNaN(Date.parse(record[key]))) {
      errors.push(`${key} inválido.`);
    }
  }

  if (
    record.completedAt !== null &&
    (typeof record.completedAt !== "string" ||
      Number.isNaN(Date.parse(record.completedAt)))
  ) {
    errors.push("completedAt inválido.");
  }

  if (
    record.archivedAt !== null &&
    (typeof record.archivedAt !== "string" ||
      Number.isNaN(Date.parse(record.archivedAt)))
  ) {
    errors.push("archivedAt inválido.");
  }

  if (typeof record.isImportant !== "boolean") {
    errors.push("isImportant inválido.");
  }

  if (!Array.isArray(record.tags) || record.tags.some((tag) => typeof tag !== "string")) {
    errors.push("tags inválidas.");
  }

  const richContentValidation = validateRichContent(record.personalNotes);
  errors.push(...richContentValidation.errors);

  if (!Number.isInteger(record.entityVersion) || record.entityVersion < 1) {
    errors.push("entityVersion inválido.");
  }

  if (typeof record.searchPlainText !== "string") {
    errors.push("searchPlainText inválido.");
  }

  return { valid: errors.length === 0, errors };
}

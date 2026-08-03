import {
  createRichContent,
  createRichContentFromHtml,
  getRichContentPlainText,
  validateRichContent,
} from "./rich-content.js";

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeLinkedRecordIds(value, recordId) {
  const source = Array.isArray(value) ? value : [];

  return [
    ...new Set(
      source
        .map((id) => normalizeString(id))
        .filter((id) => id && id !== recordId),
    ),
  ].slice(0, 50);
}

function toRichContent(value, now) {
  if (typeof value === "string") {
    return createRichContent(value, now);
  }

  return createRichContentFromHtml(value, now);
}

function isValidOptionalDateTime(value) {
  return (
    value === null ||
    (typeof value === "string" && !Number.isNaN(Date.parse(value)))
  );
}

export function createEmptyNote(
  recordId,
  now,
  { createdFromQuickDetail = false } = {},
) {
  const id = normalizeString(recordId);

  if (!id) {
    throw new TypeError("A Note exige um recordId.");
  }

  return {
    id,
    recordId: id,
    content: createRichContent("", now),
    linkedRecordIds: [],
    createdFromQuickDetail: Boolean(createdFromQuickDetail),
    quickDetailExpandedAt: null,
    entityVersion: 1,
  };
}

export function updateNote(note, changes, now) {
  if (!note || typeof note !== "object" || Array.isArray(note)) {
    throw new TypeError("Note existente é obrigatória.");
  }

  if (changes?.recordId && changes.recordId !== note.recordId) {
    throw new TypeError("O vínculo da Anotação não pode ser alterado.");
  }

  const next = structuredClone(note);

  if (Object.hasOwn(changes ?? {}, "content")) {
    next.content = toRichContent(changes.content, now);
  }

  if (Object.hasOwn(changes ?? {}, "linkedRecordIds")) {
    next.linkedRecordIds = normalizeLinkedRecordIds(
      changes.linkedRecordIds,
      next.recordId,
    );
  }

  if (Object.hasOwn(changes ?? {}, "createdFromQuickDetail")) {
    next.createdFromQuickDetail = Boolean(changes.createdFromQuickDetail);
  }

  if (Object.hasOwn(changes ?? {}, "quickDetailExpandedAt")) {
    const expandedAt = changes.quickDetailExpandedAt ?? null;

    if (!isValidOptionalDateTime(expandedAt)) {
      throw new TypeError("quickDetailExpandedAt inválido.");
    }

    next.quickDetailExpandedAt = expandedAt;
  }

  const validation = validateNote(next);

  if (!validation.valid) {
    throw new TypeError(validation.errors.join(" "));
  }

  return next;
}

export function markQuickDetailExpanded(note, now) {
  if (!note?.createdFromQuickDetail || note.quickDetailExpandedAt) {
    return structuredClone(note);
  }

  return updateNote(note, { quickDetailExpandedAt: now }, now);
}

export function isNoteCompletionReady(note, record = null) {
  return Boolean(
    normalizeString(record?.title) && getRichContentPlainText(note?.content),
  );
}

export function getChecklistStats(note) {
  const lines = getRichContentPlainText(note?.content).split(/\r?\n/gu);
  let total = 0;
  let completed = 0;

  for (const line of lines) {
    const match = line.match(/^\s*\[([ xX])\]\s+\S/gu);

    if (!match) {
      continue;
    }

    total += 1;

    if (/^\s*\[[xX]\]/u.test(line)) {
      completed += 1;
    }
  }

  return Object.freeze({ total, completed, pending: total - completed });
}

export function getNoteSearchText(note, linkedRecordTitles = []) {
  if (!note) {
    return "";
  }

  return [
    getRichContentPlainText(note.content),
    ...(Array.isArray(linkedRecordTitles) ? linkedRecordTitles : []),
  ]
    .join(" ")
    .trim();
}

export function deriveQuickDetailTitle(content, fallback = "Detalhe de estudo") {
  const plainText =
    typeof content === "string"
      ? content
      : getRichContentPlainText(toRichContent(content, null));
  const firstLine = plainText
    .split(/\r?\n/gu)
    .map((line) => line.replace(/^\s*\[[ xX]\]\s*/u, "").trim())
    .find(Boolean);

  if (!firstLine) {
    return fallback;
  }

  return firstLine.length <= 80
    ? firstLine
    : `${firstLine.slice(0, 77).trimEnd()}...`;
}

export function validateNote(note) {
  const errors = [];

  if (!note || typeof note !== "object" || Array.isArray(note)) {
    return { valid: false, errors: ["Note deve ser um objeto."] };
  }

  for (const key of ["id", "recordId"]) {
    if (typeof note[key] !== "string" || !note[key].trim()) {
      errors.push(`${key} ausente.`);
    }
  }

  if (note.id !== note.recordId) {
    errors.push("O ID da Note deve ser igual ao recordId.");
  }

  const contentValidation = validateRichContent(note.content);
  errors.push(...contentValidation.errors.map((error) => `content: ${error}`));

  if (
    !Array.isArray(note.linkedRecordIds) ||
    note.linkedRecordIds.some(
      (id) => typeof id !== "string" || !id.trim() || id === note.recordId,
    ) ||
    new Set(note.linkedRecordIds).size !== note.linkedRecordIds.length
  ) {
    errors.push("linkedRecordIds inválidos.");
  }

  if (typeof note.createdFromQuickDetail !== "boolean") {
    errors.push("createdFromQuickDetail inválido.");
  }

  if (!isValidOptionalDateTime(note.quickDetailExpandedAt)) {
    errors.push("quickDetailExpandedAt inválido.");
  }

  if (
    note.quickDetailExpandedAt !== null &&
    note.createdFromQuickDetail !== true
  ) {
    errors.push(
      "quickDetailExpandedAt exige criação pelo fluxo Apenas um detalhe.",
    );
  }

  if (!Number.isInteger(note.entityVersion) || note.entityVersion < 1) {
    errors.push("entityVersion inválido.");
  }

  return { valid: errors.length === 0, errors };
}

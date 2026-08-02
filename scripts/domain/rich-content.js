const CONTENT_FORMAT = "sanitized_html";
const CONTENT_VERSION = "1.0.0";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizePlainText(value) {
  return String(value ?? "")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .trim();
}

export function createRichContent(value = "", now = null) {
  const plainText = normalizePlainText(value);
  const content = plainText
    ? `<p>${escapeHtml(plainText).replaceAll("\n", "<br>")}</p>`
    : "";

  return {
    format: CONTENT_FORMAT,
    content,
    plainText,
    contentVersion: CONTENT_VERSION,
    updatedAt: now,
  };
}

export function validateRichContent(value, { optional = false } = {}) {
  const errors = [];

  if (value === null && optional) {
    return { valid: true, errors };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, errors: ["Conteúdo rico inválido."] };
  }

  if (value.format !== CONTENT_FORMAT) {
    errors.push("Formato de conteúdo rico inválido.");
  }

  if (typeof value.content !== "string") {
    errors.push("content deve ser uma string.");
  }

  if (typeof value.plainText !== "string") {
    errors.push("plainText deve ser uma string.");
  }

  if (value.contentVersion !== CONTENT_VERSION) {
    errors.push("contentVersion incompatível.");
  }

  if (
    value.updatedAt !== null &&
    (typeof value.updatedAt !== "string" || Number.isNaN(Date.parse(value.updatedAt)))
  ) {
    errors.push("updatedAt do conteúdo rico é inválido.");
  }

  return { valid: errors.length === 0, errors };
}

export function getRichContentPlainText(value) {
  return value?.plainText?.trim?.() ?? "";
}

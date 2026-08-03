const CONTENT_FORMAT = "sanitized_html";
const CONTENT_VERSION = "1.0.0";

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "u",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function decodeBasicEntities(value) {
  return String(value)
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'");
}

function normalizePlainText(value) {
  return String(value ?? "")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replace(/[\t ]+\n/gu, "\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

export function sanitizeRichHtml(value) {
  let html = String(value ?? "")
    .replace(/<!--[\s\S]*?-->/gu, "")
    .replace(
      /<(script|style|iframe|object|embed|svg|math|form)[^>]*>[\s\S]*?<\/\1\s*>/giu,
      "",
    )
    .replace(/<(script|style|iframe|object|embed|svg|math|form)[^>]*\/?>/giu, "");

  html = html.replace(/<\s*(\/?)\s*([a-z0-9]+)(?:\s[^>]*)?>/giu, (
    _match,
    closing,
    rawTag,
  ) => {
    const originalTag = rawTag.toLocaleLowerCase("en-US");
    const tag =
      originalTag === "b"
        ? "strong"
        : originalTag === "i"
          ? "em"
          : originalTag === "div"
            ? "p"
            : originalTag;

    if (!ALLOWED_TAGS.has(tag)) {
      return "";
    }

    if (tag === "br") {
      return "<br>";
    }

    return closing ? `</${tag}>` : `<${tag}>`;
  });

  return html.trim();
}

export function richHtmlToPlainText(value) {
  const html = sanitizeRichHtml(value)
    .replace(/<br>/giu, "\n")
    .replace(/<\/(p|h2|h3|li|blockquote|tr)>/giu, "\n")
    .replace(/<[^>]+>/gu, "");

  return normalizePlainText(decodeBasicEntities(html));
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

export function createRichContentFromHtml(value = {}, now = null) {
  const rawContent = typeof value === "string" ? value : value?.content;
  const content = sanitizeRichHtml(rawContent);
  const suppliedPlainText =
    typeof value === "object" && value !== null ? value.plainText : null;
  const plainText = normalizePlainText(
    suppliedPlainText ?? richHtmlToPlainText(content),
  );

  return {
    format: CONTENT_FORMAT,
    content: plainText ? content : "",
    plainText,
    contentVersion: CONTENT_VERSION,
    updatedAt: now,
  };
}

export function createOptionalRichContent(value, now = null) {
  if (value === null || value === undefined) {
    return null;
  }

  const richContent =
    typeof value === "string"
      ? createRichContent(value, now)
      : createRichContentFromHtml(value, now);

  return richContent.plainText ? richContent : null;
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
  } else if (sanitizeRichHtml(value.content) !== value.content.trim()) {
    errors.push("content contém marcação não permitida.");
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

export function getAllowedRichTextTags() {
  return Object.freeze([...ALLOWED_TAGS]);
}

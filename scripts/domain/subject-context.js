const SUBJECT_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,127}$/;

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeSubjectContext(input = {}) {
  const subjectId = cleanText(input.subjectId);
  const subjectName = cleanText(input.subjectName);
  const themeName = cleanText(input.themeName);
  const subjectArea = cleanText(input.subjectArea);
  const returnUrl = cleanText(input.returnUrl);

  const errors = [];

  if (!SUBJECT_ID_PATTERN.test(subjectId)) {
    errors.push("subjectId inválido ou ausente.");
  }

  if (!subjectName) {
    errors.push("subjectName ausente.");
  }

  if (!themeName) {
    errors.push("themeName ausente.");
  }

  if (!subjectArea) {
    errors.push("subjectArea ausente.");
  }

  return Object.freeze({
    valid: errors.length === 0,
    subjectId,
    subjectName,
    themeName,
    subjectArea,
    returnUrl,
    errors: Object.freeze(errors),
    source: cleanText(input.source) || "unknown",
  });
}

export function createMissingSubjectContext(reason = "Contexto não informado.") {
  return Object.freeze({
    valid: false,
    subjectId: "",
    subjectName: "",
    themeName: "",
    subjectArea: "",
    returnUrl: "",
    errors: Object.freeze([reason]),
    source: "missing",
  });
}

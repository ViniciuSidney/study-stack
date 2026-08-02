const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,127}$/;

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return fallback;
}

function validIsoDateTime(value) {
  return Boolean(value) && !Number.isNaN(Date.parse(value));
}

export function normalizeSubjectContext(
  input = {},
  options = {},
) {
  const subject = input.subject ?? input;
  const matterId = cleanText(subject.matterId);
  const themeId = cleanText(subject.themeId);
  const subjectId = cleanText(subject.subjectId);
  const matterName = cleanText(
    subject.matterName || subject.subjectArea,
  );
  const themeName = cleanText(subject.themeName);
  const subjectName = cleanText(subject.subjectName);
  const contractVersion = cleanText(input.contractVersion);
  const sentAt = cleanText(input.sentAt);
  const sourceApp = cleanText(input.sourceApp);
  const returnUrl = cleanText(input.returnUrl);
  const supportedVersions = new Set(
    options.supportedContractVersions ?? ["1.0.0"],
  );
  const errors = [];

  for (const [field, value] of [
    ["matterId", matterId],
    ["themeId", themeId],
    ["subjectId", subjectId],
  ]) {
    if (!ID_PATTERN.test(value)) {
      errors.push(`${field} inválido ou ausente.`);
    }
  }

  for (const [field, value] of [
    ["matterName", matterName],
    ["themeName", themeName],
    ["subjectName", subjectName],
  ]) {
    if (!value) {
      errors.push(`${field} ausente.`);
    }
  }

  if (!supportedVersions.has(contractVersion)) {
    errors.push(
      `contractVersion incompatível: ${contractVersion || "ausente"}.`,
    );
  }

  if (!validIsoDateTime(sentAt)) {
    errors.push("sentAt inválido ou ausente.");
  }

  if (sourceApp !== "concept_compass") {
    errors.push("sourceApp deve ser concept_compass.");
  }

  return Object.freeze({
    valid: errors.length === 0,
    contractVersion,
    sentAt,
    sourceApp,
    matterId,
    matterName,
    themeId,
    themeName,
    subjectId,
    subjectName,
    sourceArchived: normalizeBoolean(input.sourceArchived),
    returnUrl,
    navigationContext:
      input.navigationContext && typeof input.navigationContext === "object"
        ? structuredClone(input.navigationContext)
        : null,
    nonce: cleanText(input.nonce) || null,
    errors: Object.freeze(errors),
    source: cleanText(input.source) || "unknown",
  });
}

export function createMissingSubjectContext(
  reason = "Contexto não informado.",
  details = {},
) {
  return Object.freeze({
    valid: false,
    contractVersion: cleanText(details.contractVersion),
    sentAt: "",
    sourceApp: "",
    matterId: "",
    matterName: "",
    themeId: "",
    themeName: "",
    subjectId: "",
    subjectName: "",
    sourceArchived: false,
    returnUrl: "",
    navigationContext: null,
    nonce: null,
    errors: Object.freeze([reason]),
    source: cleanText(details.source) || "missing",
  });
}

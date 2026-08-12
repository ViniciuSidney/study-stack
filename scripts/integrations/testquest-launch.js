const LEGACY_LIST_SEQUENCE_PATTERN = /—\s*Lista\s+(\d+)\s*$/iu;

function normalizePositiveInteger(value) {
  const number = typeof value === "string" && value.trim()
    ? Number(value)
    : value;

  return Number.isInteger(number) && number > 0 ? number : null;
}

function unwrapSession(candidate) {
  return candidate?.session ?? candidate ?? null;
}

function getTestQuestTitleSequence(candidate) {
  const session = unwrapSession(candidate);

  if (!session) return null;

  const title = String(session.sessionTitle ?? "").trim();
  const match = title.match(LEGACY_LIST_SEQUENCE_PATTERN);

  return match ? normalizePositiveInteger(match[1]) : null;
}

export function getTestQuestListSequence(candidate) {
  const session = unwrapSession(candidate);

  if (!session) return null;

  const structuredSequence = normalizePositiveInteger(
    session.sourceListSequence ?? session.originalSnapshot?.session?.sequence,
  );

  if (structuredSequence) return structuredSequence;

  return getTestQuestTitleSequence(session);
}

export function getNextTestQuestListSequence(candidates, subjectId) {
  const normalizedSubjectId = String(subjectId ?? "").trim();
  const sessions = (Array.isArray(candidates) ? candidates : [])
    .map(unwrapSession)
    .filter(
      (session) =>
        session &&
        (!normalizedSubjectId || session.subjectId === normalizedSubjectId),
    );
  const sequences = sessions.flatMap((session) => {
    const structuredSequence = normalizePositiveInteger(
      session.sourceListSequence ?? session.originalSnapshot?.session?.sequence,
    );
    const titleSequence = getTestQuestTitleSequence(session);

    return [structuredSequence, titleSequence].filter(
      (sequence) => sequence !== null,
    );
  });

  return sequences.length ? Math.max(...sequences) + 1 : 1;
}

export function buildTestQuestLaunchContext({
  subject,
  sessions = [],
  sentAt,
  returnUrl,
  contractVersion = "1.0.0",
}) {
  if (!subject?.id) {
    throw new TypeError("O contexto do Test Quest exige um assunto ativo.");
  }

  const suggestedListSequence = getNextTestQuestListSequence(
    sessions,
    subject.id,
  );

  return Object.freeze({
    contractVersion,
    sentAt,
    sourceApp: "study_stack",
    entryPoint: "import",
    matterId: subject.matterId,
    matterName: subject.matterName,
    themeId: subject.themeId,
    themeName: subject.themeName,
    subjectId: subject.id,
    subjectName: subject.subjectName,
    suggestedListName: `${subject.subjectName} — Lista ${suggestedListSequence}`,
    suggestedListSequence,
    returnUrl,
  });
}

export function createTestQuestLaunchUrl(baseUrl, context) {
  const url = new URL(baseUrl);

  Object.entries(context).forEach(([field, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(field, String(value));
    }
  });

  return url;
}

import {
  createOptionalRichContent,
  createRichContent,
  createRichContentFromHtml,
  validateRichContent,
} from "./rich-content.js";

export const TEST_QUEST_CONTRACT_VERSIONS = Object.freeze(["1.0.0", "1.1.0"]);
export const IMPORT_STATUSES = Object.freeze([
  "valid",
  "needs_review",
  "pending_link",
  "reimported",
]);
export const QUESTION_TYPES = Object.freeze([
  "objective",
  "true_false",
  "discursive",
  "other",
]);
export const QUESTION_DIFFICULTIES = Object.freeze([
  "easy",
  "medium",
  "hard",
  "unknown",
]);
export const QUESTION_RESULTS = Object.freeze([
  "correct",
  "partial",
  "incorrect",
  "unanswered",
]);

const IMPORT_STATUS_SET = new Set(IMPORT_STATUSES);
const QUESTION_TYPE_SET = new Set(QUESTION_TYPES);
const DIFFICULTY_SET = new Set(QUESTION_DIFFICULTIES);
const RESULT_SET = new Set(QUESTION_RESULTS);

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeEnum(value, allowed, fallback) {
  const normalized = normalizeString(value).toLocaleLowerCase("en-US");
  return allowed.has(normalized) ? normalized : fallback;
}

function normalizeOptionalPositiveInteger(value, fieldName) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${fieldName} deve ser um inteiro positivo.`);
  }

  return value;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeDateTime(value, fieldName) {
  const normalized = normalizeString(value);

  if (!normalized || Number.isNaN(Date.parse(normalized))) {
    throw new TypeError(`${fieldName} deve conter uma data válida.`);
  }

  return new Date(normalized).toISOString();
}

function toRichContent(value, now, { optional = false } = {}) {
  if (optional && (value === null || value === undefined || value === "")) {
    return null;
  }

  if (isPlainObject(value) && Object.hasOwn(value, "content")) {
    const result = createRichContentFromHtml(value, now);
    return optional && !result.plainText ? null : result;
  }

  if (optional) {
    return createOptionalRichContent(String(value ?? ""), now);
  }

  return createRichContent(String(value ?? ""), now);
}

function normalizeQuestionType(value) {
  const aliases = {
    objetiva: "objective",
    objective: "objective",
    multipla_escolha: "objective",
    multiple_choice: "objective",
    verdadeiro_falso: "true_false",
    true_false: "true_false",
    vf: "true_false",
    discursiva: "discursive",
    discursive: "discursive",
  };
  const normalized = normalizeString(value).toLocaleLowerCase("pt-BR");
  return normalizeEnum(aliases[normalized] ?? normalized, QUESTION_TYPE_SET, "other");
}

function normalizeDifficulty(value) {
  const aliases = {
    facil: "easy",
    fácil: "easy",
    easy: "easy",
    medio: "medium",
    médio: "medium",
    medium: "medium",
    dificil: "hard",
    difícil: "hard",
    hard: "hard",
  };
  const normalized = normalizeString(value).toLocaleLowerCase("pt-BR");
  return normalizeEnum(aliases[normalized] ?? normalized, DIFFICULTY_SET, "unknown");
}

function normalizeResult(value, userAnswer, contractVersion, questionNumber) {
  const aliases = {
    correto: "correct",
    correta: "correct",
    correct: "correct",
    acerto: "correct",
    parcial: "partial",
    partial: "partial",
    incorreto: "incorrect",
    incorreta: "incorrect",
    incorrect: "incorrect",
    erro: "incorrect",
    nao_respondida: "unanswered",
    não_respondida: "unanswered",
    unanswered: "unanswered",
    blank: "unanswered",
  };
  const normalized = normalizeString(value).toLocaleLowerCase("pt-BR");
  const result = aliases[normalized] ?? normalized;

  if (RESULT_SET.has(result)) {
    if (contractVersion === "1.0.0" && result === "partial") {
      throw new TypeError(
        `A questão ${questionNumber} usa resultado parcial, disponível apenas no contrato 1.1.0.`,
      );
    }
    return result;
  }

  if (contractVersion === "1.1.0") {
    throw new TypeError(`A questão ${questionNumber} possui result inválido.`);
  }

  return normalizeString(userAnswer) ? "incorrect" : "unanswered";
}

function normalizeScorePercentage(question, result, contractVersion, questionNumber) {
  const expectedByResult = {
    correct: 100,
    partial: 50,
    incorrect: 0,
    unanswered: null,
  };
  const expected = expectedByResult[result];

  if (contractVersion === "1.0.0") {
    return expected;
  }

  if (!Object.hasOwn(question, "scorePercentage")) {
    throw new TypeError(
      `A questão ${questionNumber} exige scorePercentage no contrato 1.1.0.`,
    );
  }

  const received = question.scorePercentage;
  if (received !== expected) {
    throw new TypeError(
      `A questão ${questionNumber} possui scorePercentage incompatível com result ${result}.`,
    );
  }

  return received;
}

function stableFingerprint(value) {
  const text = JSON.stringify(value);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function getQuestionField(question, ...keys) {
  for (const key of keys) {
    if (Object.hasOwn(question, key)) {
      return question[key];
    }
  }
  return null;
}

export function normalizeTestQuestPayload(payload, now) {
  if (!isPlainObject(payload)) {
    throw new TypeError("O resultado do Test Quest deve ser um objeto JSON.");
  }

  const contractVersion = normalizeString(payload.contractVersion);
  const sourceApp = normalizeString(payload.sourceApp);
  const sessionId = normalizeString(payload.sessionId ?? payload.session?.id);
  const subjectContext = payload.subjectContext ?? payload.subject ?? {};
  const subjectId = normalizeString(
    subjectContext.subjectId ?? subjectContext.id ?? payload.subjectId,
  );
  const session = payload.session ?? {};
  const questions = Array.isArray(payload.questions) ? payload.questions : [];

  if (!TEST_QUEST_CONTRACT_VERSIONS.includes(contractVersion)) {
    throw new TypeError(
      `Versão de contrato do Test Quest incompatível: ${contractVersion || "ausente"}.`,
    );
  }

  if (sourceApp !== "test_quest") {
    throw new TypeError("sourceApp deve ser test_quest.");
  }

  if (!sessionId) {
    throw new TypeError("O resultado exige sessionId.");
  }

  if (!subjectId) {
    throw new TypeError("O resultado exige subjectContext.subjectId.");
  }

  if (!questions.length) {
    throw new TypeError("O resultado deve conter ao menos uma questão.");
  }

  const sentAt = normalizeDateTime(payload.sentAt ?? now, "sentAt");
  const sessionDate = normalizeDateTime(
    session.date ?? session.sessionDate ?? session.completedAt ?? sentAt,
    "session.date",
  );
  const sessionTitle =
    normalizeString(session.title ?? session.name ?? payload.title) ||
    `Lista de exercícios de ${sessionDate.slice(0, 10)}`;
  const sourceListSequence = normalizeOptionalPositiveInteger(
    session.sequence,
    "session.sequence",
  );

  const normalizedQuestions = questions.map((question, index) => {
    if (!isPlainObject(question)) {
      throw new TypeError(`A questão ${index + 1} é inválida.`);
    }

    const statementValue = getQuestionField(
      question,
      "statement",
      "prompt",
      "question",
      "front",
    );
    const userAnswerValue = getQuestionField(
      question,
      "userAnswer",
      "answer",
      "selectedAnswer",
    );
    const correctAnswerValue = getQuestionField(
      question,
      "correctAnswer",
      "expectedAnswer",
      "answerKey",
    );
    const result = normalizeResult(
      getQuestionField(question, "result", "status", "outcome"),
      userAnswerValue,
      contractVersion,
      index + 1,
    );
    const scorePercentage = normalizeScorePercentage(
      question,
      result,
      contractVersion,
      index + 1,
    );
    const statement = toRichContent(statementValue, now);

    if (!statement.plainText) {
      throw new TypeError(`A questão ${index + 1} não possui enunciado.`);
    }

    return {
      sourceQuestionId:
        normalizeString(question.id ?? question.questionId) || null,
      order: index + 1,
      questionType: normalizeQuestionType(
        question.questionType ?? question.type,
      ),
      difficulty: normalizeDifficulty(question.difficulty),
      statement,
      userAnswer: toRichContent(userAnswerValue, now, { optional: true }),
      correctAnswer: toRichContent(correctAnswerValue, now, { optional: true }),
      correction: toRichContent(
        getQuestionField(question, "correction", "explanation", "feedback"),
        now,
        { optional: true },
      ),
      expectedCriteria: toRichContent(
        getQuestionField(question, "expectedCriteria", "criteria"),
        now,
        { optional: true },
      ),
      metacognition: toRichContent(question.metacognition, now, {
        optional: true,
      }),
      result,
      scorePercentage,
      originalSnapshot: structuredClone(question),
    };
  });

  const stats = calculateSessionStats(normalizedQuestions);
  const canonicalForFingerprint = {
    contractVersion,
    sourceApp,
    sessionId,
    subjectId,
    sessionTitle,
    ...(sourceListSequence ? { sourceListSequence } : {}),
    sessionDate,
    questions: normalizedQuestions.map((question) => ({
      sourceQuestionId: question.sourceQuestionId,
      order: question.order,
      statement: question.statement.plainText,
      userAnswer: question.userAnswer?.plainText ?? null,
      correctAnswer: question.correctAnswer?.plainText ?? null,
      result: question.result,
      ...(contractVersion === "1.1.0"
        ? { scorePercentage: question.scorePercentage }
        : {}),
    })),
  };

  return {
    contractVersion,
    sentAt,
    sourceApp,
    sessionId,
    subjectId,
    subjectContext: structuredClone(subjectContext),
    sessionTitle,
    sourceListSequence,
    sessionDate,
    sourceUrl: normalizeString(payload.resultUrl ?? session.resultUrl) || null,
    questions: normalizedQuestions,
    stats,
    payloadFingerprint:
      normalizeString(payload.payloadFingerprint) ||
      stableFingerprint(canonicalForFingerprint),
    originalSnapshot: structuredClone(payload),
  };
}

export function calculateSessionStats(questions) {
  const normalized = Array.isArray(questions) ? questions : [];
  const total = normalized.length;
  const correct = normalized.filter((question) => question.result === "correct").length;
  const partial = normalized.filter((question) => question.result === "partial").length;
  const incorrect = normalized.filter(
    (question) => question.result === "incorrect",
  ).length;
  const unanswered = normalized.filter(
    (question) => question.result === "unanswered",
  ).length;
  const answered = correct + partial + incorrect;
  const difficultyBreakdown = {
    easy: normalized.filter((question) => question.difficulty === "easy").length,
    medium: normalized.filter((question) => question.difficulty === "medium").length,
    hard: normalized.filter((question) => question.difficulty === "hard").length,
    unknown: normalized.filter((question) => question.difficulty === "unknown").length,
  };

  return {
    total,
    answered,
    correct,
    partial,
    incorrect,
    unanswered,
    percentage: total ? Math.round(((correct + partial * 0.5) / total) * 100) : 0,
    validForPractice: answered >= 15,
    difficultyBreakdown,
  };
}

export function createImportedSession({
  id,
  recordId,
  normalizedPayload,
  questionIds,
  importedAt,
}) {
  const session = {
    id: normalizeString(id),
    recordId: normalizeString(recordId),
    subjectId: normalizedPayload.subjectId,
    sourceSessionId: normalizedPayload.sessionId,
    sourceApp: "test_quest",
    sourceContractVersion: normalizedPayload.contractVersion,
    sourceUrl: normalizedPayload.sourceUrl,
    sessionTitle: normalizedPayload.sessionTitle,
    sourceListSequence: normalizedPayload.sourceListSequence,
    sessionDate: normalizedPayload.sessionDate,
    importedAt,
    importStatus: "valid",
    questionIds: [...questionIds],
    stats: structuredClone(normalizedPayload.stats),
    originalSnapshot: structuredClone(normalizedPayload.originalSnapshot),
    payloadFingerprint: normalizedPayload.payloadFingerprint,
    reimportHistory: [],
    sessionNotes: null,
    entityVersion: 1,
  };

  const validation = validateImportedSession(session);
  if (!validation.valid) {
    throw new TypeError(validation.errors.join(" "));
  }
  return session;
}

export function createImportedQuestion({
  id,
  sessionId,
  subjectId,
  normalizedQuestion,
}) {
  const question = {
    id: normalizeString(id),
    sessionId: normalizeString(sessionId),
    subjectId: normalizeString(subjectId),
    sourceQuestionId: normalizedQuestion.sourceQuestionId,
    order: normalizedQuestion.order,
    questionType: normalizedQuestion.questionType,
    difficulty: normalizedQuestion.difficulty,
    statement: structuredClone(normalizedQuestion.statement),
    userAnswer: structuredClone(normalizedQuestion.userAnswer),
    correctAnswer: structuredClone(normalizedQuestion.correctAnswer),
    correction: structuredClone(normalizedQuestion.correction),
    expectedCriteria: structuredClone(normalizedQuestion.expectedCriteria),
    metacognition: structuredClone(normalizedQuestion.metacognition),
    result: normalizedQuestion.result,
    scorePercentage: normalizedQuestion.scorePercentage,
    questionNotes: null,
    originalSnapshot: structuredClone(normalizedQuestion.originalSnapshot),
    errorRecordIds: [],
    entityVersion: 1,
  };

  const validation = validateImportedQuestion(question);
  if (!validation.valid) {
    throw new TypeError(validation.errors.join(" "));
  }
  return question;
}

export function updateSessionNotes(session, value, now) {
  const next = structuredClone(session);
  next.sessionNotes = toRichContent(value, now, { optional: true });
  const validation = validateImportedSession(next);
  if (!validation.valid) {
    throw new TypeError(validation.errors.join(" "));
  }
  return next;
}

export function validateImportedSession(session) {
  const errors = [];

  if (!isPlainObject(session)) {
    return { valid: false, errors: ["ImportedSession deve ser um objeto."] };
  }

  for (const key of [
    "id",
    "recordId",
    "subjectId",
    "sourceSessionId",
    "sourceContractVersion",
    "sessionTitle",
    "payloadFingerprint",
  ]) {
    if (typeof session[key] !== "string" || !session[key].trim()) {
      errors.push(`${key} ausente.`);
    }
  }

  if (session.sourceApp !== "test_quest") {
    errors.push("sourceApp inválido.");
  }
  if (!TEST_QUEST_CONTRACT_VERSIONS.includes(session.sourceContractVersion)) {
    errors.push("sourceContractVersion incompatível.");
  }
  if (
    session.sourceListSequence !== undefined &&
    session.sourceListSequence !== null &&
    (!Number.isInteger(session.sourceListSequence) ||
      session.sourceListSequence <= 0)
  ) {
    errors.push("sourceListSequence inválido.");
  }
  if (!IMPORT_STATUS_SET.has(session.importStatus)) {
    errors.push("importStatus inválido.");
  }
  for (const key of ["sessionDate", "importedAt"]) {
    if (typeof session[key] !== "string" || Number.isNaN(Date.parse(session[key]))) {
      errors.push(`${key} inválido.`);
    }
  }
  if (!Array.isArray(session.questionIds)) {
    errors.push("questionIds deve ser um array.");
  } else if (new Set(session.questionIds).size !== session.questionIds.length) {
    errors.push("questionIds contém valores duplicados.");
  }
  if (!isPlainObject(session.stats)) {
    errors.push("stats inválido.");
  } else {
    for (const key of ["total", "answered", "correct", "incorrect", "unanswered"]) {
      if (!Number.isInteger(session.stats[key]) || session.stats[key] < 0) {
        errors.push(`stats.${key} inválido.`);
      }
    }
    const partial = session.stats.partial ?? 0;
    if (!Number.isInteger(partial) || partial < 0) {
      errors.push("stats.partial inválido.");
    }
    if (session.sourceContractVersion === "1.1.0" && !Object.hasOwn(session.stats, "partial")) {
      errors.push("stats.partial ausente para o contrato 1.1.0.");
    }
    if (
      !Number.isFinite(session.stats.percentage) ||
      session.stats.percentage < 0 ||
      session.stats.percentage > 100
    ) {
      errors.push("stats.percentage inválido.");
    }
    if (typeof session.stats.validForPractice !== "boolean") {
      errors.push("stats.validForPractice inválido.");
    }
    if (
      Number.isInteger(session.stats.total) &&
      Array.isArray(session.questionIds) &&
      session.stats.total !== session.questionIds.length
    ) {
      errors.push("stats.total diverge de questionIds.");
    }
    if (
      Number.isInteger(session.stats.correct) &&
      Number.isInteger(partial) &&
      Number.isInteger(session.stats.incorrect) &&
      Number.isInteger(session.stats.unanswered) &&
      Number.isInteger(session.stats.total) &&
      session.stats.correct + partial + session.stats.incorrect + session.stats.unanswered !==
        session.stats.total
    ) {
      errors.push("As contagens de resultado divergem de stats.total.");
    }
    if (
      Number.isInteger(session.stats.correct) &&
      Number.isInteger(partial) &&
      Number.isInteger(session.stats.incorrect) &&
      Number.isInteger(session.stats.answered) &&
      session.stats.correct + partial + session.stats.incorrect !== session.stats.answered
    ) {
      errors.push("stats.answered diverge de acertos, parciais e erros.");
    }
    if (
      Number.isInteger(session.stats.total) &&
      Number.isInteger(session.stats.correct) &&
      Number.isInteger(partial) &&
      Number.isFinite(session.stats.percentage)
    ) {
      const expectedPercentage = session.stats.total
        ? Math.round(
            ((session.stats.correct + partial * 0.5) / session.stats.total) * 100,
          )
        : 0;
      if (session.stats.percentage !== expectedPercentage) {
        errors.push("stats.percentage diverge da pontuação ponderada.");
      }
    }
    if (
      typeof session.stats.validForPractice === "boolean" &&
      Number.isInteger(session.stats.answered) &&
      session.stats.validForPractice !== (session.stats.answered >= 15)
    ) {
      errors.push("stats.validForPractice diverge da regra de 15 respostas.");
    }
  }
  if (!isPlainObject(session.originalSnapshot)) {
    errors.push("originalSnapshot inválido.");
  }
  if (!Array.isArray(session.reimportHistory)) {
    errors.push("reimportHistory deve ser um array.");
  }
  const notesValidation = validateRichContent(session.sessionNotes, { optional: true });
  errors.push(...notesValidation.errors.map((error) => `sessionNotes: ${error}`));
  if (!Number.isInteger(session.entityVersion) || session.entityVersion < 1) {
    errors.push("entityVersion inválido.");
  }

  return { valid: errors.length === 0, errors };
}

export function validateImportedQuestion(question) {
  const errors = [];

  if (!isPlainObject(question)) {
    return { valid: false, errors: ["ImportedQuestion deve ser um objeto."] };
  }
  for (const key of ["id", "sessionId", "subjectId"]) {
    if (typeof question[key] !== "string" || !question[key].trim()) {
      errors.push(`${key} ausente.`);
    }
  }
  if (!Number.isInteger(question.order) || question.order < 1) {
    errors.push("order inválido.");
  }
  if (!QUESTION_TYPE_SET.has(question.questionType)) {
    errors.push("questionType inválido.");
  }
  if (!DIFFICULTY_SET.has(question.difficulty)) {
    errors.push("difficulty inválida.");
  }
  if (!RESULT_SET.has(question.result)) {
    errors.push("result inválido.");
  }
  const expectedScoreByResult = {
    correct: 100,
    partial: 50,
    incorrect: 0,
    unanswered: null,
  };
  if (Object.hasOwn(question, "scorePercentage")) {
    if (question.scorePercentage !== expectedScoreByResult[question.result]) {
      errors.push("scorePercentage incompatível com result.");
    }
  } else if (question.result === "partial") {
    errors.push("scorePercentage ausente para resultado parcial.");
  }
  const requiredContent = validateRichContent(question.statement);
  errors.push(...requiredContent.errors.map((error) => `statement: ${error}`));
  for (const field of [
    "userAnswer",
    "correctAnswer",
    "correction",
    "expectedCriteria",
    "metacognition",
    "questionNotes",
  ]) {
    const validation = validateRichContent(question[field], { optional: true });
    errors.push(...validation.errors.map((error) => `${field}: ${error}`));
  }
  if (!isPlainObject(question.originalSnapshot)) {
    errors.push("originalSnapshot inválido.");
  }
  if (!Array.isArray(question.errorRecordIds)) {
    errors.push("errorRecordIds deve ser um array.");
  }
  if (!Number.isInteger(question.entityVersion) || question.entityVersion < 1) {
    errors.push("entityVersion inválido.");
  }

  return { valid: errors.length === 0, errors };
}

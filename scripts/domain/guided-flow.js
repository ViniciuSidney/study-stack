import {
  createRichContent,
  getRichContentPlainText,
  validateRichContent,
} from "./rich-content.js";

export const GUIDED_FLOW_VERSION = "1.0.0";

export const GUIDED_FLOW_STAGES = Object.freeze([
  "base",
  "practice",
  "errorAnalysis",
  "review",
  "consolidation",
]);

export const GUIDED_FLOW_STAGE_DEFINITIONS = Object.freeze({
  base: Object.freeze({
    label: "Construir a base",
    shortLabel: "Base",
    categoryKey: "base",
    description: "Crie um Resumo consistente e marque-o como estudado.",
  }),
  practice: Object.freeze({
    label: "Praticar",
    shortLabel: "Prática",
    categoryKey: "practice",
    description: "Resolva e importe listas válidas do Test Quest.",
  }),
  errorAnalysis: Object.freeze({
    label: "Entender os erros",
    shortLabel: "Análise",
    categoryKey: "errorAnalysis",
    description:
      "Analise erros reais ou verifique acertos difíceis quando não houver erros suficientes.",
  }),
  review: Object.freeze({
    label: "Revisar e comprovar",
    shortLabel: "Revisão",
    categoryKey: "review",
    description:
      "Revisite as análises e registre uma nova evidência de compreensão.",
  }),
  consolidation: Object.freeze({
    label: "Consolidar",
    shortLabel: "Consolidação",
    categoryKey: "consolidation",
    description:
      "Confirme conscientemente a consolidação após conquistar os nove pontos anteriores.",
  }),
});

export const METACOGNITIVE_REASON_OPTIONS = Object.freeze([
  Object.freeze({ value: "difficult", label: "Questão difícil" }),
  Object.freeze({ value: "slow", label: "Demorei para responder" }),
  Object.freeze({ value: "uncertain", label: "Respondi com insegurança" }),
  Object.freeze({ value: "elimination", label: "Acertei por eliminação ou acaso" }),
]);

const STAGE_SET = new Set(GUIDED_FLOW_STAGES);
const REASON_SET = new Set(
  METACOGNITIVE_REASON_OPTIONS.map((option) => option.value),
);
const REVIEW_STATUS_SET = new Set(["pending", "reviewed", "confirmed"]);

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeStringArray(value, allowed = null) {
  const unique = new Set();
  for (const entry of Array.isArray(value) ? value : []) {
    const normalized = normalizeString(entry);
    if (normalized && (!allowed || allowed.has(normalized))) {
      unique.add(normalized);
    }
  }
  return [...unique];
}

function isIsoDateTime(value) {
  return (
    typeof value === "string" &&
    value.length >= 20 &&
    !Number.isNaN(Date.parse(value))
  );
}

export function createDefaultGuidedFlow(now) {
  return {
    version: GUIDED_FLOW_VERSION,
    currentStage: "base",
    notifiedCompletionKeys: [],
    metacognitiveChecks: [],
    lastStageChangedAt: null,
    updatedAt: now,
  };
}

export function normalizeGuidedFlow(value, subjectId, now) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { guidedFlow: createDefaultGuidedFlow(now), changed: true };
  }

  const next = structuredClone(value);
  let changed = false;

  if (next.version !== GUIDED_FLOW_VERSION) {
    next.version = GUIDED_FLOW_VERSION;
    changed = true;
  }
  if (!STAGE_SET.has(next.currentStage)) {
    next.currentStage = "base";
    changed = true;
  }

  const notified = normalizeStringArray(next.notifiedCompletionKeys);
  if (JSON.stringify(notified) !== JSON.stringify(next.notifiedCompletionKeys ?? [])) {
    next.notifiedCompletionKeys = notified;
    changed = true;
  }

  const checks = Array.isArray(next.metacognitiveChecks)
    ? next.metacognitiveChecks.map((check) => ({
        ...check,
        subjectId: normalizeString(check?.subjectId) || subjectId,
        reasonTags: normalizeStringArray(check?.reasonTags, REASON_SET),
      }))
    : [];
  if (JSON.stringify(checks) !== JSON.stringify(next.metacognitiveChecks ?? [])) {
    next.metacognitiveChecks = checks;
    changed = true;
  }

  if (
    next.lastStageChangedAt !== null &&
    !isIsoDateTime(next.lastStageChangedAt)
  ) {
    next.lastStageChangedAt = null;
    changed = true;
  }
  if (!isIsoDateTime(next.updatedAt)) {
    next.updatedAt = now;
    changed = true;
  }

  return { guidedFlow: next, changed };
}

export function isMetacognitiveCheckComplete(check) {
  return Boolean(
    check?.analysis?.isComplete &&
      getRichContentPlainText(check.analysis.whyDemanding) &&
      getRichContentPlainText(check.analysis.correctReasoning) &&
      getRichContentPlainText(check.analysis.howToRecognize),
  );
}

export function createMetacognitiveCheck({
  id,
  subjectId,
  questionId,
  sessionId,
  reasonTags,
  whyDemanding,
  correctReasoning,
  howToRecognize,
  now,
}) {
  const normalizedReasons = normalizeStringArray(reasonTags, REASON_SET);
  if (!normalizedReasons.length) {
    throw new TypeError("Selecione ao menos um motivo para a verificação.");
  }

  const analysis = {
    whyDemanding: createRichContent(whyDemanding, now),
    correctReasoning: createRichContent(correctReasoning, now),
    howToRecognize: createRichContent(howToRecognize, now),
    isComplete: false,
    completedAt: null,
  };
  analysis.isComplete = Boolean(
    getRichContentPlainText(analysis.whyDemanding) &&
      getRichContentPlainText(analysis.correctReasoning) &&
      getRichContentPlainText(analysis.howToRecognize),
  );

  if (!analysis.isComplete) {
    throw new TypeError(
      "Explique a dificuldade, o raciocínio correto e como reconhecer o padrão.",
    );
  }
  analysis.completedAt = now;

  const check = {
    id: normalizeString(id),
    subjectId: normalizeString(subjectId),
    questionId: normalizeString(questionId),
    sessionId: normalizeString(sessionId),
    reasonTags: normalizedReasons,
    analysis,
    review: {
      status: "pending",
      reviewedAt: null,
      confirmationQuestionId: null,
      confirmedAt: null,
    },
    createdAt: now,
    updatedAt: now,
    entityVersion: 1,
  };

  const validation = validateMetacognitiveCheck(check, subjectId);
  if (!validation.valid) {
    throw new TypeError(validation.errors.join(" "));
  }
  return check;
}

export function markMetacognitiveCheckReviewed(check, now) {
  if (!isMetacognitiveCheckComplete(check)) {
    throw new TypeError("Conclua a análise antes de registrar a revisão.");
  }

  const next = structuredClone(check);
  next.review.status = "reviewed";
  next.review.reviewedAt = now;
  next.review.confirmationQuestionId = null;
  next.review.confirmedAt = null;
  next.updatedAt = now;
  return next;
}

export function confirmMetacognitiveCheck(
  check,
  confirmationQuestionId,
  now,
) {
  if (!isMetacognitiveCheckComplete(check)) {
    throw new TypeError("Conclua a análise antes de registrar a confirmação.");
  }
  if (!check.review?.reviewedAt) {
    throw new TypeError("Revise a verificação antes de registrar a confirmação.");
  }

  const normalizedQuestionId = normalizeString(confirmationQuestionId);
  if (!normalizedQuestionId || normalizedQuestionId === check.questionId) {
    throw new TypeError(
      "A confirmação deve usar outra questão correta do mesmo assunto.",
    );
  }

  const next = structuredClone(check);
  next.review.status = "confirmed";
  next.review.confirmationQuestionId = normalizedQuestionId;
  next.review.confirmedAt = now;
  next.updatedAt = now;
  return next;
}

export function validateMetacognitiveCheck(check, subjectId = null) {
  const errors = [];
  if (!check || typeof check !== "object" || Array.isArray(check)) {
    return { valid: false, errors: ["Verificação metacognitiva inválida."] };
  }

  for (const key of ["id", "subjectId", "questionId", "sessionId"]) {
    if (typeof check[key] !== "string" || !check[key].trim()) {
      errors.push(`${key} ausente na verificação metacognitiva.`);
    }
  }
  if (subjectId && check.subjectId !== subjectId) {
    errors.push("A verificação metacognitiva pertence a outro assunto.");
  }
  if (!Array.isArray(check.reasonTags) || !check.reasonTags.length) {
    errors.push("reasonTags deve possuir ao menos um motivo.");
  } else if (check.reasonTags.some((tag) => !REASON_SET.has(tag))) {
    errors.push("reasonTags contém um motivo desconhecido.");
  }

  if (!check.analysis || typeof check.analysis !== "object") {
    errors.push("analysis ausente na verificação metacognitiva.");
  } else {
    for (const field of ["whyDemanding", "correctReasoning", "howToRecognize"]) {
      const validation = validateRichContent(check.analysis[field]);
      errors.push(
        ...validation.errors.map((error) => `analysis.${field}: ${error}`),
      );
    }
    if (typeof check.analysis.isComplete !== "boolean") {
      errors.push("analysis.isComplete inválido.");
    }
    if (
      check.analysis.completedAt !== null &&
      !isIsoDateTime(check.analysis.completedAt)
    ) {
      errors.push("analysis.completedAt inválido.");
    }
  }

  if (!check.review || typeof check.review !== "object") {
    errors.push("review ausente na verificação metacognitiva.");
  } else {
    if (!REVIEW_STATUS_SET.has(check.review.status)) {
      errors.push("review.status inválido.");
    }
    for (const field of ["reviewedAt", "confirmedAt"]) {
      if (check.review[field] !== null && !isIsoDateTime(check.review[field])) {
        errors.push(`review.${field} inválido.`);
      }
    }
    if (
      check.review.confirmationQuestionId !== null &&
      (typeof check.review.confirmationQuestionId !== "string" ||
        !check.review.confirmationQuestionId.trim())
    ) {
      errors.push("review.confirmationQuestionId inválido.");
    }
    if (check.review.status === "confirmed") {
      if (!check.review.reviewedAt || !check.review.confirmedAt) {
        errors.push("Uma verificação confirmada exige revisão e confirmação.");
      }
      if (
        !check.review.confirmationQuestionId ||
        check.review.confirmationQuestionId === check.questionId
      ) {
        errors.push("A confirmação deve referenciar outra questão.");
      }
    }
  }

  for (const field of ["createdAt", "updatedAt"]) {
    if (!isIsoDateTime(check[field])) {
      errors.push(`${field} inválido na verificação metacognitiva.`);
    }
  }
  if (!Number.isInteger(check.entityVersion) || check.entityVersion < 1) {
    errors.push("entityVersion inválido na verificação metacognitiva.");
  }

  return { valid: errors.length === 0, errors };
}

export function validateGuidedFlow(guidedFlow, subjectId) {
  const errors = [];
  if (!guidedFlow || typeof guidedFlow !== "object" || Array.isArray(guidedFlow)) {
    return { valid: false, errors: ["guidedFlow deve ser um objeto."] };
  }
  if (guidedFlow.version !== GUIDED_FLOW_VERSION) {
    errors.push("guidedFlow.version inválido.");
  }
  if (!STAGE_SET.has(guidedFlow.currentStage)) {
    errors.push("guidedFlow.currentStage inválido.");
  }
  if (!Array.isArray(guidedFlow.notifiedCompletionKeys)) {
    errors.push("guidedFlow.notifiedCompletionKeys inválido.");
  }
  if (!Array.isArray(guidedFlow.metacognitiveChecks)) {
    errors.push("guidedFlow.metacognitiveChecks inválido.");
  } else {
    const ids = new Set();
    const questionIds = new Set();
    for (const check of guidedFlow.metacognitiveChecks) {
      const validation = validateMetacognitiveCheck(check, subjectId);
      errors.push(...validation.errors);
      if (ids.has(check.id)) {
        errors.push(`Verificação metacognitiva duplicada: ${check.id}.`);
      }
      ids.add(check.id);
      if (questionIds.has(check.questionId)) {
        errors.push(
          `Mais de uma verificação usa a questão ${check.questionId}.`,
        );
      }
      questionIds.add(check.questionId);
    }
  }
  if (
    guidedFlow.lastStageChangedAt !== null &&
    !isIsoDateTime(guidedFlow.lastStageChangedAt)
  ) {
    errors.push("guidedFlow.lastStageChangedAt inválido.");
  }
  if (!isIsoDateTime(guidedFlow.updatedAt)) {
    errors.push("guidedFlow.updatedAt inválido.");
  }
  return { valid: errors.length === 0, errors };
}

export function getGuidedFlowStageIndex(stage) {
  return GUIDED_FLOW_STAGES.indexOf(stage);
}

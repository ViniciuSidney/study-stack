export const CONCEPT_COMPASS_SUMMARY_CONFIG = Object.freeze({
  contractVersion: "1.0.0",
  sourceApp: "study_stack",
  stateKey: "study-stack:v1:state",
  summaryKey: "study-stack:integration:progress:v1",
  storageEventName: "study-stack:storage-change",
});

const STAGES = Object.freeze([
  Object.freeze({
    key: "base",
    contractKey: "base",
    label: "Base",
    categoryKey: "base",
    cap: 2,
  }),
  Object.freeze({
    key: "practice",
    contractKey: "practice",
    label: "Prática",
    categoryKey: "practice",
    cap: 3,
  }),
  Object.freeze({
    key: "errorAnalysis",
    contractKey: "analysis",
    label: "Análise",
    categoryKey: "errorAnalysis",
    cap: 2,
  }),
  Object.freeze({
    key: "review",
    contractKey: "review",
    label: "Revisão",
    categoryKey: "review",
    cap: 2,
  }),
  Object.freeze({
    key: "consolidation",
    contractKey: "consolidation",
    label: "Consolidação",
    categoryKey: "consolidation",
    cap: 1,
  }),
]);

const STAGE_KEYS = new Set(STAGES.map((stage) => stage.key));
const STATUS_VALUES = new Set([
  "not_started",
  "in_progress",
  "consolidated",
  "archived",
]);

function values(collection) {
  return Object.values(collection ?? {});
}

function toFiniteInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : fallback;
}

function normalizedCategory(progress, stage) {
  const source = progress?.categories?.[stage.categoryKey];
  const maximum = toFiniteInteger(source?.cap, stage.cap) || stage.cap;
  const current = Math.min(toFiniteInteger(source?.activePoints), maximum);
  return Object.freeze({ current, maximum });
}

function normalizeStageKey(stage) {
  return STAGE_KEYS.has(stage) ? stage : "base";
}

function contractStageKey(stage) {
  return (
    STAGES.find((definition) => definition.key === normalizeStageKey(stage))
      ?.contractKey ?? "base"
  );
}

function firstIncompleteStage(stageProgress) {
  return (
    STAGES.find((stage) => {
      const progress = stageProgress[stage.contractKey];
      return progress.current < progress.maximum;
    }) ?? STAGES.at(-1)
  );
}

function prerequisitePoints(stageProgress) {
  return ["base", "practice", "analysis", "review"].reduce(
    (total, key) => total + stageProgress[key].current,
    0,
  );
}

function noticeMessage(stage, progress, prerequisiteTotal) {
  if (progress.current >= progress.maximum) {
    return `${stage.label} concluída.`;
  }

  const missing = progress.maximum - progress.current;

  if (stage.key === "base") {
    return progress.current === 0
      ? "Concluir um Resumo com conteúdo."
      : "Marcar um Resumo concluído como estudado.";
  }
  if (stage.key === "practice") {
    return `Importar mais ${missing} lista(s) válida(s) do Test Quest.`;
  }
  if (stage.key === "errorAnalysis") {
    return `Concluir mais ${missing} análise(s) de erro ou verificação(ões) de acerto difícil.`;
  }
  if (stage.key === "review") {
    return progress.current === 0
      ? "Revisar uma análise para conquistar o primeiro ponto."
      : "Registrar uma confirmação posterior para conquistar o segundo ponto.";
  }
  return prerequisiteTotal >= 9
    ? "Confirmar conscientemente a consolidação final."
    : "Alcançar os nove pontos anteriores antes da consolidação.";
}

function buildNotices(subjectId, stageProgress, recommendedStage) {
  const prerequisiteTotal = prerequisitePoints(stageProgress);

  return STAGES.map((stage) => {
    const progress = stageProgress[stage.contractKey];
    const complete = progress.current >= progress.maximum;
    const id = `${subjectId}:${stage.contractKey}`;

    return Object.freeze({
      id,
      stage: stage.contractKey,
      type: complete
        ? "completed"
        : stage.contractKey === recommendedStage.contractKey
          ? "recommended"
          : "pending",
      message: noticeMessage(stage, progress, prerequisiteTotal),
    });
  });
}

function activeErrorsForSubject(state, subjectId) {
  const records = state.collections?.records ?? {};

  return values(state.collections?.errorRecords).filter((errorRecord) => {
    if (errorRecord?.subjectId !== subjectId) {
      return false;
    }
    return !records[errorRecord.recordId]?.archivedAt;
  });
}

function pendingCounts(state, subject) {
  const errors = activeErrorsForSubject(state, subject.id);
  const checks = Array.isArray(subject.guidedFlow?.metacognitiveChecks)
    ? subject.guidedFlow.metacognitiveChecks
    : [];

  const pendingErrors = errors.filter(
    (errorRecord) =>
      !errorRecord.analysis?.isComplete ||
      (toFiniteInteger(errorRecord.recurrenceCount) > 0 &&
        errorRecord.masteryStatus !== "overcome"),
  ).length;

  const pendingErrorReviews = errors.filter(
    (errorRecord) =>
      errorRecord.analysis?.isComplete && errorRecord.masteryStatus !== "overcome",
  ).length;
  const pendingCheckReviews = checks.filter(
    (check) =>
      check.analysis?.isComplete && check.review?.status !== "confirmed",
  ).length;

  return Object.freeze({
    pendingErrors,
    pendingReviews: pendingErrorReviews + pendingCheckReviews,
  });
}

function buildNextAction({ stageProgress, recommendedStage, counts, consolidated }) {
  const progress = stageProgress[recommendedStage.contractKey];

  if (recommendedStage.key === "base") {
    if (progress.current === 0) {
      return Object.freeze({
        type: "create_summary",
        label: "Criar Resumo",
        description: "Comece registrando a base teórica do assunto.",
      });
    }
    if (progress.current < progress.maximum) {
      return Object.freeze({
        type: "open_summaries",
        label: "Marcar Resumo como estudado",
        description: "Releia a base e confirme a marcação de estudo.",
      });
    }
  }

  if (recommendedStage.key === "practice") {
    return Object.freeze({
      type: progress.current < progress.maximum ? "open_test_quest" : "open_exercises",
      label:
        progress.current < progress.maximum ? "Abrir Test Quest" : "Consultar exercícios",
      description:
        progress.current < progress.maximum
          ? `Faltam ${progress.maximum - progress.current} lista(s) válida(s).`
          : "A prática necessária já foi registrada.",
    });
  }

  if (recommendedStage.key === "errorAnalysis") {
    return Object.freeze({
      type: counts.pendingErrors > 0 ? "open_errors" : "open_metacognitive",
      label:
        counts.pendingErrors > 0
          ? "Analisar Registros de Erro"
          : "Verificar acertos difíceis",
      description:
        counts.pendingErrors > 0
          ? `${counts.pendingErrors} análise(s) ainda estão pendentes.`
          : "Use acertos que exigiram esforço, insegurança ou eliminação.",
    });
  }

  if (recommendedStage.key === "review") {
    return Object.freeze({
      type: counts.pendingReviews > 0 ? "open_errors" : "open_metacognitive",
      label: counts.pendingReviews > 0 ? "Revisar pendências" : "Revisar verificações",
      description:
        counts.pendingReviews > 0
          ? `${counts.pendingReviews} revisão(ões) ainda estão pendentes.`
          : "Revise a análise e confirme-a com outra questão correta.",
    });
  }

  if (consolidated) {
    return Object.freeze({
      type: "open_stage_help",
      label: "Consultar consolidação",
      description: "O caminho de consolidação está completo.",
    });
  }

  return Object.freeze({
    type:
      prerequisitePoints(stageProgress) >= 9
        ? "confirm_consolidation"
        : "open_stage_help",
    label:
      prerequisitePoints(stageProgress) >= 9
        ? "Confirmar consolidação"
        : "Ver requisitos",
    description:
      prerequisitePoints(stageProgress) >= 9
        ? "Revise as evidências dos nove pontos e faça a confirmação final."
        : "Complete as etapas anteriores antes da confirmação final.",
  });
}

function safeTimestamp(...candidates) {
  return (
    candidates.find(
      (candidate) =>
        typeof candidate === "string" && !Number.isNaN(Date.parse(candidate)),
    ) ?? null
  );
}

function buildSubjectSummary(state, subject) {
  const progress = state.collections?.progressSnapshots?.[`progress-${subject.id}`] ?? null;
  const stageProgress = Object.fromEntries(
    STAGES.map((stage) => [stage.contractKey, normalizedCategory(progress, stage)]),
  );
  const recommendedStage = firstIncompleteStage(stageProgress);
  const currentTotal = Math.min(
    toFiniteInteger(progress?.currentTotal),
    toFiniteInteger(progress?.goalTotal, 10) || 10,
  );
  const maxProgress = toFiniteInteger(progress?.goalTotal, 10) || 10;
  const consolidated =
    currentTotal === maxProgress &&
    stageProgress.consolidation.current === stageProgress.consolidation.maximum;
  const counts = pendingCounts(state, subject);
  const status = subject.sourceArchived
    ? "archived"
    : consolidated
      ? "consolidated"
      : currentTotal > 0 || Boolean(subject.lastActivityAt)
        ? "in_progress"
        : "not_started";
  const notices = buildNotices(subject.id, stageProgress, recommendedStage);

  return Object.freeze({
    subjectId: subject.id,
    matterId: subject.matterId,
    themeId: subject.themeId,
    progress: currentTotal,
    maxProgress,
    status,
    sourceArchived: Boolean(subject.sourceArchived),
    currentStage: contractStageKey(subject.guidedFlow?.currentStage),
    recommendedStage: recommendedStage.contractKey,
    recommendedNoticeId: `${subject.id}:${recommendedStage.contractKey}`,
    notices,
    nextAction: buildNextAction({
      stageProgress,
      recommendedStage,
      counts,
      consolidated,
    }),
    stageProgress,
    pendingErrors: counts.pendingErrors,
    pendingReviews: counts.pendingReviews,
    lastActivityAt: safeTimestamp(
      subject.lastActivityAt,
      progress?.calculatedAt,
      subject.updatedAt,
    ),
    consolidated,
  });
}

function latestTimestamp(subjects, fallback) {
  const timestamps = values(subjects)
    .map((subject) => subject.lastActivityAt)
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));

  return safeTimestamp(timestamps[0], fallback) ?? new Date(0).toISOString();
}

export function buildConceptCompassSummary(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("O estado do Study Stack deve ser um objeto.");
  }
  if (!state.collections || typeof state.collections !== "object") {
    throw new TypeError("O estado do Study Stack não possui coleções válidas.");
  }

  const subjects = Object.fromEntries(
    values(state.collections.subjects)
      .filter((subject) => typeof subject?.id === "string" && subject.id.trim())
      .map((subject) => [subject.id, buildSubjectSummary(state, subject)]),
  );

  const summary = {
    contractVersion: CONCEPT_COMPASS_SUMMARY_CONFIG.contractVersion,
    updatedAt: latestTimestamp(subjects, state.updatedAt),
    sourceApp: CONCEPT_COMPASS_SUMMARY_CONFIG.sourceApp,
    subjects,
  };
  const validation = validateConceptCompassSummary(summary);

  if (!validation.valid) {
    throw new TypeError(validation.errors.join(" "));
  }

  return Object.freeze(summary);
}

export function validateConceptCompassSummary(summary) {
  const errors = [];

  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return { valid: false, errors: ["O resumo deve ser um objeto."] };
  }
  if (summary.contractVersion !== CONCEPT_COMPASS_SUMMARY_CONFIG.contractVersion) {
    errors.push("contractVersion incompatível.");
  }
  if (summary.sourceApp !== CONCEPT_COMPASS_SUMMARY_CONFIG.sourceApp) {
    errors.push("sourceApp inválido.");
  }
  if (
    typeof summary.updatedAt !== "string" ||
    Number.isNaN(Date.parse(summary.updatedAt))
  ) {
    errors.push("updatedAt inválido.");
  }
  if (!summary.subjects || typeof summary.subjects !== "object") {
    errors.push("subjects inválido.");
    return { valid: false, errors };
  }

  for (const [subjectId, subject] of Object.entries(summary.subjects)) {
    if (subject.subjectId !== subjectId) {
      errors.push(`subjects.${subjectId}.subjectId não corresponde à chave.`);
    }
    if (!STATUS_VALUES.has(subject.status)) {
      errors.push(`subjects.${subjectId}.status inválido.`);
    }
    if (
      !Number.isInteger(subject.progress) ||
      !Number.isInteger(subject.maxProgress) ||
      subject.progress < 0 ||
      subject.maxProgress <= 0 ||
      subject.progress > subject.maxProgress
    ) {
      errors.push(`subjects.${subjectId}.progress inválido.`);
    }
    if (!Array.isArray(subject.notices) || subject.notices.length !== STAGES.length) {
      errors.push(`subjects.${subjectId}.notices inválido.`);
    }
    if (
      !subject.notices?.some(
        (notice) => notice.id === subject.recommendedNoticeId,
      )
    ) {
      errors.push(`subjects.${subjectId}.recommendedNoticeId inválido.`);
    }
    for (const stage of STAGES) {
      const progress = subject.stageProgress?.[stage.contractKey];
      if (
        !progress ||
        !Number.isInteger(progress.current) ||
        !Number.isInteger(progress.maximum) ||
        progress.current < 0 ||
        progress.maximum <= 0 ||
        progress.current > progress.maximum
      ) {
        errors.push(
          `subjects.${subjectId}.stageProgress.${stage.contractKey} inválido.`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export class ConceptCompassSummaryPublisher {
  constructor({
    window,
    storage = window?.localStorage,
    config = CONCEPT_COMPASS_SUMMARY_CONFIG,
  }) {
    if (!window || !storage) {
      throw new TypeError("Window e localStorage são obrigatórios para a integração.");
    }

    this.window = window;
    this.storage = storage;
    this.config = config;
    this.installed = false;
    this.publishTimer = null;
    this.boundStorageChange = (event) => this.#handleStorageChange(event);
    this.boundFocus = () => this.schedule();
    this.boundVisibility = () => {
      if (this.window.document?.visibilityState !== "hidden") {
        this.schedule();
      }
    };
  }

  install() {
    if (this.installed) {
      return this;
    }

    this.window.addEventListener(this.config.storageEventName, this.boundStorageChange);
    this.window.addEventListener("storage", this.boundStorageChange);
    this.window.addEventListener("focus", this.boundFocus);
    this.window.document?.addEventListener(
      "visibilitychange",
      this.boundVisibility,
    );
    this.installed = true;
    return this;
  }

  destroy() {
    if (!this.installed) {
      return;
    }

    this.window.removeEventListener(
      this.config.storageEventName,
      this.boundStorageChange,
    );
    this.window.removeEventListener("storage", this.boundStorageChange);
    this.window.removeEventListener("focus", this.boundFocus);
    this.window.document?.removeEventListener(
      "visibilitychange",
      this.boundVisibility,
    );
    if (this.publishTimer !== null) {
      this.window.clearTimeout(this.publishTimer);
      this.publishTimer = null;
    }
    this.installed = false;
  }

  schedule() {
    if (this.publishTimer !== null) {
      return;
    }

    this.publishTimer = this.window.setTimeout(() => {
      this.publishTimer = null;
      this.publish();
    }, 0);
  }

  publish() {
    try {
      const rawState = this.storage.getItem(this.config.stateKey);
      if (rawState === null) {
        return Object.freeze({ status: "missing", summary: null });
      }

      const summary = buildConceptCompassSummary(JSON.parse(rawState));
      const serialized = JSON.stringify(summary);
      const current = this.storage.getItem(this.config.summaryKey);

      if (current === serialized) {
        return Object.freeze({ status: "unchanged", summary });
      }

      this.storage.setItem(this.config.summaryKey, serialized);
      return Object.freeze({ status: "published", summary });
    } catch (error) {
      console.error(
        "Não foi possível publicar o resumo para o Concept Compass.",
        error,
      );
      return Object.freeze({ status: "invalid", summary: null, error });
    }
  }

  #handleStorageChange(event) {
    const key = event?.detail?.key ?? event?.key ?? null;
    if (key === this.config.stateKey) {
      this.schedule();
    }
  }
}

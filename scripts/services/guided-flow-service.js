import {
  GUIDED_FLOW_STAGE_DEFINITIONS,
  GUIDED_FLOW_STAGES,
  confirmMetacognitiveCheck,
  createMetacognitiveCheck,
  getGuidedFlowStageIndex,
  markMetacognitiveCheckReviewed,
  normalizeGuidedFlow,
  validateGuidedFlow,
} from "../domain/guided-flow.js";
import { createOptionalRichContent, getRichContentPlainText } from "../domain/rich-content.js";
import { validateSubject } from "../domain/subject.js";
import { createId } from "../utils/id.js";

function values(collection) {
  return Object.values(collection ?? {});
}

function isActiveRecord(record) {
  return Boolean(record && !record.archivedAt);
}

function isValidPracticeSession(session) {
  return Boolean(
    session &&
      (session.stats?.validForPractice ?? Number(session.stats?.answered) >= 15),
  );
}

function stagePoints(progress, stage) {
  const key = GUIDED_FLOW_STAGE_DEFINITIONS[stage].categoryKey;
  return progress.categories[key];
}

function prerequisiteTotal(progress) {
  return ["base", "practice", "errorAnalysis", "review"].reduce(
    (total, key) => total + progress.categories[key].activePoints,
    0,
  );
}

function questionLabel(question) {
  const text = getRichContentPlainText(question?.statement);
  return text || `Questão ${question?.order ?? ""}`.trim();
}

function recordTitle(records, recordId, fallback) {
  return records[recordId]?.title || fallback;
}

export class GuidedFlowService {
  constructor({ repository, clock, appVersion, idGenerator = createId }) {
    this.repository = repository;
    this.clock = clock;
    this.appVersion = appVersion;
    this.idGenerator = idGenerator;
  }

  ensure(subjectId) {
    const subject = this.repository.getEntity("subjects", subjectId);
    if (!subject) {
      throw new RangeError("Assunto não encontrado.");
    }
    const now = this.clock();
    const result = normalizeGuidedFlow(subject.guidedFlow, subjectId, now);

    if (result.changed) {
      this.repository.transaction((draft) => {
        const target = draft.collections.subjects[subjectId];
        target.guidedFlow = result.guidedFlow;
        target.updatedAt = now;
        target.entityVersion = Math.max(2, Number(target.entityVersion) || 1);
      });
    }

    const normalized = this.repository.getEntity("subjects", subjectId);
    const validation = validateSubject(normalized);
    if (!validation.valid) {
      throw new TypeError(validation.errors.join(" "));
    }
    return normalized.guidedFlow;
  }

  getView(subjectId) {
    this.ensure(subjectId);
    const subject = this.#getSubject(subjectId);
    const progress = this.repository.getEntity(
      "progressSnapshots",
      `progress-${subjectId}`,
    );
    if (!progress) {
      throw new RangeError("O progresso precisa ser calculado antes do roteiro.");
    }

    const records = this.repository.getCollection("records");
    const summaries = this.repository.getCollection("summaries");
    const sessions = this.repository.getCollection("importedSessions");
    const questions = this.repository.getCollection("importedQuestions");
    const errorRecords = this.repository.getCollection("errorRecords");
    const activeSessions = values(sessions).filter(
      (session) =>
        session.subjectId === subjectId &&
        isActiveRecord(records[session.recordId]) &&
        isValidPracticeSession(session),
    );
    const activeSessionIds = new Set(activeSessions.map((session) => session.id));
    const activeQuestions = values(questions).filter(
      (question) =>
        question.subjectId === subjectId && activeSessionIds.has(question.sessionId),
    );
    const correctQuestions = activeQuestions.filter(
      (question) => question.result === "correct",
    );
    const incorrectQuestions = activeQuestions.filter(
      (question) => question.result === "incorrect",
    );
    const activeErrors = values(errorRecords).filter(
      (errorRecord) =>
        errorRecord.subjectId === subjectId &&
        isActiveRecord(records[errorRecord.recordId]),
    );
    const allChecks = subject.guidedFlow.metacognitiveChecks ?? [];
    const activeQuestionIds = new Set(activeQuestions.map((question) => question.id));
    const checks = allChecks.filter(
      (check) =>
        activeSessionIds.has(check.sessionId) &&
        activeQuestionIds.has(check.questionId),
    );
    const currentStage = subject.guidedFlow.currentStage;
    const currentIndex = getGuidedFlowStageIndex(currentStage);
    const recommendedStage =
      GUIDED_FLOW_STAGES.find((stage) => {
        const category = stagePoints(progress, stage);
        return category.activePoints < category.cap;
      }) ?? "consolidation";
    const recommendedIndex = getGuidedFlowStageIndex(recommendedStage);

    const context = {
      subject,
      progress,
      records,
      summaries,
      activeSessions,
      activeQuestions,
      correctQuestions,
      incorrectQuestions,
      activeErrors,
      checks,
    };

    const stages = GUIDED_FLOW_STAGES.map((stage, index) => {
      const category = stagePoints(progress, stage);
      const previousComplete = GUIDED_FLOW_STAGES.slice(0, index).every(
        (previousStage) => {
          const previousCategory = stagePoints(progress, previousStage);
          return previousCategory.activePoints === previousCategory.cap;
        },
      );
      const canBecomeCurrent = index <= currentIndex || previousComplete;
      const evidence = this.#evidenceForStage(stage, context);
      const missing = this.#missingForStage(stage, context);
      const action = this.#actionForStage(stage, context);

      return Object.freeze({
        key: stage,
        ...GUIDED_FLOW_STAGE_DEFINITIONS[stage],
        index,
        activePoints: category.activePoints,
        cap: category.cap,
        complete: category.activePoints === category.cap,
        current: stage === currentStage,
        recommended: stage === recommendedStage,
        canBecomeCurrent,
        blockedReason: canBecomeCurrent
          ? null
          : `Conclua ${GUIDED_FLOW_STAGE_DEFINITIONS[GUIDED_FLOW_STAGES[index - 1]].shortLabel} e as etapas anteriores antes de tornar esta etapa atual.`,
        evidence,
        missing,
        action,
      });
    });

    const current = stages.find((stage) => stage.key === currentStage);
    const recommended = stages.find((stage) => stage.key === recommendedStage);
    const advanceAvailable = Boolean(
      current?.complete && recommendedIndex > currentIndex,
    );
    const regression = Boolean(recommendedIndex < currentIndex);

    return Object.freeze({
      subject,
      progress,
      stages,
      currentStage,
      recommendedStage,
      current,
      recommended,
      advanceAvailable,
      regression,
      regressionMessage: regression
        ? `${recommended.shortLabel} voltou a ter uma pendência. A etapa atual foi preservada, mas completar essa etapa anterior é a recomendação mais segura.`
        : null,
      completed: progress.currentTotal === progress.goalTotal,
      prerequisitePoints: prerequisiteTotal(progress),
      metacognitiveCheckCount: checks.length,
      historicalMetacognitiveCheckCount: allChecks.length - checks.length,
      hasPracticeWithoutErrors:
        activeSessions.length > 0 && incorrectQuestions.length === 0,
    });
  }

  setCurrentStage(subjectId, stage) {
    const view = this.getView(subjectId);
    const target = view.stages.find((candidate) => candidate.key === stage);
    if (!target) {
      throw new RangeError("Etapa desconhecida no roteiro.");
    }
    if (!target.canBecomeCurrent) {
      throw new TypeError(target.blockedReason);
    }
    if (stage === view.currentStage) {
      return view;
    }

    const now = this.clock();
    this.repository.transaction((draft) => {
      const subject = draft.collections.subjects[subjectId];
      const previousStage = subject.guidedFlow.currentStage;
      subject.guidedFlow.currentStage = stage;
      subject.guidedFlow.lastStageChangedAt = now;
      subject.guidedFlow.updatedAt = now;
      subject.lastActivityAt = now;
      subject.updatedAt = now;
      this.#appendEvent(draft, {
        subjectId,
        entityType: "guided_flow",
        entityId: subjectId,
        eventType: "guided_stage_changed",
        summary: `Etapa atual do roteiro alterada para ${GUIDED_FLOW_STAGE_DEFINITIONS[stage].label}.`,
        metadata: { previousStage, nextStage: stage },
        now,
      });
    });
    return this.getView(subjectId);
  }

  consumeAdvanceNotice(subjectId) {
    const view = this.getView(subjectId);
    if (!view.advanceAvailable) {
      return null;
    }

    const category = view.progress.categories[view.current.categoryKey];
    const evidenceKey = [...category.evidenceIds].sort().join("|");
    const key = `${view.currentStage}:${view.recommendedStage}:${category.activePoints}:${evidenceKey}`;
    const subject = view.subject;
    if (subject.guidedFlow.notifiedCompletionKeys.includes(key)) {
      return null;
    }

    const now = this.clock();
    this.repository.transaction((draft) => {
      const target = draft.collections.subjects[subjectId];
      target.guidedFlow.notifiedCompletionKeys = [
        ...target.guidedFlow.notifiedCompletionKeys,
        key,
      ].slice(-30);
      target.guidedFlow.updatedAt = now;
      target.updatedAt = now;
    });

    return Object.freeze({
      key,
      type: "success",
      message: `${view.current.label} foi concluída. Prosseguir para ${view.recommended.label} agora é recomendado.`,
    });
  }

  getMetacognitiveView(subjectId) {
    const flowView = this.getView(subjectId);
    const records = this.repository.getCollection("records");
    const sessions = this.repository.getCollection("importedSessions");
    const questions = this.repository.getCollection("importedQuestions");
    const sessionMap = new Map(values(sessions).map((session) => [session.id, session]));
    const activeValidSessionIds = new Set(
      values(sessions)
        .filter(
          (session) =>
            session.subjectId === subjectId &&
            isActiveRecord(records[session.recordId]) &&
            isValidPracticeSession(session),
        )
        .map((session) => session.id),
    );
    const correctQuestions = values(questions)
      .filter(
        (question) =>
          question.subjectId === subjectId &&
          question.result === "correct" &&
          activeValidSessionIds.has(question.sessionId),
      )
      .sort((a, b) => {
        const difficultyWeight = { hard: 3, medium: 2, easy: 1 };
        const difficultyDifference =
          (difficultyWeight[b.difficulty] ?? 0) -
          (difficultyWeight[a.difficulty] ?? 0);
        const sessionA = sessionMap.get(a.sessionId);
        const sessionB = sessionMap.get(b.sessionId);
        return (
          difficultyDifference ||
          (sessionB?.sessionDate ?? "").localeCompare(sessionA?.sessionDate ?? "") ||
          a.order - b.order
        );
      });
    const usedQuestionIds = new Set(
      flowView.subject.guidedFlow.metacognitiveChecks.map((check) => check.questionId),
    );

    return Object.freeze({
      flowView,
      candidates: correctQuestions
        .filter((question) => !usedQuestionIds.has(question.id))
        .map((question) => ({
          question,
          session: sessionMap.get(question.sessionId),
          label: questionLabel(question),
        })),
      confirmationCandidates: correctQuestions.map((question) => ({
        question,
        session: sessionMap.get(question.sessionId),
        label: questionLabel(question),
      })),
      checks: flowView.subject.guidedFlow.metacognitiveChecks.map((check) => ({
        check,
        question: questions[check.questionId] ?? null,
        session: sessionMap.get(check.sessionId) ?? null,
        active:
          activeValidSessionIds.has(check.sessionId) &&
          questions[check.questionId]?.result === "correct",
        confirmationQuestion:
          questions[check.review?.confirmationQuestionId] ?? null,
      })),
    });
  }

  createMetacognitiveCheck(subjectId, input) {
    const now = this.clock();
    const question = this.repository.getEntity("importedQuestions", input.questionId);
    if (!question || question.subjectId !== subjectId || question.result !== "correct") {
      throw new TypeError("Selecione uma questão correta do assunto atual.");
    }
    const session = this.repository.getEntity("importedSessions", question.sessionId);
    const record = session
      ? this.repository.getEntity("records", session.recordId)
      : null;
    if (
      !session ||
      !isActiveRecord(record) ||
      !isValidPracticeSession(session)
    ) {
      throw new TypeError("A questão deve pertencer a uma prática válida e ativa.");
    }

    const subject = this.#getSubject(subjectId);
    if (
      subject.guidedFlow.metacognitiveChecks.some(
        (check) => check.questionId === question.id,
      )
    ) {
      throw new TypeError("Esta questão já possui uma verificação metacognitiva.");
    }

    const check = createMetacognitiveCheck({
      id: this.idGenerator("metacognitive-check"),
      subjectId,
      questionId: question.id,
      sessionId: question.sessionId,
      reasonTags: input.reasonTags,
      whyDemanding: input.whyDemanding,
      correctReasoning: input.correctReasoning,
      howToRecognize: input.howToRecognize,
      now,
    });

    this.repository.transaction((draft) => {
      const target = draft.collections.subjects[subjectId];
      target.guidedFlow.metacognitiveChecks.push(check);
      target.guidedFlow.updatedAt = now;
      target.lastActivityAt = now;
      target.updatedAt = now;
      this.#appendEvent(draft, {
        subjectId,
        entityType: "metacognitive_check",
        entityId: check.id,
        eventType: "metacognitive_check_created",
        summary: "Acerto difícil transformado em verificação metacognitiva.",
        metadata: { questionId: question.id, sessionId: question.sessionId },
        now,
      });
    });
    return check;
  }

  markMetacognitiveReviewed(subjectId, checkId) {
    const subject = this.#getSubject(subjectId);
    const check = subject.guidedFlow.metacognitiveChecks.find(
      (candidate) => candidate.id === checkId,
    );
    if (!check) {
      throw new RangeError("Verificação metacognitiva não encontrada.");
    }
    this.#assertCheckSourceActive(check, subjectId);
    const now = this.clock();
    const updated = markMetacognitiveCheckReviewed(check, now);
    this.#replaceCheck(subjectId, updated, now, {
      eventType: "metacognitive_check_reviewed",
      summary: "Verificação metacognitiva marcada como revisada.",
    });
    return updated;
  }

  confirmMetacognitive(subjectId, checkId, confirmationQuestionId) {
    const subject = this.#getSubject(subjectId);
    const check = subject.guidedFlow.metacognitiveChecks.find(
      (candidate) => candidate.id === checkId,
    );
    if (!check) {
      throw new RangeError("Verificação metacognitiva não encontrada.");
    }
    this.#assertCheckSourceActive(check, subjectId);
    const question = this.repository.getEntity(
      "importedQuestions",
      confirmationQuestionId,
    );
    if (!question || question.subjectId !== subjectId || question.result !== "correct") {
      throw new TypeError("A confirmação exige outra questão correta do assunto.");
    }
    const session = this.repository.getEntity("importedSessions", question.sessionId);
    const record = session
      ? this.repository.getEntity("records", session.recordId)
      : null;
    if (
      !session ||
      !isActiveRecord(record) ||
      !isValidPracticeSession(session)
    ) {
      throw new TypeError(
        "A questão de confirmação deve pertencer a uma prática válida e ativa.",
      );
    }

    const now = this.clock();
    const updated = confirmMetacognitiveCheck(check, confirmationQuestionId, now);
    this.#replaceCheck(subjectId, updated, now, {
      eventType: "metacognitive_check_confirmed",
      summary: "Compreensão confirmada com outra questão correta.",
      metadata: { confirmationQuestionId },
    });
    return updated;
  }

  confirmConsolidation(subjectId, finalObservation = "") {
    const view = this.getView(subjectId);
    if (view.prerequisitePoints < 9) {
      throw new TypeError(
        "A consolidação exige os nove pontos das etapas anteriores.",
      );
    }

    const now = this.clock();
    this.repository.transaction((draft) => {
      const subject = draft.collections.subjects[subjectId];
      subject.consolidation.status = "confirmed";
      subject.consolidation.confirmedAt = now;
      subject.consolidation.suspendedAt = null;
      subject.consolidation.finalObservation = createOptionalRichContent(
        finalObservation,
        now,
      );
      subject.consolidation.lastReason =
        "Consolidação confirmada conscientemente após nove pontos anteriores.";
      subject.consolidation.confirmationCount =
        Number(subject.consolidation.confirmationCount ?? 0) + 1;
      subject.guidedFlow.currentStage = "consolidation";
      subject.guidedFlow.lastStageChangedAt = now;
      subject.guidedFlow.updatedAt = now;
      subject.lastActivityAt = now;
      subject.updatedAt = now;
      this.#appendEvent(draft, {
        subjectId,
        entityType: "subject",
        entityId: subjectId,
        eventType: "consolidation_confirmed",
        summary: "Consolidação final confirmada pelo usuário.",
        metadata: { prerequisitePoints: 9 },
        now,
      });
    });
    return this.repository.getEntity("subjects", subjectId);
  }

  #assertCheckSourceActive(check, subjectId) {
    const question = this.repository.getEntity("importedQuestions", check.questionId);
    const session = this.repository.getEntity("importedSessions", check.sessionId);
    const record = session
      ? this.repository.getEntity("records", session.recordId)
      : null;

    if (
      !question ||
      question.subjectId !== subjectId ||
      question.result !== "correct" ||
      question.sessionId !== check.sessionId ||
      !session ||
      session.subjectId !== subjectId ||
      !isActiveRecord(record) ||
      !isValidPracticeSession(session)
    ) {
      throw new TypeError(
        "A prática de origem desta verificação não está mais ativa e válida.",
      );
    }
  }

  #replaceCheck(subjectId, updated, now, event) {
    this.repository.transaction((draft) => {
      const subject = draft.collections.subjects[subjectId];
      const index = subject.guidedFlow.metacognitiveChecks.findIndex(
        (check) => check.id === updated.id,
      );
      if (index < 0) {
        throw new RangeError("Verificação metacognitiva não encontrada.");
      }
      subject.guidedFlow.metacognitiveChecks[index] = updated;
      subject.guidedFlow.updatedAt = now;
      subject.lastActivityAt = now;
      subject.updatedAt = now;
      this.#appendEvent(draft, {
        subjectId,
        entityType: "metacognitive_check",
        entityId: updated.id,
        eventType: event.eventType,
        summary: event.summary,
        metadata: event.metadata ?? null,
        now,
      });
    });
  }

  #evidenceForStage(stage, context) {
    const ids = stagePoints(context.progress, stage).evidenceIds;
    const sessionById = new Map(
      context.activeSessions.map((session) => [session.id, session]),
    );
    const errorById = new Map(
      context.activeErrors.map((errorRecord) => [errorRecord.id, errorRecord]),
    );
    const checkById = new Map(context.checks.map((check) => [check.id, check]));
    const questionById = new Map(
      context.activeQuestions.map((question) => [question.id, question]),
    );

    if (stage === "base") {
      return ids.map((id) => recordTitle(context.records, id, "Resumo concluído"));
    }
    if (stage === "practice") {
      return ids.map(
        (id) => sessionById.get(id)?.sessionTitle ?? "Lista válida importada",
      );
    }
    if (stage === "errorAnalysis" || stage === "review") {
      return ids.map((id) => {
        const errorRecord = errorById.get(id);
        if (errorRecord) {
          return recordTitle(context.records, errorRecord.recordId, "Registro de Erro");
        }
        const check = checkById.get(id);
        if (check) {
          return `Verificação: ${questionLabel(questionById.get(check.questionId))}`;
        }
        return "Evidência preservada";
      });
    }
    if (stage === "consolidation" && ids.length) {
      return ["Confirmação consciente da consolidação final"];
    }
    return [];
  }

  #missingForStage(stage, context) {
    const category = stagePoints(context.progress, stage);
    const missingPoints = category.cap - category.activePoints;
    if (missingPoints <= 0) {
      return ["Todos os requisitos desta etapa foram cumpridos."];
    }

    if (stage === "base") {
      return category.activePoints === 0
        ? ["Concluir um Resumo com conteúdo.", "Marcar um Resumo concluído como estudado."]
        : ["Marcar um Resumo concluído como estudado."];
    }
    if (stage === "practice") {
      return [`Importar mais ${missingPoints} lista(s) válida(s) do Test Quest.`];
    }
    if (stage === "errorAnalysis") {
      return [
        `Concluir mais ${missingPoints} análise(s) de erro ou verificação(ões) de acerto difícil.`,
      ];
    }
    if (stage === "review") {
      return [
        "Revisar uma análise para conquistar o primeiro ponto.",
        "Registrar uma confirmação posterior para conquistar o segundo ponto.",
      ].slice(category.activePoints);
    }
    return ["Alcançar os nove pontos anteriores e confirmar manualmente."];
  }

  #actionForStage(stage, context) {
    const category = stagePoints(context.progress, stage);
    if (stage === "base") {
      if (category.activePoints === 0) {
        return {
          type: "create_summary",
          label: "Criar Resumo",
          description: "Comece registrando a base teórica do assunto.",
        };
      }
      if (category.activePoints === 1) {
        const completedUnstudied = values(context.records).find((record) => {
          const summary = context.summaries[record.id];
          return (
            record.subjectId === context.subject.id &&
            record.type === "summary" &&
            !record.archivedAt &&
            record.status === "completed" &&
            !summary?.isStudied
          );
        });
        return {
          type: completedUnstudied ? "open_summary" : "open_summaries",
          recordId: completedUnstudied?.id ?? null,
          label: "Marcar Resumo como estudado",
          description: "Releia a base e confirme a marcação de estudo.",
        };
      }
      return {
        type: "open_summaries",
        label: "Consultar Resumos",
        description: "A Base já está completa.",
      };
    }

    if (stage === "practice") {
      const hasPracticeWithoutErrors =
        context.activeSessions.length > 0 && context.incorrectQuestions.length === 0;
      if (category.activePoints < category.cap) {
        return {
          type: "open_test_quest",
          label: "Abrir Test Quest",
          description: `Faltam ${category.cap - category.activePoints} lista(s) válida(s).`,
          secondary: {
            type: "import_result",
            label: "Já resolveu? Importar resultado",
          },
          tertiary: hasPracticeWithoutErrors
            ? {
                type: "open_metacognitive",
                label: "Verificar acertos difíceis",
              }
            : null,
        };
      }
      return {
        type: "open_exercises",
        label: "Consultar exercícios",
        description: "A prática necessária já foi registrada.",
        secondary: {
          type: "open_test_quest",
          label: "Abrir Test Quest novamente",
        },
        tertiary: hasPracticeWithoutErrors
          ? {
              type: "open_metacognitive",
              label: "Verificar acertos difíceis",
            }
          : null,
      };
    }

    if (stage === "errorAnalysis") {
      const incompleteErrors = context.activeErrors.filter(
        (errorRecord) => !errorRecord.analysis?.isComplete,
      );
      const unlinkedIncorrect = context.incorrectQuestions.filter(
        (question) => !(question.errorRecordIds ?? []).length,
      );
      if (incompleteErrors.length) {
        return {
          type: "open_errors",
          label: "Analisar Registros de Erro",
          description: `${incompleteErrors.length} análise(s) ainda estão pendentes.`,
        };
      }
      if (unlinkedIncorrect.length) {
        return {
          type: "open_exercises",
          label: "Criar Registros de Erro",
          description: `${unlinkedIncorrect.length} questão(ões) incorreta(s) ainda podem ser analisadas.`,
        };
      }
      if (category.activePoints < category.cap) {
        return {
          type: "open_metacognitive",
          label: "Verificar acertos difíceis",
          description:
            "Use questões corretas que exigiram esforço, insegurança ou eliminação.",
        };
      }
      return {
        type: "open_errors",
        label: "Consultar análises",
        description: "A análise necessária já foi concluída.",
      };
    }

    if (stage === "review") {
      const pendingErrorReview = context.activeErrors.some(
        (errorRecord) =>
          errorRecord.analysis?.isComplete && errorRecord.reviewStatus !== "reviewed",
      );
      const pendingErrorEvidence = context.activeErrors.some(
        (errorRecord) =>
          errorRecord.reviewStatus === "reviewed" &&
          errorRecord.masteryStatus !== "overcome",
      );
      const pendingCheck = context.checks.some(
        (check) => check.analysis?.isComplete && check.review?.status !== "confirmed",
      );
      if (pendingErrorReview || pendingErrorEvidence) {
        return {
          type: "open_errors",
          label: pendingErrorReview ? "Revisar erros" : "Registrar nova evidência",
          description: pendingErrorReview
            ? "Há análises completas aguardando revisão."
            : "Comprove a compreensão com respostas corretas posteriores.",
        };
      }
      if (pendingCheck || category.activePoints < category.cap) {
        return {
          type: "open_metacognitive",
          label: "Revisar verificações",
          description:
            "Revise a análise e confirme-a com outra questão correta.",
        };
      }
      return {
        type: "open_errors",
        label: "Consultar revisões",
        description: "A revisão necessária já foi comprovada.",
      };
    }

    if (context.progress.currentTotal === context.progress.goalTotal) {
      return {
        type: "open_stage_help",
        stageKey: stage,
        label: "Consultar consolidação",
        description: "O caminho de consolidação está completo.",
      };
    }
    if (prerequisiteTotal(context.progress) >= 9) {
      return {
        type: "confirm_consolidation",
        label: "Confirmar consolidação",
        description:
          "Revise as evidências dos nove pontos e faça a confirmação final.",
      };
    }
    return {
      type: "open_stage_help",
      stageKey: stage,
      label: "Ver requisitos",
      description: "Complete as etapas anteriores antes da confirmação final.",
    };
  }

  #getSubject(subjectId) {
    const subject = this.repository.getEntity("subjects", subjectId);
    if (!subject) {
      throw new RangeError("Assunto não encontrado.");
    }
    const validation = validateSubject(subject);
    if (!validation.valid) {
      throw new TypeError(validation.errors.join(" "));
    }
    const flowValidation = validateGuidedFlow(subject.guidedFlow, subjectId);
    if (!flowValidation.valid) {
      throw new TypeError(flowValidation.errors.join(" "));
    }
    return subject;
  }

  #appendEvent(
    draft,
    { subjectId, entityType, entityId, eventType, summary, metadata = null, now },
  ) {
    const id = this.idGenerator("history");
    draft.collections.historyEvents[id] = {
      id,
      subjectId,
      entityType,
      entityId,
      eventType,
      occurredAt: now,
      summary,
      metadata,
      origin: "user",
      appVersion: this.appVersion,
      entityVersion: 1,
    };
  }
}

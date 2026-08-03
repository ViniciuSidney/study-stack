import {
  createImportedQuestion,
  createImportedSession,
  normalizeTestQuestPayload,
  updateSessionNotes,
  validateImportedQuestion,
  validateImportedSession,
} from "../domain/imported-session.js";
import {
  createRecord,
  refreshRecordSearchIndex,
  validateRecord,
} from "../domain/record.js";
import { getRichContentPlainText } from "../domain/rich-content.js";
import { createId } from "../utils/id.js";

function compareSessions(a, b) {
  return (
    b.session.sessionDate.localeCompare(a.session.sessionDate) ||
    b.session.importedAt.localeCompare(a.session.importedAt) ||
    a.session.sessionTitle.localeCompare(b.session.sessionTitle, "pt-BR")
  );
}

function getSessionSearchText(session, questions) {
  return [
    session.sessionTitle,
    getRichContentPlainText(session.sessionNotes),
    ...questions.flatMap((question) => [
      getRichContentPlainText(question.statement),
      getRichContentPlainText(question.userAnswer),
      getRichContentPlainText(question.correctAnswer),
      getRichContentPlainText(question.correction),
    ]),
  ].join(" ");
}

export class ExerciseService {
  constructor({ repository, clock, appVersion, idGenerator = createId }) {
    this.repository = repository;
    this.clock = clock;
    this.appVersion = appVersion;
    this.idGenerator = idGenerator;
  }

  importPayload(payload, { expectedSubjectId = null } = {}) {
    const now = this.clock();
    let normalized;

    try {
      normalized = normalizeTestQuestPayload(payload, now);
    } catch (error) {
      this.#queuePending(payload, {
        status: "invalid",
        issues: [error instanceof Error ? error.message : "Payload inválido."],
        now,
      });
      throw error;
    }

    if (
      expectedSubjectId &&
      normalized.subjectId !== expectedSubjectId
    ) {
      this.#queuePending(payload, {
        status: "pending_link",
        issues: [
          `O resultado pertence ao assunto ${normalized.subjectId}, não ao assunto aberto ${expectedSubjectId}.`,
        ],
        now,
        normalized,
      });
      return {
        status: "pending_link",
        session: null,
        message: "Importação preservada porque pertence a outro assunto.",
      };
    }

    if (!this.repository.getEntity("subjects", normalized.subjectId)) {
      this.#queuePending(payload, {
        status: "pending_link",
        issues: ["O assunto informado ainda não existe no Study Stack."],
        now,
        normalized,
      });
      return {
        status: "pending_link",
        session: null,
        message: "Importação preservada aguardando o vínculo do assunto.",
      };
    }

    const existing = Object.values(
      this.repository.getCollection("importedSessions"),
    ).find(
      (session) =>
        session.sourceSessionId === normalized.sessionId &&
        session.subjectId === normalized.subjectId,
    );

    if (existing?.payloadFingerprint === normalized.payloadFingerprint) {
      return {
        status: "duplicate",
        session: this.getView(existing.id),
        message: "Esta sessão já havia sido importada sem alterações.",
      };
    }

    if (existing) {
      this.#queuePending(payload, {
        status: "needs_review",
        issues: [
          "Já existe uma sessão com o mesmo ID e conteúdo diferente. A versão atual foi preservada.",
        ],
        now,
        normalized,
      });
      return {
        status: "needs_review",
        session: this.getView(existing.id),
        message: "Reimportação preservada para revisão, sem sobrescrever dados.",
      };
    }

    const recordId = this.idGenerator("record");
    const sessionId = this.idGenerator("session");
    const questions = normalized.questions.map((question) =>
      createImportedQuestion({
        id: this.idGenerator("question"),
        sessionId,
        subjectId: normalized.subjectId,
        normalizedQuestion: question,
      }),
    );
    const session = createImportedSession({
      id: sessionId,
      recordId,
      normalizedPayload: normalized,
      questionIds: questions.map((question) => question.id),
      importedAt: now,
    });
    let record = createRecord(
      {
        id: recordId,
        subjectId: normalized.subjectId,
        type: "imported_session",
        title: normalized.sessionTitle,
        status: "completed",
        allowCompletion: true,
        studyDate: normalized.sessionDate.slice(0, 10),
        tags: ["test-quest", "exercícios"],
        source: {
          app: "test_quest",
          sourceId: normalized.sessionId,
          contractVersion: normalized.contractVersion,
        },
      },
      now,
    );
    record = refreshRecordSearchIndex(
      record,
      getSessionSearchText(session, questions),
    );

    this.repository.transaction((draft) => {
      draft.collections.records[record.id] = record;
      draft.collections.importedSessions[session.id] = session;
      for (const question of questions) {
        draft.collections.importedQuestions[question.id] = question;
      }

      const subject = draft.collections.subjects[normalized.subjectId];
      subject.lastActivityAt = now;
      subject.updatedAt = now;

      const historyId = this.idGenerator("history");
      draft.collections.historyEvents[historyId] = {
        id: historyId,
        subjectId: normalized.subjectId,
        entityType: "imported_session",
        entityId: session.id,
        eventType: "imported",
        occurredAt: now,
        summary: `Lista do Test Quest importada com ${session.stats.total} questões e ${session.stats.percentage}% de aproveitamento.`,
        metadata: {
          recordId: record.id,
          sourceSessionId: session.sourceSessionId,
          stats: structuredClone(session.stats),
        },
        origin: "test_quest",
        appVersion: this.appVersion,
        entityVersion: 1,
      };

      const integration = draft.collections.integrationState.global;
      integration.testQuest = {
        status: "connected",
        supportedContractVersions: ["1.0.0"],
        lastContractVersion: normalized.contractVersion,
        lastSessionId: normalized.sessionId,
        lastReceivedAt: now,
        lastIssue: null,
      };
      integration.updatedAt = now;
    });

    return {
      status: "imported",
      session: this.getView(session.id),
      message: "Resultado do Test Quest importado com sucesso.",
    };
  }

  getView(sessionId) {
    const session = this.repository.getEntity("importedSessions", sessionId);
    if (!session) {
      throw new RangeError("Sessão importada não encontrada.");
    }

    const sessionValidation = validateImportedSession(session);
    if (!sessionValidation.valid) {
      throw new TypeError(sessionValidation.errors.join(" "));
    }

    const record = this.repository.getEntity("records", session.recordId);
    if (!record) {
      throw new RangeError("Record da sessão importada não encontrado.");
    }
    const recordValidation = validateRecord(record);
    if (!recordValidation.valid) {
      throw new TypeError(recordValidation.errors.join(" "));
    }

    const questionCollection = this.repository.getCollection("importedQuestions");
    const questions = session.questionIds.map((id) => {
      const question = questionCollection[id];
      if (!question) {
        throw new RangeError(`Questão importada não encontrada: ${id}.`);
      }
      const validation = validateImportedQuestion(question);
      if (!validation.valid) {
        throw new TypeError(validation.errors.join(" "));
      }
      return question;
    });

    return Object.freeze({
      record,
      session,
      questions,
      errorCandidateCount: questions.filter(
        (question) =>
          question.result === "incorrect" &&
          !(question.errorRecordIds ?? []).length,
      ).length,
      existingErrorCount: questions.filter(
        (question) =>
          question.result === "incorrect" &&
          (question.errorRecordIds ?? []).length > 0,
      ).length,
    });
  }

  getViewByRecordId(recordId) {
    const session = Object.values(
      this.repository.getCollection("importedSessions"),
    ).find((candidate) => candidate.recordId === recordId);

    return session ? this.getView(session.id) : null;
  }

  listViewsBySubject(subjectId, { archived = false } = {}) {
    const records = this.repository.getCollection("records");

    return Object.values(this.repository.getCollection("importedSessions"))
      .filter((session) => session.subjectId === subjectId)
      .map((session) => this.getView(session.id))
      .filter((view) => Boolean(view.record.archivedAt) === archived)
      .sort(compareSessions);
  }

  saveSessionNotes(sessionId, value) {
    const current = this.repository.getEntity("importedSessions", sessionId);
    if (!current) {
      throw new RangeError("Sessão importada não encontrada.");
    }

    const now = this.clock();
    const next = updateSessionNotes(current, value, now);
    const questions = next.questionIds.map((questionId) =>
      this.repository.getEntity("importedQuestions", questionId),
    );
    const currentRecord = this.repository.getEntity("records", next.recordId);
    const nextRecord = refreshRecordSearchIndex(
      currentRecord,
      getSessionSearchText(next, questions),
      now,
    );

    this.repository.transaction((draft) => {
      draft.collections.importedSessions[sessionId] = next;
      draft.collections.records[nextRecord.id] = nextRecord;
      const subject = draft.collections.subjects[next.subjectId];
      subject.lastActivityAt = now;
      subject.updatedAt = now;

      const historyId = this.idGenerator("history");
      draft.collections.historyEvents[historyId] = {
        id: historyId,
        subjectId: next.subjectId,
        entityType: "imported_session",
        entityId: next.id,
        eventType: "edited",
        occurredAt: now,
        summary: "Observação pessoal da lista importada atualizada.",
        metadata: { recordId: next.recordId },
        origin: "user",
        appVersion: this.appVersion,
        entityVersion: 1,
      };
    });

    return this.getView(sessionId);
  }

  getAggregate(subjectId) {
    const views = this.listViewsBySubject(subjectId);
    const stats = views.reduce(
      (total, view) => ({
        sessions: total.sessions + 1,
        questions: total.questions + view.session.stats.total,
        answered: total.answered + view.session.stats.answered,
        correct: total.correct + view.session.stats.correct,
        incorrect: total.incorrect + view.session.stats.incorrect,
        unanswered: total.unanswered + view.session.stats.unanswered,
        validSessions:
          total.validSessions + Number(view.session.stats.validForPractice),
      }),
      {
        sessions: 0,
        questions: 0,
        answered: 0,
        correct: 0,
        incorrect: 0,
        unanswered: 0,
        validSessions: 0,
      },
    );

    return Object.freeze({
      ...stats,
      percentage: stats.questions
        ? Math.round((stats.correct / stats.questions) * 100)
        : 0,
    });
  }

  listPending({ includeResolved = false } = {}) {
    return Object.values(this.repository.getCollection("pendingImports"))
      .filter((entry) => includeResolved || !entry.resolvedAt)
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  }

  dismissPending(id) {
    const current = this.repository.getEntity("pendingImports", id);
    if (!current) {
      throw new RangeError("Importação pendente não encontrada.");
    }

    if (current.resolvedAt) {
      return current;
    }

    const now = this.clock();
    return this.repository.transaction((draft) => {
      const entry = draft.collections.pendingImports[id];
      entry.resolvedAt = now;
      entry.resolution = {
        action: "dismissed",
        resolvedBy: "user",
        message: "Pendência descartada manualmente sem importar o conteúdo.",
      };
      entry.entityVersion = Math.max(1, entry.entityVersion ?? 1);
      return entry;
    }).result;
  }

  #queuePending(payload, { status, issues, now, normalized = null }) {
    const id = this.idGenerator("pending-import");
    const fingerprint =
      normalized?.payloadFingerprint ?? `invalid-${this.idGenerator("payload")}`;

    this.repository.transaction((draft) => {
      draft.collections.pendingImports[id] = {
        id,
        sourceApp: "test_quest",
        sourceId:
          normalized?.sessionId ?? String(payload?.sessionId ?? "unknown"),
        contractVersion:
          normalized?.contractVersion ?? String(payload?.contractVersion ?? "unknown"),
        receivedAt: now,
        status,
        subjectIdCandidate: normalized?.subjectId ?? payload?.subjectContext?.subjectId ?? null,
        validationIssues: [...issues],
        payload: structuredClone(payload ?? {}),
        payloadFingerprint: fingerprint,
        resolvedAt: null,
        resolution: null,
        entityVersion: 1,
      };

      const integration = draft.collections.integrationState.global;
      integration.testQuest = {
        status: status === "invalid" ? "error" : "attention",
        supportedContractVersions: ["1.0.0"],
        lastContractVersion: normalized?.contractVersion ?? null,
        lastSessionId: normalized?.sessionId ?? null,
        lastReceivedAt: now,
        lastIssue: issues.join(" "),
      };
      integration.updatedAt = now;
    });
  }
}

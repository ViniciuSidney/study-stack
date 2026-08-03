import {
  createErrorEvidence,
  createErrorOccurrence,
  createErrorRecord,
  registerCorrectEvidence,
  registerErrorRecurrence,
  setErrorReviewStatus,
  updateErrorAnalysis,
  validateErrorEvidence,
  validateErrorOccurrence,
  validateErrorRecord,
} from "../domain/error-record.js";
import {
  changeRecordStatus,
  createRecord,
  refreshRecordSearchIndex,
  updateRecord,
  validateRecord,
} from "../domain/record.js";
import { getRichContentPlainText } from "../domain/rich-content.js";
import { createId } from "../utils/id.js";

function compareViews(a, b) {
  const categoryWeight = {
    recurrent: 0,
    pending: 1,
    reviewed: 2,
    overcome: 3,
  };
  return (
    categoryWeight[a.category] - categoryWeight[b.category] ||
    b.errorRecord.lastOccurrenceAt.localeCompare(a.errorRecord.lastOccurrenceAt) ||
    a.record.title.localeCompare(b.record.title, "pt-BR")
  );
}

function errorCategory(errorRecord) {
  if (errorRecord.masteryStatus === "overcome") {
    return "overcome";
  }
  if (errorRecord.recurrenceCount > 0) {
    return "recurrent";
  }
  if (errorRecord.reviewStatus === "reviewed") {
    return "reviewed";
  }
  return "pending";
}

function errorTitle(question) {
  const statement = getRichContentPlainText(question.statement);
  const concise = statement.length > 82 ? `${statement.slice(0, 79).trim()}…` : statement;
  return concise ? `Erro: ${concise}` : `Erro na questão ${question.order}`;
}

function errorSearchText(errorRecord, question, linkedRecords = []) {
  return [
    getRichContentPlainText(question?.statement),
    getRichContentPlainText(question?.userAnswer),
    getRichContentPlainText(question?.correctAnswer),
    getRichContentPlainText(question?.correction),
    getRichContentPlainText(errorRecord.analysis?.whyItHappened),
    getRichContentPlainText(errorRecord.analysis?.correctRule),
    getRichContentPlainText(errorRecord.analysis?.howToAvoid),
    ...(errorRecord.errorTags ?? []),
    ...linkedRecords.map((record) => record.title),
  ].join(" ");
}

export class ErrorService {
  constructor({ repository, clock, appVersion, idGenerator = createId }) {
    this.repository = repository;
    this.clock = clock;
    this.appVersion = appVersion;
    this.idGenerator = idGenerator;
  }

  createFromQuestion(questionId) {
    const question = this.#getQuestion(questionId);
    if (question.result !== "incorrect") {
      throw new TypeError("Somente questões incorretas podem originar um Registro de Erro.");
    }

    const existing = (question.errorRecordIds ?? [])
      .map((id) => this.repository.getEntity("errorRecords", id))
      .find(Boolean);
    if (existing) {
      return {
        status: "existing",
        view: this.getView(existing.id),
      };
    }

    const session = this.#getSession(question.sessionId);
    const now = this.clock();
    const recordId = this.idGenerator("record");
    const errorId = this.idGenerator("error");
    const occurrenceId = this.idGenerator("occurrence");
    const occurrence = createErrorOccurrence({
      id: occurrenceId,
      errorRecordId: errorId,
      question,
      occurredAt: now,
      kind: "initial",
    });
    const errorRecord = createErrorRecord({
      id: errorId,
      recordId,
      subjectId: question.subjectId,
      questionId: question.id,
      occurrenceId,
      now,
    });
    let record = createRecord(
      {
        id: recordId,
        subjectId: question.subjectId,
        type: "error_record",
        title: errorTitle(question),
        status: "draft",
        studyDate: session.sessionDate.slice(0, 10),
        tags: ["erro", "test-quest"],
        source: {
          app: "test_quest",
          sourceId: question.sourceQuestionId || question.id,
          sessionId: session.sourceSessionId,
          contractVersion: session.sourceContractVersion,
        },
      },
      now,
    );
    record = refreshRecordSearchIndex(record, errorSearchText(errorRecord, question));

    this.repository.transaction((draft) => {
      draft.collections.records[record.id] = record;
      draft.collections.errorRecords[errorRecord.id] = errorRecord;
      draft.collections.errorOccurrences[occurrence.id] = occurrence;
      const draftQuestion = draft.collections.importedQuestions[question.id];
      draftQuestion.errorRecordIds = [
        ...new Set([...(draftQuestion.errorRecordIds ?? []), errorRecord.id]),
      ];
      this.#touchSubject(draft, question.subjectId, now);
      this.#appendEvent(draft, {
        subjectId: question.subjectId,
        entityId: errorRecord.id,
        eventType: "created",
        summary: `Registro de Erro criado a partir da questão ${question.order}.`,
        now,
        origin: "user",
        metadata: {
          recordId: record.id,
          questionId: question.id,
          sessionId: question.sessionId,
        },
      });
    });

    return { status: "created", view: this.getView(errorRecord.id) };
  }

  createFromQuestions(questionIds) {
    const uniqueIds = [...new Set(questionIds ?? [])];
    const created = [];
    const existing = [];

    for (const questionId of uniqueIds) {
      const result = this.createFromQuestion(questionId);
      if (result.status === "created") {
        created.push(result.view);
      } else {
        existing.push(result.view);
      }
    }

    return Object.freeze({ created, existing });
  }

  saveAnalysis(errorId, input) {
    const view = this.getView(errorId);
    const title = String(input?.title ?? view.record.title).trim();
    if (!title) {
      throw new TypeError("O Registro de Erro exige um título.");
    }
    const now = this.clock();
    this.#assertLinkedRecords(
      view.errorRecord.subjectId,
      input.linkedRecordIds ?? [],
      view.record.id,
    );

    const nextError = updateErrorAnalysis(view.errorRecord, input, now);
    let nextRecord = updateRecord(
      view.record,
      {
        title,
        studyDate: input.studyDate,
        isImportant: input.isImportant,
        tags: ["erro", ...(nextError.errorTags ?? [])],
        personalNotes: input.personalNotes ?? view.record.personalNotes,
      },
      now,
    );
    const hasAnyAnalysis = Boolean(
      getRichContentPlainText(nextError.analysis.whyItHappened) ||
        getRichContentPlainText(nextError.analysis.correctRule) ||
        getRichContentPlainText(nextError.analysis.howToAvoid),
    );
    const nextStatus = nextError.analysis.isComplete
      ? "completed"
      : hasAnyAnalysis
        ? "in_progress"
        : "draft";
    nextRecord = changeRecordStatus(nextRecord, nextStatus, now, {
      completionReady: nextError.analysis.isComplete,
    });
    const linkedRecords = (nextError.linkedRecordIds ?? [])
      .map((id) => this.repository.getEntity("records", id))
      .filter(Boolean);
    nextRecord = refreshRecordSearchIndex(
      nextRecord,
      errorSearchText(nextError, view.primaryQuestion, linkedRecords),
    );

    this.repository.transaction((draft) => {
      draft.collections.errorRecords[errorId] = nextError;
      draft.collections.records[nextRecord.id] = nextRecord;
      this.#touchSubject(draft, nextError.subjectId, now);
      this.#appendEvent(draft, {
        subjectId: nextError.subjectId,
        entityId: errorId,
        eventType: nextError.analysis.isComplete ? "analysis_completed" : "edited",
        summary: nextError.analysis.isComplete
          ? "Análise do erro concluída."
          : "Rascunho da análise do erro atualizado.",
        now,
        metadata: {
          recordId: nextRecord.id,
          analysisComplete: nextError.analysis.isComplete,
        },
      });
    });

    return this.getView(errorId);
  }

  toggleReviewed(errorId) {
    const view = this.getView(errorId);
    if (!view.errorRecord.analysis.isComplete && view.errorRecord.reviewStatus !== "reviewed") {
      throw new TypeError("Conclua a análise antes de marcar o erro como revisado.");
    }

    const now = this.clock();
    const reviewed = view.errorRecord.reviewStatus !== "reviewed";
    const next = setErrorReviewStatus(view.errorRecord, reviewed, now);

    this.repository.transaction((draft) => {
      draft.collections.errorRecords[errorId] = next;
      this.#touchSubject(draft, next.subjectId, now);
      this.#appendEvent(draft, {
        subjectId: next.subjectId,
        entityId: errorId,
        eventType: reviewed ? "review_completed" : "review_reopened",
        summary: reviewed
          ? "Erro marcado como revisado."
          : "Erro devolvido para revisão.",
        now,
        metadata: { reviewCount: next.reviewCount },
      });
    });

    return this.getView(errorId);
  }

  registerRecurrence(errorId, questionId) {
    const view = this.getView(errorId);
    const question = this.#getQuestion(questionId);
    if (question.subjectId !== view.errorRecord.subjectId) {
      throw new TypeError("A questão de reincidência pertence a outro assunto.");
    }
    if (question.result !== "incorrect") {
      throw new TypeError("Uma reincidência exige uma questão respondida incorretamente.");
    }
    if (view.occurrences.some((occurrence) => occurrence.questionId === question.id)) {
      throw new TypeError(
        "Esta questão já representa uma ocorrência deste Registro de Erro.",
      );
    }

    const now = this.clock();
    const occurrence = createErrorOccurrence({
      id: this.idGenerator("occurrence"),
      errorRecordId: errorId,
      question,
      occurredAt: now,
      kind: "recurrence",
    });
    const next = registerErrorRecurrence(view.errorRecord, {
      occurrenceId: occurrence.id,
      questionId: question.id,
      occurredAt: now,
    });

    this.repository.transaction((draft) => {
      draft.collections.errorOccurrences[occurrence.id] = occurrence;
      draft.collections.errorRecords[errorId] = next;
      const draftQuestion = draft.collections.importedQuestions[question.id];
      draftQuestion.errorRecordIds = [
        ...new Set([...(draftQuestion.errorRecordIds ?? []), errorId]),
      ];
      for (const evidenceId of view.errorRecord.evidenceIds) {
        const evidence = draft.collections.errorEvidences[evidenceId];
        if (evidence && !evidence.invalidatedAt) {
          evidence.invalidatedAt = now;
        }
      }
      this.#touchSubject(draft, next.subjectId, now);
      this.#appendEvent(draft, {
        subjectId: next.subjectId,
        entityId: errorId,
        eventType: "recurrence",
        summary: `Reincidência registrada na questão ${question.order}.`,
        now,
        metadata: {
          questionId: question.id,
          recurrenceCount: next.recurrenceCount,
        },
      });
    });

    return this.getView(errorId);
  }

  addCorrectEvidence(errorId, questionId) {
    const view = this.getView(errorId);
    if (view.errorRecord.masteryStatus === "overcome") {
      throw new TypeError(
        "O erro já foi superado. Registre uma reincidência antes de iniciar outra sequência.",
      );
    }
    const question = this.#getQuestion(questionId);
    if (question.subjectId !== view.errorRecord.subjectId) {
      throw new TypeError("A evidência pertence a outro assunto.");
    }
    if (question.result !== "correct") {
      throw new TypeError("A evidência de superação exige uma resposta correta.");
    }

    const validAfterOccurrenceId = view.errorRecord.occurrenceIds.at(-1);
    const activeEvidence = view.evidences.find(
      (evidence) =>
        evidence.questionId === question.id &&
        evidence.validAfterOccurrenceId === validAfterOccurrenceId &&
        !evidence.invalidatedAt,
    );
    if (activeEvidence) {
      throw new TypeError("Esta questão já foi usada na sequência atual de superação.");
    }

    const now = this.clock();
    const evidence = createErrorEvidence({
      id: this.idGenerator("evidence"),
      errorRecordId: errorId,
      question,
      answeredAt: now,
      sequencePosition: view.errorRecord.currentCorrectStreak + 1,
      validAfterOccurrenceId,
    });
    const next = registerCorrectEvidence(view.errorRecord, {
      evidenceId: evidence.id,
      questionId: question.id,
      answeredAt: now,
    });
    const becameOvercome =
      view.errorRecord.masteryStatus !== "overcome" &&
      next.masteryStatus === "overcome";

    this.repository.transaction((draft) => {
      draft.collections.errorEvidences[evidence.id] = evidence;
      draft.collections.errorRecords[errorId] = next;
      const draftQuestion = draft.collections.importedQuestions[question.id];
      draftQuestion.errorRecordIds = [
        ...new Set([...(draftQuestion.errorRecordIds ?? []), errorId]),
      ];
      this.#touchSubject(draft, next.subjectId, now);
      this.#appendEvent(draft, {
        subjectId: next.subjectId,
        entityId: errorId,
        eventType: becameOvercome ? "error_overcome" : "evidence_added",
        summary: becameOvercome
          ? "Erro superado após duas respostas corretas consecutivas."
          : "Primeira evidência correta registrada; falta mais uma consecutiva.",
        now,
        metadata: {
          questionId: question.id,
          currentCorrectStreak: next.currentCorrectStreak,
        },
      });
    });

    return this.getView(errorId);
  }

  getView(errorId) {
    const errorRecord = this.repository.getEntity("errorRecords", errorId);
    if (!errorRecord) {
      throw new RangeError("Registro de Erro não encontrado.");
    }
    const validation = validateErrorRecord(errorRecord);
    if (!validation.valid) {
      throw new TypeError(validation.errors.join(" "));
    }

    const record = this.repository.getEntity("records", errorRecord.recordId);
    if (!record) {
      throw new RangeError("Record base do erro não encontrado.");
    }
    const recordValidation = validateRecord(record);
    if (!recordValidation.valid) {
      throw new TypeError(recordValidation.errors.join(" "));
    }

    const primaryQuestion = this.#getQuestion(errorRecord.primaryQuestionId);
    const linkedQuestions = errorRecord.linkedQuestionIds.map((id) =>
      this.#getQuestion(id),
    );
    const occurrences = errorRecord.occurrenceIds.map((id) => {
      const occurrence = this.repository.getEntity("errorOccurrences", id);
      if (!occurrence) {
        throw new RangeError(`Ocorrência de erro não encontrada: ${id}.`);
      }
      const occurrenceValidation = validateErrorOccurrence(occurrence);
      if (!occurrenceValidation.valid) {
        throw new TypeError(occurrenceValidation.errors.join(" "));
      }
      return occurrence;
    });
    const evidences = errorRecord.evidenceIds.map((id) => {
      const evidence = this.repository.getEntity("errorEvidences", id);
      if (!evidence) {
        throw new RangeError(`Evidência de erro não encontrada: ${id}.`);
      }
      const evidenceValidation = validateErrorEvidence(evidence);
      if (!evidenceValidation.valid) {
        throw new TypeError(evidenceValidation.errors.join(" "));
      }
      return evidence;
    });
    const linkedRecords = errorRecord.linkedRecordIds
      .map((id) => this.repository.getEntity("records", id))
      .filter(Boolean);

    return Object.freeze({
      record,
      errorRecord,
      primaryQuestion,
      linkedQuestions,
      linkedRecords,
      occurrences,
      evidences,
      category: errorCategory(errorRecord),
    });
  }

  listViewsBySubject(subjectId, { archived = false } = {}) {
    const records = this.repository.getCollection("records");
    return Object.values(this.repository.getCollection("errorRecords"))
      .filter((errorRecord) => errorRecord.subjectId === subjectId)
      .filter((errorRecord) =>
        Boolean(records[errorRecord.recordId]?.archivedAt) === archived,
      )
      .map((errorRecord) => this.getView(errorRecord.id))
      .sort(compareViews);
  }

  getAggregate(subjectId) {
    const views = this.listViewsBySubject(subjectId);
    return Object.freeze({
      total: views.length,
      pending: views.filter((view) => view.category === "pending").length,
      recurrent: views.filter((view) => view.category === "recurrent").length,
      reviewed: views.filter((view) => view.category === "reviewed").length,
      overcome: views.filter((view) => view.category === "overcome").length,
      analyzed: views.filter((view) => view.errorRecord.analysis.isComplete).length,
    });
  }

  getLinkOptions(subjectId, currentRecordId) {
    return Object.values(this.repository.getCollection("records"))
      .filter((record) => record.subjectId === subjectId)
      .filter((record) => record.id !== currentRecordId)
      .filter((record) => ["summary", "note"].includes(record.type))
      .sort(
        (a, b) =>
          Number(Boolean(a.archivedAt)) - Number(Boolean(b.archivedAt)) ||
          b.updatedAt.localeCompare(a.updatedAt),
      );
  }

  getEvidenceCandidates(errorId, kind) {
    const view = this.getView(errorId);
    const result = kind === "recurrence" ? "incorrect" : "correct";
    const currentWindow = view.errorRecord.occurrenceIds.at(-1);
    const usedQuestionIds = new Set(
      view.evidences
        .filter(
          (evidence) =>
            evidence.validAfterOccurrenceId === currentWindow &&
            !evidence.invalidatedAt,
        )
        .map((evidence) => evidence.questionId),
    );
    const occurrenceQuestionIds = new Set(
      view.occurrences.map((occurrence) => occurrence.questionId),
    );
    const sessions = this.repository.getCollection("importedSessions");

    return Object.values(this.repository.getCollection("importedQuestions"))
      .filter((question) => question.subjectId === view.errorRecord.subjectId)
      .filter((question) => question.result === result)
      .filter((question) =>
        kind === "recurrence"
          ? !occurrenceQuestionIds.has(question.id)
          : !usedQuestionIds.has(question.id),
      )
      .map((question) => ({
        question,
        session: sessions[question.sessionId],
      }))
      .sort(
        (a, b) =>
          b.session.sessionDate.localeCompare(a.session.sessionDate) ||
          a.question.order - b.question.order,
      );
  }

  #getQuestion(questionId) {
    const question = this.repository.getEntity("importedQuestions", questionId);
    if (!question) {
      throw new RangeError("Questão importada não encontrada.");
    }
    return question;
  }

  #getSession(sessionId) {
    const session = this.repository.getEntity("importedSessions", sessionId);
    if (!session) {
      throw new RangeError("Sessão importada não encontrada.");
    }
    return session;
  }

  #assertLinkedRecords(subjectId, linkedRecordIds, currentRecordId) {
    for (const linkedRecordId of [...new Set(linkedRecordIds)]) {
      const linkedRecord = this.repository.getEntity("records", linkedRecordId);
      if (!linkedRecord) {
        throw new RangeError("Um registro vinculado não foi encontrado.");
      }
      if (linkedRecord.id === currentRecordId) {
        throw new TypeError("O Registro de Erro não pode vincular a si mesmo.");
      }
      if (linkedRecord.subjectId !== subjectId) {
        throw new TypeError("Registros de outros assuntos não podem ser vinculados.");
      }
      if (!["summary", "note"].includes(linkedRecord.type)) {
        throw new TypeError("Somente Resumos e Anotações podem ser vinculados ao erro.");
      }
    }
  }

  #touchSubject(draft, subjectId, now) {
    const subject = draft.collections.subjects[subjectId];
    if (!subject) {
      throw new RangeError("Assunto do Registro de Erro não encontrado.");
    }
    subject.lastActivityAt = now;
    subject.updatedAt = now;
  }

  #appendEvent(
    draft,
    { subjectId, entityId, eventType, summary, now, origin = "user", metadata = null },
  ) {
    const id = this.idGenerator("history");
    draft.collections.historyEvents[id] = {
      id,
      subjectId,
      entityType: "error_record",
      entityId,
      eventType,
      occurredAt: now,
      summary,
      metadata,
      origin,
      appVersion: this.appVersion,
      entityVersion: 1,
    };
  }
}

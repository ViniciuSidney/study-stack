import {
  createSubjectFromContext,
  mergeSubjectWithContext,
  validateSubject,
} from "../domain/subject.js";

function createHistoryEvent(subject, now, appVersion) {
  return {
    id: `history-subject-${subject.id}-${now}`,
    subjectId: subject.id,
    entityType: "subject",
    entityId: subject.id,
    eventType: "created",
    occurredAt: now,
    summary: "Assunto conectado ao Study Stack.",
    metadata: {
      sourceContractVersion: subject.sourceContractVersion,
    },
    origin: "concept_compass",
    appVersion,
    entityVersion: 1,
  };
}

export class SubjectService {
  constructor({ repository, clock, appVersion }) {
    this.repository = repository;
    this.clock = clock;
    this.appVersion = appVersion;
  }

  synchronize(context) {
    if (!context?.valid) {
      return null;
    }

    const now = this.clock();
    const existing = this.repository.getEntity(
      "subjects",
      context.subjectId,
    );
    const result = existing
      ? mergeSubjectWithContext(existing, context, now)
      : {
          subject: createSubjectFromContext(context, now),
          changed: true,
        };

    const validation = validateSubject(result.subject);

    if (!validation.valid) {
      throw new TypeError(validation.errors.join(" "));
    }

    this.repository.transaction((draft) => {
      if (result.changed) {
        draft.collections.subjects[result.subject.id] = result.subject;
      }

      if (!existing) {
        const event = createHistoryEvent(
          result.subject,
          now,
          this.appVersion,
        );
        draft.collections.historyEvents[event.id] = event;
      }

      const integration = draft.collections.integrationState.global;
      integration.conceptCompass = {
        ...integration.conceptCompass,
        status: "connected",
        lastContractVersion: context.contractVersion,
        lastSubjectId: context.subjectId,
        lastReceivedAt: context.sentAt || now,
        lastIssue: null,
      };
      integration.updatedAt = now;
    });

    return this.repository.getEntity("subjects", context.subjectId);
  }

  registerContextIssue(context) {
    const now = this.clock();

    this.repository.transaction((draft) => {
      const integration = draft.collections.integrationState.global;
      integration.conceptCompass = {
        ...integration.conceptCompass,
        status: "invalid_context",
        lastContractVersion: context?.contractVersion || null,
        lastReceivedAt: now,
        lastIssue: context?.errors?.join(" ") || "Contexto ausente.",
      };
      integration.updatedAt = now;
    });
  }
}

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

function getDeletionTombstone(repository, subjectId) {
  const integration = repository.getEntity("integrationState", "global");
  return integration?.conceptCompass?.deletedSubjects?.[subjectId] ?? null;
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
    const deletionTombstone = getDeletionTombstone(this.repository, context.subjectId);

    if (deletionTombstone) {
      this.repository.transaction((draft) => {
        const integration = draft.collections.integrationState.global;
        integration.conceptCompass = {
          ...integration.conceptCompass,
          status: "deleted_subject",
          lastContractVersion: context.contractVersion,
          lastSubjectId: null,
          lastReceivedAt: context.sentAt || now,
          lastIssue:
            "O Assunto informado foi excluído definitivamente no Concept Compass e não pode ser recriado com o mesmo ID.",
        };
        integration.updatedAt = now;
      });
      return null;
    }

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

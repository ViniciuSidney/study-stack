import {
  hasOverviewContent,
  updateSubjectOverview,
  validateSubject,
} from "../domain/subject.js";
import { createId } from "../utils/id.js";

export class OverviewService {
  constructor({ repository, clock, appVersion, idGenerator = createId }) {
    this.repository = repository;
    this.clock = clock;
    this.appVersion = appVersion;
    this.idGenerator = idGenerator;
  }

  getView(subjectId) {
    const subject = this.#getRequiredSubject(subjectId);

    return Object.freeze({
      subject,
      hasContent: hasOverviewContent(subject),
    });
  }

  update(subjectId, input) {
    const current = this.#getRequiredSubject(subjectId);
    const now = this.clock();
    const next = updateSubjectOverview(current, input, now);
    const stateChanged = next.studyState !== current.studyState;

    this.repository.transaction((draft) => {
      draft.collections.subjects[subjectId] = next;
      this.#appendEvent(draft, {
        subjectId,
        eventType: "overview_updated",
        summary: "Visão Geral do assunto atualizada.",
        now,
      });

      if (stateChanged) {
        this.#appendEvent(draft, {
          subjectId,
          eventType: "study_state_changed",
          summary: "Estado de estudo do assunto alterado.",
          now,
          metadata: {
            previousState: current.studyState,
            nextState: next.studyState,
          },
        });
      }
    });

    return this.getView(subjectId);
  }

  #getRequiredSubject(subjectId) {
    const subject = this.repository.getEntity("subjects", subjectId);

    if (!subject) {
      throw new RangeError("Assunto não encontrado.");
    }

    const validation = validateSubject(subject);
    if (!validation.valid) {
      throw new TypeError(validation.errors.join(" "));
    }

    return subject;
  }

  #appendEvent(
    draft,
    { subjectId, eventType, summary, now, metadata = null },
  ) {
    const id = this.idGenerator("history");
    draft.collections.historyEvents[id] = {
      id,
      subjectId,
      entityType: "subject",
      entityId: subjectId,
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

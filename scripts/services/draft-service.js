function clone(value) {
  return structuredClone(value);
}

function createDraftId(recordType, recordId) {
  return `draft-${recordType}-${recordId}`;
}

export class DraftService {
  constructor({ repository, clock }) {
    this.repository = repository;
    this.clock = clock;
  }

  get(recordType, recordId) {
    return this.repository.getEntity(
      "draftBuffers",
      createDraftId(recordType, recordId),
    );
  }

  save({
    subjectId,
    recordId,
    recordType,
    modalInstanceId,
    originalState,
    workingState,
  }) {
    if (!subjectId || !recordId || !recordType || !modalInstanceId) {
      throw new TypeError("O buffer de edição exige contexto completo.");
    }

    const now = this.clock();
    const id = createDraftId(recordType, recordId);
    const existing = this.repository.getEntity("draftBuffers", id);
    const expiresAt = new Date(
      Date.parse(now) + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const buffer = {
      id,
      subjectId,
      recordId,
      recordType,
      modalInstanceId,
      originalState: existing?.originalState ?? clone(originalState),
      workingState: clone(workingState),
      saveState: "saved",
      lastSavedAt: now,
      expiresAt,
      errorSummary: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      entityVersion: 1,
    };

    this.repository.upsertEntity("draftBuffers", buffer);
    return clone(buffer);
  }

  remove(recordType, recordId) {
    const id = createDraftId(recordType, recordId);

    if (!this.repository.getEntity("draftBuffers", id)) {
      return false;
    }

    this.repository.transaction((draft) => {
      delete draft.collections.draftBuffers[id];
    });

    return true;
  }
}

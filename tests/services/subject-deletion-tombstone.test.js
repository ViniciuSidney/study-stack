import assert from "node:assert/strict";
import test from "node:test";

import { SubjectService } from "../../scripts/services/subject-service.js";

test("Subject excluído definitivamente não é recriado por um contexto antigo", () => {
  const integration = {
    id: "global",
    conceptCompass: {
      status: "subject_deleted",
      lastSubjectId: null,
      deletedSubjects: {
        "subject-1": {
          subjectId: "subject-1",
          commandId: "cmd-1",
          deletedAt: "2026-08-07T20:00:00.000Z",
        },
      },
    },
    updatedAt: "2026-08-07T20:00:00.000Z",
  };
  let subjectRead = false;
  const repository = {
    getEntity(collection, id) {
      if (collection === "integrationState" && id === "global") return structuredClone(integration);
      if (collection === "subjects") subjectRead = true;
      return null;
    },
    transaction(mutator) {
      const draft = { collections: { integrationState: { global: integration } } };
      mutator(draft);
      return { result: null };
    },
  };
  const service = new SubjectService({
    repository,
    clock: () => "2026-08-07T20:01:00.000Z",
    appVersion: "0.1.1",
  });

  const result = service.synchronize({
    valid: true,
    subjectId: "subject-1",
    contractVersion: "1.0.0",
    sentAt: "2026-08-07T20:00:30.000Z",
  });

  assert.equal(result, null);
  assert.equal(subjectRead, false);
  assert.equal(integration.conceptCompass.status, "deleted_subject");
  assert.match(integration.conceptCompass.lastIssue, /excluído definitivamente/);
});

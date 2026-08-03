import test from "node:test";
import assert from "node:assert/strict";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { normalizeSubjectContext } from "../../scripts/domain/subject-context.js";
import { OverviewService } from "../../scripts/services/overview-service.js";
import { SubjectService } from "../../scripts/services/subject-service.js";
import { LocalStorageAdapter } from "../../scripts/storage/local-storage-adapter.js";
import { MigrationRunner } from "../../scripts/storage/migrations/migration-runner.js";
import { StateRepository } from "../../scripts/storage/state-repository.js";
import { createInitialState } from "../../scripts/storage/state-schema.js";
import { MemoryStorage } from "../fixtures/memory-storage.js";
import { VALID_SUBJECT_CONTEXT } from "../fixtures/subject-context.js";

function setup() {
  let tick = 0;
  let idTick = 0;
  const clock = () =>
    `2026-08-03T11:${String(tick++).padStart(2, "0")}:00.000Z`;
  const repository = new StateRepository({
    storage: new LocalStorageAdapter(new MemoryStorage(), "study-stack"),
    config: APP_CONFIG,
    createInitialState,
    migrationRunner: new MigrationRunner(APP_CONFIG.storage.schemaVersion),
    clock,
  });
  repository.initialize();
  const subjectService = new SubjectService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
  });
  const subject = subjectService.synchronize(
    normalizeSubjectContext(VALID_SUBJECT_CONTEXT),
  );
  const service = new OverviewService({
    repository,
    clock,
    appVersion: APP_CONFIG.appVersion,
    idGenerator: (prefix) => `${prefix}-${++idTick}`,
  });
  return { repository, subject, service };
}

test("salva campos manuais e estado do assunto", () => {
  const { repository, subject, service } = setup();
  const view = service.update(subject.id, {
    studyState: "in_practice",
    overview: {
      nextStep: "Resolver 20 questões.",
      mainDifficulty: "Níveis tróficos.",
      currentPerception: "Base compreendida.",
      progressObservation: "Melhorei na interpretação.",
      perceivedMastery: "60",
    },
  });

  assert.equal(view.subject.studyState, "in_practice");
  assert.equal(view.subject.overview.nextStep.plainText, "Resolver 20 questões.");
  assert.equal(view.subject.overview.perceivedMastery, 60);
  assert.ok(view.subject.lastActivityAt);
  assert.equal(
    Object.values(repository.getCollection("historyEvents")).some(
      (event) => event.eventType === "overview_updated",
    ),
    true,
  );
});

test("rejeita domínio percebido fora do intervalo", () => {
  const { subject, service } = setup();

  assert.throws(
    () =>
      service.update(subject.id, {
        overview: { perceivedMastery: "140" },
      }),
    /entre 0 e 100/,
  );
});

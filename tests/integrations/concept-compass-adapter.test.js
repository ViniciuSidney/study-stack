import test from "node:test";
import assert from "node:assert/strict";

import { APP_CONFIG } from "../../scripts/config/app-config.js";
import { ConceptCompassAdapter } from "../../scripts/integrations/concept-compass-adapter.js";

function locationFrom(url) {
  return new URL(url);
}

test("lê contexto real por parâmetros de URL", () => {
  const params = new URLSearchParams({
    contractVersion: "1.0.0",
    sentAt: "2026-08-02T21:00:00.000Z",
    sourceApp: "concept_compass",
    matterId: "matter-biology",
    matterName: "Biologia",
    themeId: "theme-ecology",
    themeName: "Ecologia",
    subjectId: "subject-food-webs",
    subjectName: "Cadeias alimentares",
    sourceArchived: "false",
    returnUrl: "https://viniciusidney.github.io/concept-compass/#/",
  });
  const context = ConceptCompassAdapter.resolveSubjectContext(
    locationFrom(`https://viniciusidney.github.io/study-stack/?${params}`),
    APP_CONFIG,
  );

  assert.equal(context.valid, true);
  assert.equal(context.subjectId, "subject-food-webs");
  assert.equal(context.source, "concept-compass-query");
});

test("remove returnUrl de origem não permitida", () => {
  const envelope = {
    ...APP_CONFIG.developmentSubject,
    returnUrl: "https://example.com/phishing",
  };
  const params = new URLSearchParams({
    subjectContext: JSON.stringify(envelope),
  });
  const context = ConceptCompassAdapter.resolveSubjectContext(
    locationFrom(`https://viniciusidney.github.io/study-stack/?${params}`),
    APP_CONFIG,
  );

  assert.equal(context.valid, true);
  assert.equal(context.returnUrl, "");
});

test("contexto inválido permanece inválido fora do ambiente local", () => {
  const context = ConceptCompassAdapter.resolveSubjectContext(
    locationFrom("https://viniciusidney.github.io/study-stack/"),
    APP_CONFIG,
  );

  assert.equal(context.valid, false);
  assert.equal(context.source, "invalid-concept-compass-context");
});

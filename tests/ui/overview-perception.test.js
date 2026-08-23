import assert from "node:assert/strict";
import test from "node:test";

import {
  getPerceivedMasteryPresentation,
} from "../../scripts/ui/sections/overview-section.js";

test("percepção numérica antiga é apresentada em escala qualitativa", () => {
  const fragile = getPerceivedMasteryPresentation(0);
  const safe = getPerceivedMasteryPresentation(75);

  assert.equal(fragile.informed, true);
  assert.equal(fragile.value, 0);
  assert.equal(fragile.normalizedValue, 20);
  assert.equal(fragile.displayValue, "Muito frágil");

  assert.equal(safe.informed, true);
  assert.equal(safe.value, 75);
  assert.equal(safe.normalizedValue, 80);
  assert.equal(safe.displayValue, "Seguro");
});

test("percepção pessoal ausente continua explícita", () => {
  for (const value of [null, undefined, ""]) {
    const presentation = getPerceivedMasteryPresentation(value);
    assert.equal(presentation.informed, false);
    assert.equal(presentation.value, null);
    assert.equal(presentation.normalizedValue, null);
    assert.equal(presentation.displayValue, "Não informado");
  }
});

test("escala qualitativa preserva os extremos válidos do domínio", () => {
  assert.equal(
    getPerceivedMasteryPresentation(20).displayValue,
    "Muito frágil",
  );
  assert.equal(
    getPerceivedMasteryPresentation(100).displayValue,
    "Muito seguro",
  );
});

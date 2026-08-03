import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  getPerceivedMasteryPresentation,
} from "../../scripts/ui/sections/overview-section.js";

const componentsCssUrl = new URL("../../styles/components.css", import.meta.url);

test("domínio percebido igual a zero continua visível como percepção pessoal", () => {
  const presentation = getPerceivedMasteryPresentation(0);

  assert.equal(presentation.informed, true);
  assert.equal(presentation.value, 0);
  assert.equal(presentation.displayValue, "0%");
});

test("percepção pessoal ausente possui estado explícito", () => {
  const presentation = getPerceivedMasteryPresentation(null);

  assert.equal(presentation.informed, false);
  assert.equal(presentation.value, null);
  assert.equal(presentation.displayValue, "Não informado");
});

test("Visão Geral apresenta a percepção pessoal como indicador compacto", async () => {
  const css = await readFile(fileURLToPath(componentsCssUrl), "utf8");

  assert.match(css, /\.overview-progress-meta\s*\{/);
  assert.match(css, /\.overview-personal-perception\s*\{/);
  assert.match(css, /border-radius:\s*999px/);
  assert.match(css, /\.overview-personal-track\s*\{/);
  assert.match(css, /height:\s*4px/);
  assert.match(css, /\.overview-personal-fill\s*\{/);
});

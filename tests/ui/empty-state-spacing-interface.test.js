import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("Exercícios e Registros de Erro compartilham o mesmo ritmo do estado vazio", async () => {
  const css = await read("../../styles/record-cards.css");

  assert.match(
    css,
    /\.exercise-empty-state h3 \+ p,\s*\.error-empty-state h3 \+ p \{\s*margin-top: 8px;/,
  );
  assert.match(
    css,
    /\.exercise-empty-state p \+ \.button,\s*\.error-empty-state p \+ \.button \{\s*margin-top: 14px;/,
  );
});

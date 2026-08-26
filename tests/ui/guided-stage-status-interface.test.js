import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("etapas sem badge explícito recebem estado visual", async () => {
  const css = await read("../../styles/overview-refinements.css");

  assert.match(css, /\.guided-flow-badges:empty::before\s*\{[\s\S]*content:\s*"Disponível"/);
  assert.match(
    css,
    /\.guided-flow-detail-copy:has\(\.guided-flow-blocked-reason\)[\s\S]*\.guided-flow-badges:empty::before\s*\{[\s\S]*content:\s*"Ainda não desbloqueada"/,
  );
});

test("estados atuais e concluídos continuam sendo pills reais do roteiro", async () => {
  const source = await read("../../scripts/ui/sections/overview-section.js");
  const components = await read("../../styles/components.css");

  assert.match(source, /text:\s*"Etapa atual"/);
  assert.match(source, /className:\s*"complete",\s*text:\s*"Concluída"/);
  assert.match(components, /\.guided-flow-badges \.complete/);
});

test("roteiro preserva a leitura em largura intermediária com sidebar aberta", async () => {
  const css = await read("../../styles/overview-refinements.css");

  assert.match(css, /@media \(min-width: 900px\) and \(max-width: 1280px\)/);
  assert.match(
    css,
    /\.app-shell:not\(\.sidebar-collapsed\) \.guided-flow-detail\s*\{[\s\S]*grid-template-columns:\s*1fr/,
  );
  assert.match(
    css,
    /\.app-shell:not\(\.sidebar-collapsed\) \.guided-flow-actions\s*\{[\s\S]*max-width:\s*none[\s\S]*justify-content:\s*flex-end/,
  );
});

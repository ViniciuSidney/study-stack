import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("tela de confirmação exige ação explícita e respeita movimento reduzido", async () => {
  const source = await read("../../scripts/ui/action-confirmation-screen.js");
  const css = await read("../../styles/action-confirmation-screen.css");

  assert.match(source, /aria-modal/);
  assert.match(source, /confirmLabel = "Confirmar"/);
  assert.match(source, /confirmButton\.addEventListener\("click", close\)/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /dataset\.reducedMotion === "true"/);
  assert.match(css, /\.action-confirmation-screen\.is-visible/);
  assert.match(css, /\.action-confirmation-screen\.is-leaving/);
  assert.match(css, /html\[data-reduced-motion="true"\]/);
});

test("restauração, preferências e recuperação usam a tela de conclusão", async () => {
  const source = await read("../../scripts/action-confirmation-controller.js");

  assert.match(source, /Padrões restaurados/);
  assert.match(source, /Dados substituídos/);
  assert.match(source, /Dados adicionados aos existentes/);
  assert.match(source, /Estado anterior recuperado/);
  assert.match(source, /onConfirm: \(\) => this\.window\.location\.reload\(\)/);
});

test("ações da zona de risco aguardam confirmação visual antes do recarregamento", async () => {
  const source = await read("../../scripts/data-reset-controller.js");
  const loader = await read("../../styles/data-reset.css");

  assert.match(source, /Dados de estudo excluídos/);
  assert.match(source, /Study Stack redefinido/);
  assert.match(source, /openActionConfirmationScreen/);
  assert.match(source, /onConfirm: \(\) => this\.window\.location\.reload\(\)/);
  assert.match(loader, /@import url\("\.\/action-confirmation-screen\.css"\)/);
});

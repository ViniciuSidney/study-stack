import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("Visão Geral apresenta roteiro consultável com avanço manual", async () => {
  const source = await read("../../scripts/ui/sections/overview-section.js");

  assert.match(source, /Roteiro para consolidar/);
  assert.match(source, /role: "tablist"/);
  assert.match(source, /Etapa atual/);
  assert.match(source, /Recomendada/);
  assert.match(source, /Tornar etapa atual/);
  assert.match(source, /Prosseguir para/);
  assert.match(source, /Voltar para/);
  assert.match(source, /Como conquistar estes pontos\?/);
  assert.match(source, /guided-flow-progress-summary/);
  assert.match(source, /guided-flow-stage-progress-track/);
  assert.doesNotMatch(source, /Detalhes das cinco categorias/);
  assert.doesNotMatch(source, /categoryGrid\.hidden/);
});

test("ações externas preservam o Study Stack e enviam o contexto ao Test Quest", async () => {
  const app = await read("../../scripts/app.js");

  assert.match(app, /openTestQuestForSubject/);
  assert.match(app, /url\.searchParams\.set\("subjectId"/);
  assert.match(app, /url\.searchParams\.set\("matterId"/);
  assert.match(app, /url\.searchParams\.set\("themeId"/);
  assert.match(app, /url\.searchParams\.set\("returnUrl"/);
  assert.match(app, /anchor\.target = "_blank"/);
  assert.match(app, /anchor\.rel = "noopener noreferrer"/);
  assert.match(app, /anchor\.click\(\)/);
});

test("modais explicam pontos, caminho sem erros e consolidação consciente", async () => {
  const help = await read("../../scripts/ui/modals/flow-stage-help-modal.js");
  const metacognitive = await read(
    "../../scripts/ui/modals/metacognitive-review-modal.js",
  );
  const consolidation = await read(
    "../../scripts/ui/modals/consolidation-modal.js",
  );

  assert.match(help, /Evidências já conquistadas/);
  assert.match(help, /O que ainda falta/);
  assert.match(metacognitive, /Verificar acertos difíceis/);
  assert.match(metacognitive, /Isso não cria um erro fictício/);
  assert.match(metacognitive, /Evidência histórica/);
  assert.match(consolidation, /nove pontos/);
  assert.match(consolidation, /Revisei as evidências/);
  assert.match(consolidation, /Confirmar consolidação/);
});

test("roteiro e novos modais possuem layout rolável e responsivo", async () => {
  const css = await read("../../styles/components.css");
  const responsive = await read("../../styles/responsive.css");

  assert.match(css, /\.guided-flow-panel\s*\{/);
  assert.match(css, /\.guided-flow-navigation\s*\{/);
  assert.match(css, /\.guided-flow-progress-summary\s*\{/);
  assert.match(css, /\.guided-flow-detail\s*\{/);
  assert.match(css, /\.guided-flow-stage-progress-track\s*\{/);
  assert.match(css, /\.guided-flow-system-notice\s*\{/);
  assert.match(css, /\.flow-help-body,[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.metacognitive-check\.inactive\s*\{/);
  assert.match(responsive, /Foundation 10: Guided consolidation flow/);
  assert.match(responsive, /\.guided-flow-system-notice[\s\S]*flex-direction:\s*column/);
});


test("trilha compacta as cinco etapas pela largura real do componente", async () => {
  const css = await read("../../styles/components.css");
  const responsive = await read("../../styles/responsive.css");

  assert.match(css, /\.guided-flow-panel\s*\{[\s\S]*container-name:\s*guided-flow-panel/);
  assert.match(css, /\.guided-flow-track-wrap\s*\{[\s\S]*container-name:\s*guided-flow-track/);
  assert.match(css, /\.guided-flow-track\s*\{[\s\S]*min-width:\s*0/);
  assert.match(css, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  assert.doesNotMatch(css, /\.guided-flow-track\s*\{[^}]*min-width:\s*680px/s);
  assert.match(responsive, /@container guided-flow-track \(max-width:\s*640px\)/);
  assert.match(responsive, /@container guided-flow-track \(max-width:\s*500px\)/);
  assert.match(responsive, /@container guided-flow-panel \(max-width:\s*760px\)/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("ajuda das etapas usa estados claros do estudo", async () => {
  const source = await read("../../scripts/ui/modals/flow-stage-help-modal.js");

  assert.match(source, /Ainda não iniciada/);
  assert.match(source, /Em andamento/);
  assert.match(source, /Concluída/);
  assert.match(source, /Aguardando etapa anterior/);
  assert.doesNotMatch(source, /Etapa em construção/);
});

test("dependências citam somente a etapa imediatamente anterior", async () => {
  const source = await read("../../scripts/ui/modals/flow-stage-help-modal.js");

  assert.match(source, /Conclua a Base para avançar até esta etapa\./);
  assert.match(source, /Conclua a Prática para avançar até esta etapa\./);
  assert.match(source, /Conclua a Análise para avançar até esta etapa\./);
  assert.match(source, /Conclua a Revisão para avançar até esta etapa\./);
  assert.doesNotMatch(source, /e as etapas anteriores/);
});

test("modal transforma pendências em checklist e compacta evidências vazias", async () => {
  const source = await read("../../scripts/ui/modals/flow-stage-help-modal.js");

  assert.match(source, /Checklist da etapa/);
  assert.match(source, /flow-help-checklist/);
  assert.match(source, /Concluído.*Pendente|Pendente.*Concluído/s);
  assert.match(source, /Nenhuma evidência registrada ainda\./);
  assert.match(source, /flow-help-empty-evidence/);
  assert.match(source, /if \(stage\.evidence\.length\)/);
  assert.match(source, /Evidências já conquistadas/);
});

test("Base explicita seus dois pontos", async () => {
  const source = await read("../../scripts/ui/modals/flow-stage-help-modal.js");

  assert.match(source, /Concluir um Resumo com conteúdo\./);
  assert.match(source, /Confirmar o Resumo concluído como estudado\./);
});

test("Prática usa linguagem simples, progresso em três listas e critérios sob demanda", async () => {
  const source = await read("../../scripts/ui/modals/flow-stage-help-modal.js");

  assert.match(
    source,
    /Conclua listas no Test Quest e salve os resultados no Study Stack\./,
  );
  assert.match(source, /listas registradas/);
  assert.match(source, /Salvar o \$\{position\}º resultado de uma lista concluída/);
  assert.match(source, /Ver critérios de uma lista válida/);
  assert.match(source, /flow-help-criteria-summary/);
  assert.match(source, /flow-help-criteria-content/);
  assert.match(source, /pelo menos 15 questões respondidas/);
});

test("Análise explica os dois pontos e a alternativa metacognitiva", async () => {
  const source = await read("../../scripts/ui/modals/flow-stage-help-modal.js");

  assert.match(source, /Conclua duas análises/);
  assert.match(source, /verificação metacognitiva de acerto difícil/);
  assert.match(source, /Quando não houver erros suficientes/);
  assert.match(source, /Ela cumpre a mesma função de análise consciente/);
});

test("Revisão separa revisão inicial e confirmação posterior", async () => {
  const source = await read("../../scripts/ui/modals/flow-stage-help-modal.js");

  assert.match(source, /Revisar uma análise concluída para conquistar o primeiro ponto\./);
  assert.match(source, /Confirmar posteriormente que a compreensão foi mantida\./);
});

test("Consolidação mantém a ação visível e bloqueada até liberar os nove pontos", async () => {
  const source = await read("../../scripts/ui/modals/flow-stage-help-modal.js");

  assert.match(source, /Alcançar 9\/9 pontos nas quatro etapas anteriores\./);
  assert.match(source, /text: stage\.complete \? "Consolidação confirmada" : "Confirmar consolidação"/);
  assert.match(source, /consolidationButton\.disabled = !stage\.canBecomeCurrent \|\| stage\.complete/);
  assert.match(source, /Disponível ao alcançar 9\/9 pontos nas etapas anteriores\./);
  assert.match(source, /type: "confirm_consolidation"/);
});

test("painel principal usa a mesma linguagem simplificada do roteiro", async () => {
  const source = await read("../../scripts/ui/sections/overview-section.js");

  assert.match(
    source,
    /Conclua listas no Test Quest e salve os resultados no Study Stack\./,
  );
  assert.match(source, /Conclua a Base para avançar até esta etapa\./);
  assert.match(source, /Conclua a Prática para avançar até esta etapa\./);
  assert.match(source, /Conclua a Análise para avançar até esta etapa\./);
  assert.match(source, /Conclua a Revisão para avançar até esta etapa\./);
  assert.match(source, /stage\.key === "practice"/);
  assert.match(source, /getGuidedStageProgress\(stage\)/);
  assert.match(source, /getGuidedStageNote\(stage\)/);
  assert.match(source, /getGuidedStageDependency\(stage\)/);
});

test("painel principal mantém confirmação de consolidação visível antes de 9/9", async () => {
  const source = await read("../../scripts/ui/sections/overview-section.js");

  assert.match(source, /stage\.key === "consolidation" && !stage\.complete/);
  assert.match(source, /label: "Confirmar consolidação"/);
  assert.match(source, /consolidationButton\.disabled = !stage\.canBecomeCurrent/);
  assert.match(source, /Disponível ao alcançar 9\/9 pontos nas etapas anteriores\./);
  assert.match(source, /type: "confirm_consolidation"/);
});

test("modal do roteiro dá respiro a evidências vazias e avisos de bloqueio", async () => {
  const source = await read("../../scripts/ui/modals/flow-stage-help-modal.js");
  const css = await read("../../styles/overview-refinements.css");

  assert.match(source, /flow-help-checklist-section/);
  assert.match(source, /flow-help-empty-evidence/);
  assert.match(source, /flow-help-blocked-warning/);
  assert.match(css, /\.flow-help-score \+ \.flow-help-blocked-warning\s*\{[\s\S]*margin-top:\s*14px/);
  assert.match(css, /\.flow-help-checklist-section \+ \.flow-help-empty-evidence\s*\{[\s\S]*margin-top:\s*12px/);
});

test("critérios de lista válida usam disclosure estilizado", async () => {
  const source = await read("../../scripts/ui/modals/flow-stage-help-modal.js");
  const css = await read("../../styles/overview-refinements.css");

  assert.match(source, /flow-help-criteria/);
  assert.match(source, /flow-help-criteria-summary/);
  assert.match(source, /flow-help-criteria-content/);
  assert.match(css, /\.flow-help-criteria\s*\{/);
  assert.match(css, /\.flow-help-criteria-summary::before/);
  assert.match(css, /\.flow-help-criteria\[open\] \.flow-help-criteria-summary::before/);
  assert.match(css, /\.flow-help-criteria-content\s*\{/);
});

test("painel oculta Tornar etapa atual e preserva progressão contextual", async () => {
  const source = await read("../../scripts/ui/sections/overview-section.js");
  const css = await read("../../styles/overview-refinements.css");

  assert.match(css, /\.guided-flow-actions > \.button-secondary\s*\{[\s\S]*display:\s*none/);
  assert.match(source, /text: `Prosseguir para \$\{flowView\.recommended\.shortLabel\}`/);
  assert.match(source, /onMakeStageCurrent\(flowView\.recommendedStage\)/);
});

test("etapas bloqueadas priorizam dependência e reduzem informação repetida", async () => {
  const css = await read("../../styles/overview-refinements.css");

  assert.match(css, /\.guided-flow-detail-copy:has\(\.guided-flow-blocked-reason\) \.guided-flow-stage-note\s*\{[\s\S]*display:\s*none/);
  assert.match(css, /\.guided-flow-blocked-reason\s*\{[\s\S]*width:\s*fit-content/);
  assert.match(css, /\.guided-flow-blocked-reason::before\s*\{[\s\S]*content:\s*"🔒"/);
});

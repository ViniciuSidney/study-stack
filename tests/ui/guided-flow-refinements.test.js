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

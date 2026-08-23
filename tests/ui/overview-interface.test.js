import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("Visão Geral prioriza progresso e próximo passo com descrição curta", async () => {
  const source = await read("../../scripts/ui/sections/overview-section.js");

  assert.match(source, /Acompanhe seu progresso e veja o próximo passo deste assunto\./);
  assert.match(source, /Etapa atual:/);
  assert.match(source, /Próximo passo recomendado:/);
  assert.match(source, /guided-flow-progress-summary/);
  assert.doesNotMatch(source, /do caminho atual/);
  assert.doesNotMatch(source, /Math\.round\(\(stage\.activePoints \/ stage\.cap\) \* 100\)/);
});

test("atalhos da Visão Geral continuam clicáveis e deixam a ação evidente", async () => {
  const source = await read("../../scripts/ui/sections/overview-section.js");
  const css = await read("../../styles/overview-refinements.css");

  assert.match(source, /overview-shortcut-card/);
  assert.match(source, /navigate\("summaries"\)/);
  assert.match(source, /navigate\("notes"\)/);
  assert.match(source, /navigate\("errors"\)/);
  assert.match(source, /navigate\("archived"\)/);
  assert.match(css, /\.overview-shortcut-card::after/);
  assert.match(css, /content:\s*"Abrir"/);
  assert.match(css, /cursor:\s*pointer/);
});

test("Reflexão pessoal fica separada do progresso objetivo e possui estado vazio", async () => {
  const source = await read("../../scripts/ui/sections/overview-section.js");

  assert.match(source, /Reflexão pessoal/);
  assert.match(source, /separada do progresso objetivo acima/);
  assert.match(source, /Adicionar reflexão/);
  assert.match(source, /Editar reflexão/);
  assert.match(source, /\.filter\(\(item\) => item\.value\)/);
  assert.match(source, /Segurança no assunto/);
  assert.doesNotMatch(source, /overview-personal-perception/);
});

test("Visão Geral oculta importantes vazios e remove cronologia duplicada", async () => {
  const source = await read("../../scripts/ui/sections/overview-section.js");

  assert.match(source, /if \(importantRecords\.length\)/);
  assert.match(source, /overview-lower-grid \$\{importantRecords\.length \? "" : "single"\}/);
  assert.match(source, /Registros recentes/);
  assert.doesNotMatch(source, /Movimentos recentes/);
  assert.doesNotMatch(source, /createHistoryList/);
  assert.doesNotMatch(source, /recentEvents,/);
});

test("editor usa momento percebido, escala qualitativa e próximos passos", async () => {
  const modal = await read("../../scripts/ui/modals/overview-editor-modal.js");
  const scale = await read("../../scripts/ui/overview-perception.js");

  assert.match(modal, /Momento percebido/);
  assert.match(modal, /Percepção da etapa/);
  assert.match(modal, /Segurança no assunto/);
  assert.match(modal, /Próximos passos/);
  assert.match(modal, /Autoavaliação pessoal\. Ela não altera a pontuação objetiva do assunto\./);
  assert.doesNotMatch(modal, /Domínio percebido \(%\)/);
  assert.match(scale, /Muito frágil/);
  assert.match(scale, /Muito seguro/);
});

test("stylesheet dedicado da Visão Geral é carregado explicitamente", async () => {
  const html = await read("../../index.html");
  assert.match(html, /styles\/overview-refinements\.css/);
});

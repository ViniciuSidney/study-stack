import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appUrl = new URL("../../scripts/app.js", import.meta.url);
const sectionUrl = new URL(
  "../../scripts/ui/sections/errors-section.js",
  import.meta.url,
);
const editorUrl = new URL(
  "../../scripts/ui/modals/error-editor-modal.js",
  import.meta.url,
);
const evidenceUrl = new URL(
  "../../scripts/ui/modals/error-evidence-modal.js",
  import.meta.url,
);
const exerciseModalUrl = new URL(
  "../../scripts/ui/modals/exercise-session-modal.js",
  import.meta.url,
);
const cssUrl = new URL("../../styles/components.css", import.meta.url);
const sharedEditorCssUrl = new URL(
  "../../styles/summary-editor-tabs.css",
  import.meta.url,
);
const responsiveUrl = new URL("../../styles/responsive.css", import.meta.url);

test("rota Erros usa seção e serviços funcionais", async () => {
  const app = await readFile(fileURLToPath(appUrl), "utf8");

  assert.match(app, /sectionId === "errors"/);
  assert.match(app, /renderErrorsSection\(/);
  assert.match(app, /errorService\.listViewsBySubject/);
  assert.match(app, /errorService\.getAggregate/);
  assert.doesNotMatch(app, /renderPlaceholderSection\([^)]*errors/s);
});

test("seção organiza estados e disponibiliza o ciclo completo do erro", async () => {
  const section = await readFile(fileURLToPath(sectionUrl), "utf8");

  assert.match(section, /Reincidentes/);
  assert.match(section, /Pendentes/);
  assert.match(section, /Revisados/);
  assert.match(section, /Superados/);
  assert.match(section, /Analisar erro/);
  assert.match(section, /Marcar revisado/);
  assert.match(section, /Errei de novo/);
  assert.match(section, /Registrar acerto/);
  assert.match(section, /currentCorrectStreak/);
});

test("editor exige causa, regra e prevenção e permite vínculos do assunto", async () => {
  const editor = await readFile(fileURLToPath(editorUrl), "utf8");

  assert.match(editor, /Por que o erro aconteceu\?/);
  assert.match(editor, /Qual é a regra ou o conceito correto\?/);
  assert.match(editor, /Como evitar o mesmo erro\?/);
  assert.match(editor, /Categorias do erro/);
  assert.match(editor, /Vincule Resumos e Anotações do mesmo assunto/);
  assert.match(editor, /Salvar Registro de Erro/);
  assert.match(editor, /Ocorrências e evidências/);
  assert.match(editor, /\["analysis", "Análise"\]/);
  assert.match(editor, /\["context", "Contexto"\]/);
  assert.match(editor, /\["organization", "Organização"\]/);
  assert.match(editor, /\["history", "Histórico"\]/);
  assert.match(editor, /data-error-tab-panel/);
});

test("vínculos do editor de erro acomodam títulos extensos sem scroll horizontal", async () => {
  const css = await readFile(fileURLToPath(sharedEditorCssUrl), "utf8");

  assert.match(css, /\.error-link-list\s*\{[\s\S]*overflow-x:\s*hidden;/);
  assert.match(css, /\.error-link-option\s*\{[\s\S]*min-width:\s*0;/);
  assert.match(css, /\.error-link-option > span\s*\{[\s\S]*min-width:\s*0;/);
  assert.match(
    css,
    /\.error-link-option strong,[\s\S]*overflow-wrap:\s*anywhere;/,
  );
});

test("modal de evidência diferencia reincidência e acerto real", async () => {
  const evidence = await readFile(fileURLToPath(evidenceUrl), "utf8");

  assert.match(evidence, /Registrar que errei de novo/);
  assert.match(evidence, /Registrar resposta correta/);
  assert.match(evidence, /duas respostas corretas distintas e consecutivas/i);
  assert.match(evidence, /Registrar reincidência/);
  assert.match(evidence, /Registrar acerto/);
});

test("lista do Test Quest cria erros somente para questões selecionadas", async () => {
  const modal = await readFile(fileURLToPath(exerciseModalUrl), "utf8");

  assert.match(modal, /error-candidate-selection/);
  assert.match(modal, /Selecionar para criar Registro de Erro/);
  assert.match(modal, /Criar Registros de Erro/);
  assert.match(modal, /onCreateErrors\(questionIds\)/);
  assert.match(modal, /já possui\(em\) registro/);
});


test("editor de erro preserva e recupera rascunhos de análise", async () => {
  const app = await readFile(fileURLToPath(appUrl), "utf8");
  const editor = await readFile(fileURLToPath(editorUrl), "utf8");

  assert.match(app, /draftService\.get\(\s*"error_record"/s);
  assert.match(app, /recordType:\s*"error_record"/);
  assert.match(editor, /Rascunho recuperado/);
  assert.match(editor, /onAutosave/);
  assert.match(editor, /Descartar alterações/);
  assert.match(editor, /saveDraftNow/);
});

test("estados de erro usam superfícies compatíveis com tema escuro", async () => {
  const css = await readFile(fileURLToPath(cssUrl), "utf8");

  assert.match(css, /\.error-card-recurrent\s*\{/);
  assert.match(css, /background:\s*color-mix\(in srgb, var\(--danger-soft\)/);
  assert.match(css, /\.error-card-overcome\s*\{/);
  assert.match(css, /background:\s*color-mix\(in srgb, var\(--success-soft\)/);
  assert.doesNotMatch(css, /\.error-card-(?:recurrent|overcome)[^}]*background:\s*#fff/s);
});

test("seção e modais de erro possuem adaptações responsivas", async () => {
  const responsive = await readFile(fileURLToPath(responsiveUrl), "utf8");

  assert.match(responsive, /Foundation 08: Error Records/);
  assert.match(responsive, /\.error-card-grid\s*\{\s*grid-template-columns:\s*1fr/s);
  assert.match(responsive, /\.error-source-grid/);
  assert.match(responsive, /\.error-editor-modal/);
  assert.match(responsive, /\.error-metrics-grid\s*\{\s*grid-template-columns:\s*1fr/s);
});

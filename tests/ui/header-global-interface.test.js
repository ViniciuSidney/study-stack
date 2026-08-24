import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("cabeçalho usa estado de salvamento humano e preserva Novo registro", async () => {
  const html = await read("../../index.html");
  const shell = await read("../../scripts/ui/app-shell.js");

  assert.match(html, /Preparando dados\.\.\./);
  assert.match(html, /\+ Novo registro/);
  assert.doesNotMatch(html, /Schema 1\.0\.0 · iniciando/);
  assert.match(shell, /\? "Salvo localmente"\s*: "Falha ao salvar"/);
  assert.doesNotMatch(shell, /Schema \$\{schemaVersion\}/);
});

test("etapa e progresso aparecem em um único controle compacto", async () => {
  const html = await read("../../index.html");
  const shell = await read("../../scripts/ui/app-shell.js");
  const css = await read("../../styles/header-global.css");

  assert.match(html, /class="progress-compact subject-progress-summary"/);
  assert.match(
    html,
    /class="subject-progress-stage"\s+id="subjectStatus"\s*>\s*Base inicial\s*<\/span>/,
  );
  assert.match(html, /<strong>\s*0\/10\s*<\/strong>/);
  assert.doesNotMatch(html, /0% concluído/);
  assert.doesNotMatch(shell, /progress\.percentage/);
  assert.match(css, /\.subject-progress-summary/);
});

test("progresso e retorno ao Concept Compass compartilham o mesmo grupo visual", async () => {
  const html = await read("../../index.html");
  const css = await read("../../styles/header-global.css");

  assert.match(
    html,
    /class="subject-status-group"[\s\S]*id="progressButton"[\s\S]*id="returnButton"/,
  );
  assert.match(
    css,
    /@media \(max-width:\s*900px\)[\s\S]*\.subject-context \.subject-status-group\s*\{[\s\S]*display:\s*flex/,
  );
  assert.match(
    css,
    /\.subject-status-group \.subject-progress-summary\s*\{[\s\S]*display:\s*none/,
  );
  assert.match(
    css,
    /\.subject-status-group \.button-return\s*\{[\s\S]*width:\s*100%/,
  );
});

test("breadcrumb e retorno ao Concept Compass ficam enxutos", async () => {
  const html = await read("../../index.html");

  assert.match(html, /id="subjectArea"/);
  assert.match(html, /id="subjectTheme"/);
  assert.doesNotMatch(html, /subjectBreadcrumbName/);
  assert.match(html, /← Concept Compass/);
  assert.doesNotMatch(html, /← Voltar ao Concept Compass/);
});

test("menu global separa Configurações, manutenção e Sobre", async () => {
  const html = await read("../../index.html");
  const shell = await read("../../scripts/ui/app-shell.js");

  const settingsIndex = html.indexOf('data-utility="settings"');
  const maintenanceIndex = html.indexOf("Manutenção");
  const backupIndex = html.indexOf('data-utility="backup"');
  const restoreIndex = html.indexOf('data-utility="restore"');
  const diagnosticsIndex = html.indexOf('data-utility="diagnostics"');
  const aboutIndex = html.indexOf('data-utility="about"');

  assert.ok(settingsIndex < maintenanceIndex);
  assert.ok(maintenanceIndex < backupIndex);
  assert.ok(backupIndex < restoreIndex);
  assert.ok(restoreIndex < diagnosticsIndex);
  assert.ok(diagnosticsIndex < aboutIndex);
  assert.match(html, /Sobre o Study Stack/);
  assert.doesNotMatch(html, /Study Stack · v0\.3\.0/);
  assert.match(shell, /openAboutModal/);
  assert.match(shell, /\[data-utility="about"\]/);
});

test("Sobre o Study Stack reúne versão, dados e integrações", async () => {
  const source = await read("../../scripts/ui/modals/about-modal.js");
  const html = await read("../../index.html");
  const css = await read("../../styles/header-global.css");

  assert.match(source, /Sobre o Study Stack/);
  assert.match(source, /config\.appVersion/);
  assert.match(source, /config\.storage\.schemaVersion/);
  assert.match(source, /Concept Compass/);
  assert.match(source, /Test Quest/);
  assert.match(source, /FlashCore/);
  assert.match(source, /Detalhes técnicos/);
  assert.match(html, /styles\/header-global\.css/);
  assert.match(css, /\.about-modal/);
});

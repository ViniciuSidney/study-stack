import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

async function read(relative) {
  return readFile(fileURLToPath(new URL(relative, import.meta.url)), "utf8");
}

test("breadcrumb mostra apenas níveis anteriores ao Assunto", async () => {
  const html = await read("../../index.html");
  const shell = await read("../../scripts/ui/app-shell.js");

  assert.match(html, /id="subjectArea"/);
  assert.match(html, /id="subjectTheme"/);
  assert.doesNotMatch(html, /subjectBreadcrumbName/);
  assert.doesNotMatch(shell, /subjectBreadcrumbName/);
  assert.match(
    shell,
    /subjectTitle\.textContent\s*=\s*[\s\S]*context\.subjectName/,
  );
});

test("contadores zero ficam ocultos na navegação", async () => {
  const html = await read("../../index.html");
  const shell = await read("../../scripts/ui/app-shell.js");
  const css = await read("../../styles/navigation.css");

  assert.match(html, /class="nav-count" hidden/);
  assert.doesNotMatch(html, /class="nav-count">0<\/span>/);
  assert.match(shell, /counter\.textContent = value > 0 \? String\(value\) : ""/);
  assert.match(shell, /counter\.hidden = value <= 0/);
  assert.match(css, /\.nav-count\[hidden\]/);
});

test("sidebar separa conteúdo do Assunto da área da Aplicação", async () => {
  const html = await read("../../index.html");
  const css = await read("../../styles/navigation.css");

  assert.match(html, /<span class="nav-group-label">Aplicação<\/span>/);
  assert.match(css, /\.nav-group-label[\s\S]*border-top:\s*1px solid var\(--line\)/);
});

test("rodapé da sidebar exibe somente a identidade da versão", async () => {
  const html = await read("../../index.html");

  assert.match(html, /<div class="sidebar-footer">\s*<p>Study Stack v0\.3\.0<\/p>\s*<\/div>/);
  assert.doesNotMatch(html, /<strong>Versão atual<\/strong>/);
  assert.doesNotMatch(html, /Integração consolidada/);
});

test("sidebar recolhível no desktop e drawer mobile permanecem preservados", async () => {
  const shell = await read("../../scripts/ui/app-shell.js");
  const layout = await read("../../styles/layout.css");
  const responsive = await read("../../styles/responsive.css");

  assert.match(shell, /classList\.toggle\(\s*"sidebar-collapsed"/);
  assert.match(shell, /this\.onPreferencesChange\(\{ sidebarOpen \}\)/);
  assert.match(shell, /if \(this\.#isMobile\(\)\) \{\s*this\.openMobileDrawer\(\)/);
  assert.match(layout, /\.app-shell\.sidebar-collapsed \.workspace[\s\S]*grid-template-columns:\s*0 minmax\(0, 1fr\)/);
  assert.match(responsive, /@media \(max-width: 900px\)[\s\S]*\.sidebar \{\s*display:\s*none/);
});

import { StudyStackApp } from "./app.js";

const app = new StudyStackApp({
  document,
  window,
});

try {
  app.start();
} catch (error) {
  console.error("Falha ao iniciar o Study Stack.", error);

  const mainContent = document.querySelector("#mainContent");

  if (mainContent) {
    mainContent.innerHTML = `
      <div class="content-inner">
        <section class="panel missing-context-panel">
          <p class="eyebrow">Falha de inicialização</p>
          <h2>Não foi possível abrir a aplicação</h2>
          <p>Consulte o console e preserve os dados locais antes de tentar novamente.</p>
        </section>
      </div>
    `;
  }
}

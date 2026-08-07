import { StudyStackApp } from "./app.js";
import { ConceptCompassDeletionConsumer } from "./integrations/concept-compass-deletion-consumer.js";
import { ConceptCompassSummaryPublisher } from "./integrations/concept-compass-summary-publisher.js";

const app = new StudyStackApp({
  document,
  window,
});
const bootstrapDeletionConsumer = new ConceptCompassDeletionConsumer({
  window,
});
const conceptCompassSummaryPublisher = new ConceptCompassSummaryPublisher({
  window,
});

try {
  bootstrapDeletionConsumer.consume();
  app.start();
  if (!app.subject) {
    app.shell?.setMissingContextMode(true);
    app.shell?.setNewRecordEnabled(false);
  }

  const liveDeletionConsumer = new ConceptCompassDeletionConsumer({
    window,
    repository: app.repository,
    onSubjectsDeleted({ subjectIds }) {
      if (app.subject?.id && subjectIds.includes(app.subject.id)) {
        window.location.reload();
      }
    },
  });

  liveDeletionConsumer.install();
  conceptCompassSummaryPublisher.install().publish();
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

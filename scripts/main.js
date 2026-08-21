import { APP_CONFIG } from "./config/app-config.js";
import { DataResetController } from "./data-reset-controller.js";
import { StudyStackApp } from "./app.js";
import { ActiveSubjectStateWatcher } from "./integrations/active-subject-state-watcher.js";
import { ConceptCompassDeletionConsumer } from "./integrations/concept-compass-deletion-consumer.js";
import { ConceptCompassSubjectWatcher } from "./integrations/concept-compass-subject-watcher.js";
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

  const dataResetController = new DataResetController({
    app,
    document,
    window,
    config: APP_CONFIG,
  });
  const liveDeletionConsumer = new ConceptCompassDeletionConsumer({
    window,
    repository: app.repository,
    onSubjectsDeleted({ subjectIds }) {
      const activeSubjectId = app.context?.subjectId ?? app.subject?.id ?? null;
      if (activeSubjectId && subjectIds.includes(activeSubjectId)) {
        app.markSubjectDeleted({ subjectId: activeSubjectId });
      }
    },
  });
  const activeSubjectStateWatcher = new ActiveSubjectStateWatcher({
    window,
    getSubjectId: () => app.context?.subjectId ?? app.subject?.id ?? null,
    onUnavailable({ subjectId }) {
      app.markSubjectDeleted({ subjectId });
    },
  });
  const conceptCompassSubjectWatcher = new ConceptCompassSubjectWatcher({
    window,
    getSubjectId: () => app.context?.subjectId ?? null,
    onSnapshot(snapshot) {
      app.synchronizeConceptCompassSnapshot(snapshot);
    },
    onMissing({ subjectId }) {
      app.markSubjectDeleted({
        subjectId,
        subjectName: app.context?.subjectName ?? null,
      });
    },
  });

  dataResetController.install();
  liveDeletionConsumer.install();
  activeSubjectStateWatcher.install().check();
  conceptCompassSubjectWatcher.install().check();
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

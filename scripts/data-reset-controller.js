import { DataResetService } from "./services/data-reset-service.js";
import { openActionConfirmationScreen } from "./ui/action-confirmation-screen.js";
import { openDataResetModal } from "./ui/modals/data-reset-modal.js";

export class DataResetController {
  constructor({ app, document, window, config }) {
    this.app = app;
    this.document = document;
    this.window = window;
    this.config = config;
    this.service = new DataResetService({
      repository: app.repository,
      clock: app.clock,
      appVersion: config.appVersion,
      schemaVersion: config.storage.schemaVersion,
      preferenceDefaults: config.preferenceDefaults,
    });
    this.boundClick = (event) => this.#handleClick(event);
  }

  install() {
    this.document.addEventListener("click", this.boundClick);
    return this;
  }

  destroy() {
    this.document.removeEventListener("click", this.boundClick);
  }

  openStudyDataDeletion() {
    const summary = this.service.getStudyDataSummary();
    openDataResetModal({
      document: this.document,
      mode: "study-data",
      summary,
      onBackup: () => this.app.createBackup(),
      onConfirm: () => {
        try {
          const result = this.service.deleteStudyData();
          this.window.setTimeout(() => {
            openActionConfirmationScreen({
              document: this.document,
              title: "Dados de estudo excluídos",
              message:
                "O conteúdo de estudo foi removido e suas preferências foram preservadas. Um ponto de recuperação foi criado antes da exclusão.",
              metrics: [
                { label: "Assuntos removidos", value: result.summary.subjects },
                { label: "Registros removidos", value: result.summary.records },
                { label: "Listas removidas", value: result.summary.sessions },
                { label: "Erros removidos", value: result.summary.errors },
              ],
              onConfirm: () => this.window.location.reload(),
            });
          }, 0);
          return true;
        } catch (error) {
          this.app.handleFailure(
            error,
            "Não foi possível excluir os dados de estudo.",
          );
          return false;
        }
      },
      onClose: () => this.app.shell.syncToastLayer(),
    });
  }

  openFullReset() {
    openDataResetModal({
      document: this.document,
      mode: "full-reset",
      summary: null,
      onBackup: () => this.app.createBackup(),
      onConfirm: () => {
        try {
          this.service.resetApplication();
          this.window.setTimeout(() => {
            openActionConfirmationScreen({
              document: this.document,
              title: "Study Stack redefinido",
              message:
                "O armazenamento local voltou ao estado inicial. Preferências, integrações e dados de estudo foram redefinidos.",
              onConfirm: () => this.window.location.reload(),
            });
          }, 0);
          return true;
        } catch (error) {
          this.app.handleFailure(
            error,
            "Não foi possível redefinir o Study Stack.",
          );
          return false;
        }
      },
      onClose: () => this.app.shell.syncToastLayer(),
    });
  }

  #handleClick(event) {
    const button = event.target.closest?.("[data-danger-action]");
    if (!button) return;

    const action = button.dataset.dangerAction;
    if (action === "delete-study-data") {
      this.openStudyDataDeletion();
    } else if (action === "full-reset") {
      this.openFullReset();
    }
  }
}

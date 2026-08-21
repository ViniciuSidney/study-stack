import { DataResetService } from "./services/data-reset-service.js";
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
          this.service.deleteStudyData();
          this.app.shell.showToast(
            "Dados de estudo excluídos. Um ponto de recuperação foi criado.",
          );
          this.window.setTimeout(() => this.window.location.reload(), 450);
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
          this.app.shell.showToast("Study Stack redefinido para o estado inicial.");
          this.window.setTimeout(() => this.window.location.reload(), 450);
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
    const button = event.target.closest?.(".settings-danger-panel button");
    if (!button) return;

    if (button.classList.contains("button-quiet-danger")) {
      this.openStudyDataDeletion();
    } else if (button.classList.contains("button-danger")) {
      this.openFullReset();
    }
  }
}

import { openActionConfirmationScreen } from "./ui/action-confirmation-screen.js";
import { openConfirmationModal } from "./ui/modals/confirmation-modal.js";
import { openRestoreModal } from "./ui/modals/restore-modal.js";

function sumValues(values) {
  return Object.values(values ?? {}).reduce(
    (total, value) => total + (Number(value) || 0),
    0,
  );
}

export class ActionConfirmationController {
  constructor({ app, document, window }) {
    this.app = app;
    this.document = document;
    this.window = window;
  }

  install() {
    this.app.resetPreferences = () => this.resetPreferences();
    this.app.openRestore = () => this.openRestore();
    this.app.confirmRestoreRecoveryPoint = () =>
      this.confirmRestoreRecoveryPoint();
    return this;
  }

  resetPreferences() {
    try {
      this.app.preferences = this.app.preferencesService.reset();
      this.app.shell.applyPreferences(this.app.preferences);
      this.app.updateShellState();
      this.app.renderSection("settings");

      openActionConfirmationScreen({
        document: this.document,
        title: "Padrões restaurados",
        message:
          "A aparência e a navegação voltaram aos valores iniciais. Seus dados de estudo permaneceram intactos.",
        onConfirm: () => this.app.shell.focusContent(),
      });
    } catch (error) {
      this.app.handleFailure(
        error,
        "Não foi possível restaurar as preferências.",
      );
    }
  }

  openRestore() {
    openRestoreModal({
      document: this.document,
      onParse: (text) => this.app.backupService.parse(text),
      onPreview: (envelope, mode) =>
        this.app.backupService.preview(envelope, mode),
      onRestore: (envelope, mode) => {
        try {
          const result = this.app.backupService.restore(envelope, mode);
          this.window.setTimeout(
            () => this.#showRestoreResult(envelope, result),
            0,
          );
          return true;
        } catch (error) {
          this.app.handleFailure(
            error,
            "Não foi possível aplicar a restauração.",
          );
          return false;
        }
      },
      onClose: () => this.app.shell.syncToastLayer(),
    });
  }

  confirmRestoreRecoveryPoint() {
    openConfirmationModal({
      document: this.document,
      title: "Recuperar estado anterior?",
      message:
        "O Study Stack voltará ao estado salvo imediatamente antes da última restauração.",
      confirmLabel: "Recuperar",
      onConfirm: () => {
        try {
          this.app.backupService.restoreRecoveryPoint();
          this.window.setTimeout(() => {
            openActionConfirmationScreen({
              document: this.document,
              title: "Estado anterior recuperado",
              message:
                "O Study Stack restaurou o estado salvo antes da última substituição.",
              onConfirm: () => this.window.location.reload(),
            });
          }, 0);
        } catch (error) {
          this.app.handleFailure(
            error,
            "Não foi possível recuperar o estado anterior.",
          );
        }
      },
      onClose: () => this.app.shell.syncToastLayer(),
    });
  }

  #showRestoreResult(envelope, result) {
    const summary = envelope?.summary ?? {};
    const replaceMode = result.mode === "replace";
    const metrics = replaceMode
      ? [
          { label: "Assuntos restaurados", value: summary.subjectCount ?? 0 },
          { label: "Registros restaurados", value: summary.recordCount ?? 0 },
          { label: "Arquivados", value: summary.archivedRecordCount ?? 0 },
        ]
      : [
          { label: "Itens adicionados", value: sumValues(result.additions) },
          { label: "Conflitos preservados", value: result.conflicts.length },
          { label: "Assuntos no backup", value: summary.subjectCount ?? 0 },
          { label: "Registros no backup", value: summary.recordCount ?? 0 },
        ];

    openActionConfirmationScreen({
      document: this.document,
      title: replaceMode
        ? "Dados substituídos"
        : "Dados adicionados aos existentes",
      message: replaceMode
        ? "O backup foi aplicado com sucesso. Um ponto de recuperação foi criado antes da substituição."
        : "Os novos dados foram incorporados sem sobrescrever seus dados atuais. Conflitos permaneceram preservados.",
      metrics,
      onConfirm: () => this.window.location.reload(),
    });
  }
}

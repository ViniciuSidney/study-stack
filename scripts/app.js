import { APP_CONFIG } from "./config/app-config.js";
import { ConceptCompassAdapter } from "./integrations/concept-compass-adapter.js";
import { DraftService } from "./services/draft-service.js";
import { NoteService } from "./services/note-service.js";
import { OverviewService } from "./services/overview-service.js";
import { ProgressService } from "./services/progress-service.js";
import { PreferencesService } from "./services/preferences-service.js";
import { RecordService } from "./services/record-service.js";
import { SubjectService } from "./services/subject-service.js";
import { SummaryService } from "./services/summary-service.js";
import { LocalStorageAdapter } from "./storage/local-storage-adapter.js";
import { MigrationRunner } from "./storage/migrations/migration-runner.js";
import { StateRepository } from "./storage/state-repository.js";
import { createInitialState } from "./storage/state-schema.js";
import { AppShell } from "./ui/app-shell.js";
import { openConfirmationModal } from "./ui/modals/confirmation-modal.js";
import { openNoteEditorModal } from "./ui/modals/note-editor-modal.js";
import { openOverviewEditorModal } from "./ui/modals/overview-editor-modal.js";
import { openQuickDetailModal } from "./ui/modals/quick-detail-modal.js";
import { openRecordModal } from "./ui/modals/record-modal.js";
import { openSummaryEditorModal } from "./ui/modals/summary-editor-modal.js";
import { Router } from "./ui/router.js";
import { renderArchivedSection } from "./ui/sections/archived-section.js";
import { renderHistorySection } from "./ui/sections/history-section.js";
import { renderOverviewSection } from "./ui/sections/overview-section.js";
import { renderPlaceholderSection } from "./ui/sections/placeholder-section.js";
import { renderRecordsSection } from "./ui/sections/records-section.js";
import { renderSettingsSection } from "./ui/sections/settings-section.js";
import { renderMissingContextState } from "./ui/states/missing-context-state.js";

export class StudyStackApp {
  constructor({ document, window }) {
    this.document = document;
    this.window = window;
    this.context = null;
    this.subject = null;
    this.preferences = null;
    this.shell = null;
    this.router = null;
    this.repository = null;
    this.noteService = null;
    this.preferencesService = null;
    this.overviewService = null;
    this.progressService = null;
    this.subjectService = null;
    this.recordService = null;
    this.summaryService = null;
    this.draftService = null;
    this.clock = () => new Date().toISOString();
  }

  start() {
    const storage = new LocalStorageAdapter(
      this.window.localStorage,
      APP_CONFIG.storageNamespace,
    );

    this.repository = new StateRepository({
      storage,
      config: APP_CONFIG,
      createInitialState,
      migrationRunner: new MigrationRunner(APP_CONFIG.storage.schemaVersion),
      clock: this.clock,
    });
    this.repository.initialize();

    this.preferencesService = new PreferencesService({
      repository: this.repository,
      legacyStorage: storage,
      defaults: APP_CONFIG.preferenceDefaults,
      clock: this.clock,
    });
    this.preferences = this.preferencesService.load();

    this.context = ConceptCompassAdapter.resolveSubjectContext(
      this.window.location,
      APP_CONFIG,
    );

    this.subjectService = new SubjectService({
      repository: this.repository,
      clock: this.clock,
      appVersion: APP_CONFIG.appVersion,
    });

    if (this.context.valid) {
      this.subject = this.subjectService.synchronize(this.context);
    } else {
      this.subjectService.registerContextIssue(this.context);
    }

    this.recordService = new RecordService({
      repository: this.repository,
      clock: this.clock,
      appVersion: APP_CONFIG.appVersion,
    });
    this.summaryService = new SummaryService({
      repository: this.repository,
      clock: this.clock,
      appVersion: APP_CONFIG.appVersion,
    });
    this.noteService = new NoteService({
      repository: this.repository,
      clock: this.clock,
      appVersion: APP_CONFIG.appVersion,
    });
    this.draftService = new DraftService({
      repository: this.repository,
      clock: this.clock,
    });
    this.overviewService = new OverviewService({
      repository: this.repository,
      clock: this.clock,
      appVersion: APP_CONFIG.appVersion,
    });
    this.progressService = new ProgressService({
      repository: this.repository,
      clock: this.clock,
      appVersion: APP_CONFIG.appVersion,
    });

    if (this.subject) {
      this.progressService.ensureCurrent(this.subject.id);
      this.subject = this.repository.getEntity("subjects", this.subject.id);
    }

    this.shell = new AppShell({
      document: this.document,
      window: this.window,
      config: APP_CONFIG,
      onPreferencesChange: (partial) => this.updatePreferences(partial),
    });

    this.shell.initialize(this.preferences);
    this.shell.setSubjectContext(this.subject ?? this.context);
    this.shell.setNewRecordEnabled(Boolean(this.context.valid && this.subject));
    this.updateShellState();
    this.shell.onNavigate((sectionId) => this.router.navigate(sectionId));
    this.shell.onReturn(() => this.returnToConceptCompass());
    this.shell.onNewRecord(() => this.openCreateRecord());

    this.router = new Router(
      this.window,
      this.preferences.startSection || APP_CONFIG.defaultSection,
    );
    this.router.onChange((sectionId) => this.renderSection(sectionId));
    this.router.start();
  }

  updatePreferences(partial) {
    try {
      this.preferences = this.preferencesService.update(
        this.preferences,
        partial,
      );
      this.shell.applyPreferences(this.preferences);
      this.updateShellState();
      this.shell.showToast("Preferências salvas no estado v1.");

      if (this.router.getCurrentSection() === "settings") {
        this.renderSection("settings");
      }
    } catch (error) {
      this.handleFailure(error, "Não foi possível salvar as preferências.");
    }
  }

  resetPreferences() {
    try {
      this.preferences = this.preferencesService.reset();
      this.shell.applyPreferences(this.preferences);
      this.shell.showToast("Preferências restauradas.");
      this.renderSection("settings");
    } catch (error) {
      this.handleFailure(error, "Não foi possível restaurar as preferências.");
    }
  }

  renderSection(sectionId) {
    this.shell.setActiveSection(sectionId);
    const container = this.shell.getContentContainer();

    if (sectionId === "settings") {
      renderSettingsSection({
        document: this.document,
        container,
        preferences: this.preferences,
        storageInfo: this.getStorageInfo(),
        onUpdate: (partial) => this.updatePreferences(partial),
        onReset: () => this.resetPreferences(),
      });
      this.shell.focusContent();
      return;
    }

    if (!this.context.valid || !this.subject) {
      renderMissingContextState({
        document: this.document,
        container,
        context: this.context,
        onOpenDevelopmentContext: () => {
          const url = new URL(this.window.location.href);
          url.searchParams.delete("noContext");
          url.searchParams.delete("strictContext");
          url.searchParams.set("dev", "1");
          url.hash = "#/overview";
          this.window.location.assign(url);
        },
        onOpenSettings: () => this.router.navigate("settings"),
      });
      this.shell.focusContent();
      return;
    }

    const recordCounts = this.recordService.getCounts(this.subject.id);

    if (sectionId === "overview") {
      const activeRecords = this.recordService.listBySubject(this.subject.id);
      const progress = this.progressService.ensureCurrent(this.subject.id);
      this.subject = this.repository.getEntity("subjects", this.subject.id);
      this.shell.setProgress(progress);
      this.shell.setSubjectContext(this.subject);

      renderOverviewSection({
        document: this.document,
        container,
        subject: this.subject,
        progress,
        recordCounts,
        recentRecords: activeRecords,
        importantRecords: activeRecords.filter((record) => record.isImportant),
        recentEvents: this.recordService.listHistory(this.subject.id),
        navigate: (target) => this.router.navigate(target),
        onCreate: () => this.openCreateRecord(),
        onEditOverview: () => this.openOverviewEditor(),
      });
    } else if (sectionId === "summaries" || sectionId === "notes") {
      const type = sectionId === "summaries" ? "summary" : "note";
      this.renderRecordTypeSection(container, type);
    } else if (sectionId === "archived") {
      renderArchivedSection({
        document: this.document,
        container,
        records: this.recordService.listBySubject(this.subject.id, {
          archived: true,
        }),
        onRestore: (record) => this.restoreRecord(record),
      });
    } else if (sectionId === "history") {
      renderHistorySection({
        document: this.document,
        container,
        events: this.recordService.listHistory(this.subject.id),
      });
    } else {
      renderPlaceholderSection({
        document: this.document,
        container,
        sectionId,
      });
    }

    this.shell.focusContent();
  }

  renderRecordTypeSection(container, type) {
    const records = this.recordService.listBySubject(this.subject.id, { type });
    const views =
      type === "summary"
        ? this.summaryService.listViewsBySubject(this.subject.id, records)
        : this.noteService.listViewsBySubject(this.subject.id, records);
    const detailsById = new Map(
      views.map((view) => [view.record.id, view]),
    );

    renderRecordsSection({
      document: this.document,
      container,
      type,
      records,
      detailsById,
      onCreate: () => this.openCreateRecord(type),
      onQuickDetail: () => this.openQuickDetail(),
      onOpen: (record) =>
        record.type === "summary"
          ? this.openSummaryEditor(record)
          : this.openNoteEditor(record),
      onChangeStatus: (record, status) => this.changeRecordStatus(record, status),
      onToggleImportant: (record) => this.toggleRecordImportant(record),
      onToggleStudied: (record) => this.toggleSummaryStudied(record),
      onArchive: (record) => this.confirmArchiveRecord(record),
    });
  }

  openOverviewEditor() {
    try {
      const { subject } = this.overviewService.getView(this.subject.id);

      openOverviewEditorModal({
        document: this.document,
        subject,
        onSubmit: (values) => {
          this.overviewService.update(subject.id, values);
          this.subject = this.repository.getEntity("subjects", subject.id);
          this.shell.setSubjectContext(this.subject);
          this.updateShellState();
          this.shell.showToast("Visão Geral atualizada.");
          this.renderSection("overview");
        },
        onClose: () => this.shell.syncToastLayer(),
      });
    } catch (error) {
      this.handleFailure(error, "Não foi possível editar a Visão Geral.");
    }
  }

  openCreateRecord(preferredType = null) {
    if (!this.subject) {
      this.shell.showToast("Abra um assunto válido para criar registros.", "warning");
      return;
    }

    const currentSection = this.router.getCurrentSection();
    const defaultType =
      preferredType ?? (currentSection === "notes" ? "note" : "summary");

    openRecordModal({
      document: this.document,
      defaultType,
      defaultStudyDate: this.clock().slice(0, 10),
      onSubmit: (values) => {
        const created = this.recordService.create({
          ...values,
          subjectId: this.subject.id,
        });
        this.afterRecordMutation("Registro criado e salvo localmente.");

        if (created.type === "summary") {
          this.window.setTimeout(() => this.openSummaryEditor(created), 0);
        } else if (created.type === "note") {
          this.window.setTimeout(() => this.openNoteEditor(created), 0);
        }
      },
      onClose: () => this.shell.syncToastLayer(),
    });
  }

  openEditRecord(record) {
    if (record.type === "summary") {
      this.openSummaryEditor(record);
      return;
    }

    if (record.type === "note") {
      this.openNoteEditor(record);
      return;
    }

    openRecordModal({
      document: this.document,
      record,
      defaultStudyDate: record.studyDate,
      onSubmit: (values) => {
        this.recordService.update(record.id, {
          title: values.title,
          studyDate: values.studyDate,
          tags: values.tags,
          personalNotes: values.personalNotes,
          isImportant: values.isImportant,
        });

        if (values.status !== record.status) {
          this.recordService.changeStatus(record.id, values.status);
        }

        this.afterRecordMutation("Registro atualizado.");
      },
      onClose: () => this.shell.syncToastLayer(),
    });
  }


  openSummaryEditor(record) {
    try {
      const view = this.summaryService.getView(record.id);
      const storedDraft = this.draftService.get("summary", record.id);
      const recoveredDraft =
        storedDraft &&
        Date.parse(storedDraft.updatedAt) >= Date.parse(view.record.updatedAt)
          ? storedDraft
          : null;
      const settings = this.repository.getEntity("settings", "global");

      openSummaryEditorModal({
        document: this.document,
        view,
        recoveredDraft,
        autosaveDelayMs: settings?.autosaveDelayMs ?? 900,
        onAutosave: ({ modalInstanceId, originalState, workingState }) =>
          this.draftService.save({
            subjectId: view.record.subjectId,
            recordId: view.record.id,
            recordType: "summary",
            modalInstanceId,
            originalState,
            workingState,
          }),
        onDiscardDraft: () => this.draftService.remove("summary", view.record.id),
        onSubmit: (workingState) => {
          this.summaryService.save(view.record.id, workingState);
          this.afterRecordMutation("Resumo salvo com sucesso.");
        },
        onClose: ({ draftPreserved, discarded, finalSaved }) => {
          this.shell.syncToastLayer();

          if (draftPreserved) {
            this.shell.showToast(
              "Alterações preservadas para continuar depois.",
            );
          } else if (discarded && !finalSaved) {
            this.shell.showToast("Alterações do editor descartadas.");
          }
        },
      });
    } catch (error) {
      this.handleFailure(error, "Não foi possível abrir o editor de Resumo.");
    }
  }

  openQuickDetail() {
    if (!this.subject) {
      this.shell.showToast("Abra um assunto válido para criar Anotações.", "warning");
      return;
    }

    openQuickDetailModal({
      document: this.document,
      defaultStudyDate: this.clock().slice(0, 10),
      onSubmit: (values) => {
        this.noteService.createQuickDetail({
          ...values,
          subjectId: this.subject.id,
        });
        this.afterRecordMutation("Detalhe salvo como Anotação.");
      },
      onClose: () => this.shell.syncToastLayer(),
    });
  }

  openNoteEditor(record) {
    try {
      let view = this.noteService.getView(record.id);

      if (
        view.note.createdFromQuickDetail &&
        !view.note.quickDetailExpandedAt
      ) {
        view = this.noteService.markExpanded(record.id);
      }

      const storedDraft = this.draftService.get("note", record.id);
      const recoveredDraft =
        storedDraft &&
        Date.parse(storedDraft.updatedAt) >= Date.parse(view.record.updatedAt)
          ? storedDraft
          : null;
      const settings = this.repository.getEntity("settings", "global");

      openNoteEditorModal({
        document: this.document,
        view,
        linkOptions: this.noteService.getLinkOptions(
          view.record.subjectId,
          view.record.id,
        ),
        recoveredDraft,
        autosaveDelayMs: settings?.autosaveDelayMs ?? 900,
        onAutosave: ({ modalInstanceId, originalState, workingState }) =>
          this.draftService.save({
            subjectId: view.record.subjectId,
            recordId: view.record.id,
            recordType: "note",
            modalInstanceId,
            originalState,
            workingState,
          }),
        onDiscardDraft: () => this.draftService.remove("note", view.record.id),
        onSubmit: (workingState) => {
          this.noteService.save(view.record.id, workingState);
          this.afterRecordMutation("Anotação salva com sucesso.");
        },
        onClose: ({ draftPreserved, discarded, finalSaved }) => {
          this.shell.syncToastLayer();

          if (draftPreserved) {
            this.shell.showToast("Alterações preservadas para continuar depois.");
          } else if (discarded && !finalSaved) {
            this.shell.showToast("Alterações do editor descartadas.");
          }
        },
      });
    } catch (error) {
      this.handleFailure(error, "Não foi possível abrir o editor de Anotação.");
    }
  }

  toggleSummaryStudied(record) {
    try {
      const view = this.summaryService.toggleStudied(record.id);
      this.afterRecordMutation(
        view.summary.isStudied
          ? "Resumo marcado como estudado."
          : "Marcação de estudo removida.",
      );
    } catch (error) {
      this.handleFailure(error, "Não foi possível atualizar a marca de estudo.");
    }
  }

  changeRecordStatus(record, status) {
    try {
      this.recordService.changeStatus(record.id, status);
      this.afterRecordMutation(
        status === "in_progress"
          ? "Registro movido para Em andamento."
          : "Registro devolvido a Rascunho.",
      );
    } catch (error) {
      this.handleFailure(error, "Não foi possível alterar o status.");
    }
  }

  toggleRecordImportant(record) {
    try {
      const updated = this.recordService.toggleImportant(record.id);
      this.afterRecordMutation(
        updated.isImportant
          ? "Registro marcado como importante."
          : "Registro removido dos importantes.",
      );
    } catch (error) {
      this.handleFailure(error, "Não foi possível atualizar a importância.");
    }
  }

  confirmArchiveRecord(record) {
    openConfirmationModal({
      document: this.document,
      title: "Arquivar registro?",
      message:
        "O registro sairá das listas atuais, mas continuará preservado em Arquivados e no backup.",
      confirmLabel: "Arquivar",
      danger: true,
      onConfirm: () => {
        try {
          this.recordService.archive(record.id, "Arquivamento manual");
          if (record.type === "summary" || record.type === "note") {
            this.draftService.remove(record.type, record.id);
          }
          this.afterRecordMutation("Registro arquivado.");
        } catch (error) {
          this.handleFailure(error, "Não foi possível arquivar o registro.");
        }
      },
      onClose: () => this.shell.syncToastLayer(),
    });
  }

  restoreRecord(record) {
    try {
      this.recordService.restore(record.id);
      this.afterRecordMutation("Registro restaurado para sua data original.");
    } catch (error) {
      this.handleFailure(error, "Não foi possível restaurar o registro.");
    }
  }

  afterRecordMutation(message) {
    this.progressService.ensureCurrent(this.subject.id);
    this.subject = this.repository.getEntity("subjects", this.subject.id);
    this.shell.setSubjectContext(this.subject);
    this.updateShellState();
    this.shell.showToast(message);
    this.renderSection(this.router.getCurrentSection());
  }

  updateShellState() {
    const storageInfo = this.getStorageInfo();
    this.shell.setStorageStatus({
      schemaVersion: storageInfo.schemaVersion,
      saved: true,
    });

    if (this.subject) {
      this.shell.updateCounters(this.recordService.getCounts(this.subject.id));
      this.shell.setProgress(
        this.repository.getEntity(
          "progressSnapshots",
          `progress-${this.subject.id}`,
        ),
      );
    } else {
      this.shell.updateCounters({});
      this.shell.setProgress(null);
    }
  }

  handleFailure(error, message) {
    console.error(error);
    this.shell.setStorageStatus({
      schemaVersion: APP_CONFIG.storage.schemaVersion,
      saved: false,
    });
    this.shell.showToast(message, "warning");
  }

  getStorageInfo() {
    const state = this.repository.getState();

    return Object.freeze({
      storageKey: `${APP_CONFIG.storageNamespace}:${APP_CONFIG.storage.stateKey}`,
      schemaVersion: state.schemaVersion,
      appVersion: state.appVersion,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      subjectCount: state.integrity.collectionCounts.subjects,
      recordCount: state.integrity.collectionCounts.records,
      historyCount: state.integrity.collectionCounts.historyEvents,
      integrityStatus: state.integrity.status,
    });
  }

  returnToConceptCompass() {
    const returnUrl = ConceptCompassAdapter.getReturnUrl(this.context, APP_CONFIG);

    if (!returnUrl) {
      this.shell.showToast(
        "Nenhum endereço seguro de retorno foi encontrado.",
        "warning",
      );
      return;
    }

    if (this.context.source === "development-fixture") {
      this.shell.showToast("Retorno simulado no contexto de desenvolvimento.");
      return;
    }

    this.window.location.assign(returnUrl);
  }
}

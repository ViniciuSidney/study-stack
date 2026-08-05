import { APP_CONFIG } from "./config/app-config.js";
import { ConceptCompassAdapter } from "./integrations/concept-compass-adapter.js";
import { TestQuestAdapter } from "./integrations/testquest-adapter.js";
import { BackupService } from "./services/backup-service.js";
import { DiagnosticService } from "./services/diagnostic-service.js";
import { DraftService } from "./services/draft-service.js";
import { ExerciseService } from "./services/exercise-service.js";
import { ErrorService } from "./services/error-service.js";
import { GuidedFlowService } from "./services/guided-flow-service.js";
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
import { openConsolidationModal } from "./ui/modals/consolidation-modal.js";
import { openDiagnosticModal } from "./ui/modals/diagnostic-modal.js";
import { openExerciseSessionModal } from "./ui/modals/exercise-session-modal.js";
import { openErrorEditorModal } from "./ui/modals/error-editor-modal.js";
import { openErrorEvidenceModal } from "./ui/modals/error-evidence-modal.js";
import { openFlowStageHelpModal } from "./ui/modals/flow-stage-help-modal.js";
import { openMetacognitiveReviewModal } from "./ui/modals/metacognitive-review-modal.js";
import { openNoteEditorModal } from "./ui/modals/note-editor-modal.js";
import { openOverviewEditorModal } from "./ui/modals/overview-editor-modal.js";
import { openPendingImportsModal } from "./ui/modals/pending-imports-modal.js";
import { openQuickDetailModal } from "./ui/modals/quick-detail-modal.js";
import { openRecordModal } from "./ui/modals/record-modal.js";
import { openRestoreModal } from "./ui/modals/restore-modal.js";
import { openSummaryEditorModal } from "./ui/modals/summary-editor-modal.js";
import { openTestQuestImportModal } from "./ui/modals/testquest-import-modal.js";
import { Router } from "./ui/router.js";
import { renderArchivedSection } from "./ui/sections/archived-section.js";
import { renderHistorySection } from "./ui/sections/history-section.js";
import { renderExercisesSection } from "./ui/sections/exercises-section.js";
import { renderErrorsSection } from "./ui/sections/errors-section.js";
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
    this.backupService = null;
    this.diagnosticService = null;
    this.noteService = null;
    this.preferencesService = null;
    this.overviewService = null;
    this.progressService = null;
    this.subjectService = null;
    this.recordService = null;
    this.summaryService = null;
    this.draftService = null;
    this.exerciseService = null;
    this.errorService = null;
    this.guidedFlowService = null;
    this.initialTestQuestNotice = null;
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
    this.exerciseService = new ExerciseService({
      repository: this.repository,
      clock: this.clock,
      appVersion: APP_CONFIG.appVersion,
    });
    this.errorService = new ErrorService({
      repository: this.repository,
      clock: this.clock,
      appVersion: APP_CONFIG.appVersion,
    });
    this.guidedFlowService = new GuidedFlowService({
      repository: this.repository,
      clock: this.clock,
      appVersion: APP_CONFIG.appVersion,
    });
    this.backupService = new BackupService({
      repository: this.repository,
      clock: this.clock,
      appVersion: APP_CONFIG.appVersion,
      schemaVersion: APP_CONFIG.storage.schemaVersion,
    });
    this.diagnosticService = new DiagnosticService({
      repository: this.repository,
      clock: this.clock,
      schemaVersion: APP_CONFIG.storage.schemaVersion,
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
      this.guidedFlowService.ensure(this.subject.id);
      this.consumeInitialTestQuestPayload();
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
    this.shell.onBackup(() => this.createBackup());
    this.shell.onRestore(() => this.openRestore());
    this.shell.onDiagnostics(() => this.openDiagnostics());

    this.router = new Router(
      this.window,
      this.preferences.startSection || APP_CONFIG.defaultSection,
    );
    this.router.onChange((sectionId) => this.renderSection(sectionId));
    this.router.start();

    if (this.initialTestQuestNotice) {
      this.shell.showToast(
        this.initialTestQuestNotice.message,
        this.initialTestQuestNotice.type,
      );
    }
    if (this.subject) {
      this.window.setTimeout(() => this.showGuidedFlowNotice(), 120);
    }
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
        maintenanceInfo: this.getMaintenanceInfo(),
        onUpdate: (partial) => this.updatePreferences(partial),
        onReset: () => this.resetPreferences(),
        onBackup: () => this.createBackup(),
        onRestore: () => this.openRestore(),
        onDiagnostics: () => this.openDiagnostics(),
        onPendingImports: () => this.openPendingImports(),
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

      const guidedFlow = this.guidedFlowService.getView(this.subject.id);
      renderOverviewSection({
        document: this.document,
        container,
        subject: this.subject,
        progress,
        guidedFlow,
        recordCounts,
        recentRecords: activeRecords,
        importantRecords: activeRecords.filter((record) => record.isImportant),
        recentEvents: this.recordService.listHistory(this.subject.id),
        navigate: (target) => this.router.navigate(target),
        onCreate: () => this.openCreateRecord(),
        onEditOverview: () => this.openOverviewEditor(),
        onMakeStageCurrent: (stage) => this.makeGuidedStageCurrent(stage),
        onStageAction: (action) => this.executeGuidedAction(action),
        onOpenStageHelp: (stage) => this.openGuidedStageHelp(stage),
      });
    } else if (sectionId === "summaries" || sectionId === "notes") {
      const type = sectionId === "summaries" ? "summary" : "note";
      this.renderRecordTypeSection(container, type);
    } else if (sectionId === "exercises") {
      renderExercisesSection({
        document: this.document,
        container,
        views: this.exerciseService.listViewsBySubject(this.subject.id),
        aggregate: this.exerciseService.getAggregate(this.subject.id),
        pendingImports: this.exerciseService.listPending(),
        onImport: () => this.openTestQuestImport(),
        onOpenPending: () => this.openPendingImports(),
        onOpen: (view) => this.openExerciseSession(view),
        onArchive: (record) => this.confirmArchiveRecord(record),
      });
    } else if (sectionId === "errors") {
      renderErrorsSection({
        document: this.document,
        container,
        views: this.errorService.listViewsBySubject(this.subject.id),
        aggregate: this.errorService.getAggregate(this.subject.id),
        onOpen: (view) => this.openErrorEditor(view),
        onToggleReviewed: (view) => this.toggleErrorReviewed(view),
        onRecurrence: (view) => this.openErrorRecurrence(view),
        onEvidence: (view) => this.openErrorEvidence(view),
        onArchive: (record) => this.confirmArchiveRecord(record),
        onOpenExercises: () => this.router.navigate("exercises"),
      });
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

  consumeInitialTestQuestPayload() {
    const available = TestQuestAdapter.consumeAvailable({
      location: this.window.location,
      storage: this.window.localStorage,
    });

    if (!available.found) {
      return;
    }

    if (!available.valid) {
      this.initialTestQuestNotice = {
        message: "O resultado recebido do Test Quest contém JSON inválido.",
        type: "warning",
      };
      return;
    }

    try {
      const result = this.exerciseService.importPayload(available.payload, {
        expectedSubjectId: this.subject.id,
      });
      const successful = ["imported", "duplicate"].includes(result.status);

      if (successful && available.source === "localStorage-handoff") {
        TestQuestAdapter.clearHandoff(this.window.localStorage);
      }

      if (successful && available.source?.startsWith("query:")) {
        const url = new URL(this.window.location.href);
        url.searchParams.delete("testQuestResult");
        url.searchParams.delete("testQuestPayload");
        this.window.history.replaceState({}, "", url);
      }

      this.initialTestQuestNotice = {
        message: result.message,
        type: successful ? "success" : "warning",
      };
    } catch (error) {
      this.initialTestQuestNotice = {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível importar o resultado do Test Quest.",
        type: "warning",
      };
    }
  }

  openTestQuestImport() {
    openTestQuestImportModal({
      document: this.document,
      subject: this.subject,
      allowDevelopmentExample: ["localhost", "127.0.0.1"].includes(
        this.window.location.hostname,
      ),
      onSubmit: (payload) => {
        const result = this.exerciseService.importPayload(payload, {
          expectedSubjectId: this.subject.id,
        });

        if (result.status === "imported") {
          this.afterRecordMutation(result.message);
        } else {
          this.updateShellState();
          this.shell.showToast(result.message, "warning");
          this.renderSection("exercises");
        }

        return result;
      },
      onClose: () => this.shell.syncToastLayer(),
    });
  }

  openExerciseSession(view) {
    try {
      const current = this.exerciseService.getView(view.session.id);
      openExerciseSessionModal({
        document: this.document,
        view: current,
        onSaveNotes: (value) => {
          this.exerciseService.saveSessionNotes(current.session.id, value);
          this.afterRecordMutation("Observação da lista atualizada.");
        },
        onCreateErrors: (questionIds) => {
          this.createErrorsFromQuestions(questionIds);
        },
        onClose: () => this.shell.syncToastLayer(),
      });
    } catch (error) {
      this.handleFailure(error, "Não foi possível abrir a lista importada.");
    }
  }

  createErrorsFromQuestions(questionIds) {
    try {
      const result = this.errorService.createFromQuestions(questionIds);
      const createdCount = result.created.length;
      const existingCount = result.existing.length;
      const message =
        createdCount > 0
          ? `${createdCount} Registro(s) de Erro criado(s).${
              existingCount ? ` ${existingCount} já existia(m).` : ""
            }`
          : "As questões selecionadas já possuíam Registros de Erro.";
      this.afterRecordMutation(message);
    } catch (error) {
      this.handleFailure(error, "Não foi possível criar os Registros de Erro.");
    }
  }

  openErrorEditor(view) {
    try {
      const current = this.errorService.getView(view.errorRecord.id);
      const storedDraft = this.draftService.get(
        "error_record",
        current.record.id,
      );
      const recoveredDraft =
        storedDraft &&
        Date.parse(storedDraft.updatedAt) >= Date.parse(current.record.updatedAt)
          ? storedDraft
          : null;
      const settings = this.repository.getEntity("settings", "global");

      openErrorEditorModal({
        document: this.document,
        view: current,
        linkOptions: this.errorService.getLinkOptions(
          current.errorRecord.subjectId,
          current.record.id,
        ),
        recoveredDraft,
        autosaveDelayMs: settings?.autosaveDelayMs ?? 900,
        onAutosave: ({ modalInstanceId, originalState, workingState }) =>
          this.draftService.save({
            subjectId: current.errorRecord.subjectId,
            recordId: current.record.id,
            recordType: "error_record",
            modalInstanceId,
            originalState,
            workingState,
          }),
        onDiscardDraft: () =>
          this.draftService.remove("error_record", current.record.id),
        onSubmit: (values) => {
          const updated = this.errorService.saveAnalysis(
            current.errorRecord.id,
            values,
          );
          this.afterRecordMutation(
            updated.errorRecord.analysis.isComplete
              ? "Análise do erro concluída."
              : "Rascunho da análise salvo.",
          );
        },
        onClose: ({ draftPreserved, discarded, finalSaved }) => {
          this.shell.syncToastLayer();
          if (draftPreserved) {
            this.shell.showToast(
              "Alterações da análise preservadas para continuar depois.",
            );
          } else if (discarded && !finalSaved) {
            this.shell.showToast("Alterações da análise descartadas.");
          }
        },
      });
    } catch (error) {
      this.handleFailure(error, "Não foi possível abrir o Registro de Erro.");
    }
  }

  toggleErrorReviewed(view) {
    try {
      const updated = this.errorService.toggleReviewed(view.errorRecord.id);
      this.afterRecordMutation(
        updated.errorRecord.reviewStatus === "reviewed"
          ? "Erro marcado como revisado."
          : "Erro devolvido para revisão.",
      );
    } catch (error) {
      this.handleFailure(error, "Não foi possível atualizar a revisão do erro.");
    }
  }

  openErrorRecurrence(view) {
    try {
      const current = this.errorService.getView(view.errorRecord.id);
      openErrorEvidenceModal({
        document: this.document,
        view: current,
        candidates: this.errorService.getEvidenceCandidates(
          current.errorRecord.id,
          "recurrence",
        ),
        mode: "recurrence",
        onSubmit: (questionId) => {
          this.errorService.registerRecurrence(current.errorRecord.id, questionId);
          this.afterRecordMutation("Reincidência registrada; a sequência foi reiniciada.");
        },
        onClose: () => this.shell.syncToastLayer(),
      });
    } catch (error) {
      this.handleFailure(error, "Não foi possível registrar a reincidência.");
    }
  }

  openErrorEvidence(view) {
    try {
      const current = this.errorService.getView(view.errorRecord.id);
      openErrorEvidenceModal({
        document: this.document,
        view: current,
        candidates: this.errorService.getEvidenceCandidates(
          current.errorRecord.id,
          "evidence",
        ),
        mode: "evidence",
        onSubmit: (questionId) => {
          const updated = this.errorService.addCorrectEvidence(
            current.errorRecord.id,
            questionId,
          );
          this.afterRecordMutation(
            updated.errorRecord.masteryStatus === "overcome"
              ? "Erro superado após duas respostas corretas consecutivas."
              : "Primeira evidência correta registrada.",
          );
        },
        onClose: () => this.shell.syncToastLayer(),
      });
    } catch (error) {
      this.handleFailure(error, "Não foi possível registrar a evidência.");
    }
  }

  makeGuidedStageCurrent(stage) {
    try {
      const view = this.guidedFlowService.setCurrentStage(this.subject.id, stage);
      this.subject = this.repository.getEntity("subjects", this.subject.id);
      this.shell.setSubjectContext(this.subject);
      this.shell.showToast(`${view.current.label} agora é a etapa atual.`);
      this.renderSection("overview");
    } catch (error) {
      this.handleFailure(error, "Não foi possível alterar a etapa atual.");
    }
  }

  openGuidedStageHelp(stage) {
    openFlowStageHelpModal({
      document: this.document,
      stage,
      onAction: (action) => this.executeGuidedAction(action),
      onClose: () => this.shell.syncToastLayer(),
    });
  }

  executeGuidedAction(action) {
    if (!action?.type) {
      return;
    }
    switch (action.type) {
      case "create_summary":
        this.openCreateRecord("summary");
        break;
      case "open_summary": {
        const record = action.recordId
          ? this.repository.getEntity("records", action.recordId)
          : null;
        if (record) {
          this.openSummaryEditor(record);
        } else {
          this.router.navigate("summaries");
        }
        break;
      }
      case "open_summaries":
        this.router.navigate("summaries");
        break;
      case "open_test_quest":
        this.openTestQuestForSubject();
        break;
      case "import_result":
        this.openTestQuestImport();
        break;
      case "open_exercises":
        this.router.navigate("exercises");
        break;
      case "open_errors":
        this.router.navigate("errors");
        break;
      case "open_metacognitive":
        this.openMetacognitiveReview();
        break;
      case "confirm_consolidation":
        this.openConsolidation();
        break;
      case "open_stage_help": {
        const view = this.guidedFlowService.getView(this.subject.id);
        const stage = view.stages.find(
          (candidate) =>
            candidate.key === (action.stageKey ?? view.recommendedStage),
        );
        if (stage) {
          this.openGuidedStageHelp(stage);
        }
        break;
      }
      default:
        this.shell.showToast("A ação recomendada ainda não está disponível.", "warning");
    }
  }

  openTestQuestForSubject() {
    try {
      const url = new URL(APP_CONFIG.integration.testQuestUrl);
      url.searchParams.set("contractVersion", "1.0.0");
      url.searchParams.set("sentAt", this.clock());
      url.searchParams.set("sourceApp", "study_stack");
      url.searchParams.set("matterId", this.subject.matterId);
      url.searchParams.set("matterName", this.subject.matterName);
      url.searchParams.set("themeId", this.subject.themeId);
      url.searchParams.set("themeName", this.subject.themeName);
      url.searchParams.set("subjectId", this.subject.id);
      url.searchParams.set("subjectName", this.subject.subjectName);
      url.searchParams.set("returnUrl", this.window.location.href);
      const anchor = this.document.createElement("a");
      anchor.href = url.toString();
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.hidden = true;
      this.document.body.append(anchor);
      anchor.click();
      anchor.remove();
      this.shell.showToast("Test Quest aberto com o contexto deste assunto.");
    } catch (error) {
      this.handleFailure(error, "Não foi possível abrir o Test Quest.");
    }
  }

  openMetacognitiveReview() {
    try {
      const view = this.guidedFlowService.getMetacognitiveView(this.subject.id);
      openMetacognitiveReviewModal({
        document: this.document,
        view,
        onCreate: (values) => {
          this.guidedFlowService.createMetacognitiveCheck(this.subject.id, values);
          this.afterRecordMutation("Verificação metacognitiva registrada.");
        },
        onReview: (checkId) => {
          this.guidedFlowService.markMetacognitiveReviewed(
            this.subject.id,
            checkId,
          );
          this.afterRecordMutation("Verificação marcada como revisada.");
        },
        onConfirm: (checkId, questionId) => {
          this.guidedFlowService.confirmMetacognitive(
            this.subject.id,
            checkId,
            questionId,
          );
          this.afterRecordMutation(
            "Compreensão confirmada com outra questão correta.",
          );
        },
        onClose: () => this.shell.syncToastLayer(),
      });
    } catch (error) {
      this.handleFailure(
        error,
        "Não foi possível abrir a verificação metacognitiva.",
      );
    }
  }

  openConsolidation() {
    try {
      const flowView = this.guidedFlowService.getView(this.subject.id);
      openConsolidationModal({
        document: this.document,
        flowView,
        onSubmit: (finalObservation) => {
          this.guidedFlowService.confirmConsolidation(
            this.subject.id,
            finalObservation,
          );
          this.afterRecordMutation("Consolidação final confirmada.");
        },
        onClose: () => this.shell.syncToastLayer(),
      });
    } catch (error) {
      this.handleFailure(error, "Não foi possível abrir a consolidação final.");
    }
  }

  showGuidedFlowNotice() {
    if (!this.subject || !this.guidedFlowService || !this.shell) {
      return;
    }
    try {
      const notice = this.guidedFlowService.consumeAdvanceNotice(this.subject.id);
      if (notice) {
        this.subject = this.repository.getEntity("subjects", this.subject.id);
        this.shell.showToast(notice.message, notice.type);
        if (this.router?.getCurrentSection() === "overview") {
          this.renderSection("overview");
        }
      }
    } catch (error) {
      console.error("Não foi possível atualizar o aviso do roteiro.", error);
    }
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
          if (["summary", "note", "error_record"].includes(record.type)) {
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
    this.window.setTimeout(() => this.showGuidedFlowNotice(), 100);
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
    try {
      this.diagnosticService?.record({
        operation: message,
        message: error instanceof Error ? error.message : String(error),
        recoverable: true,
      });
    } catch (logError) {
      console.error("Não foi possível registrar o evento técnico.", logError);
    }
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

  getMaintenanceInfo() {
    const settings = this.repository.getEntity("settings", "global");
    return Object.freeze({
      lastBackupAt: settings?.lastBackupAt ?? null,
      pendingImportCount: this.exerciseService.listPending().length,
      recoveryPointAvailable: Boolean(this.backupService.getRecoveryPoint()),
    });
  }

  createBackup() {
    try {
      const backup = this.backupService.createBackup();
      const blob = new Blob([backup.json], { type: "application/json" });
      const url = this.window.URL.createObjectURL(blob);
      const anchor = this.document.createElement("a");
      anchor.href = url;
      anchor.download = backup.fileName;
      anchor.hidden = true;
      this.document.body.append(anchor);
      anchor.click();
      anchor.remove();
      this.window.setTimeout(() => this.window.URL.revokeObjectURL(url), 0);
      this.updateShellState();
      this.shell.showToast("Backup JSON criado com sucesso.");
      if (this.router?.getCurrentSection() === "settings") {
        this.renderSection("settings");
      }
      return backup;
    } catch (error) {
      this.handleFailure(error, "Não foi possível criar o backup.");
      return null;
    }
  }

  openRestore() {
    openRestoreModal({
      document: this.document,
      onParse: (text) => this.backupService.parse(text),
      onPreview: (envelope, mode) => this.backupService.preview(envelope, mode),
      onRestore: (envelope, mode) => {
        try {
          const result = this.backupService.restore(envelope, mode);
          const conflictNotice = result.conflicts.length
            ? ` ${result.conflicts.length} conflito(s) foram preservados.`
            : "";
          this.shell.showToast(`Restauração concluída.${conflictNotice}`);
          this.window.setTimeout(() => this.window.location.reload(), 450);
          return true;
        } catch (error) {
          this.handleFailure(error, "Não foi possível aplicar a restauração.");
          return false;
        }
      },
      onClose: () => this.shell.syncToastLayer(),
    });
  }

  openDiagnostics() {
    try {
      const report = this.diagnosticService.run();
      openDiagnosticModal({
        document: this.document,
        report,
        onBackup: () => this.createBackup(),
        onRestoreRecovery: () => this.confirmRestoreRecoveryPoint(),
        onClearRecovery: () => {
          this.backupService.clearRecoveryPoint();
          this.shell.showToast("Ponto de recuperação removido.");
          if (this.router.getCurrentSection() === "settings") {
            this.renderSection("settings");
          }
        },
        onClose: () => this.shell.syncToastLayer(),
      });
    } catch (error) {
      this.handleFailure(error, "Não foi possível executar o diagnóstico.");
    }
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
          this.backupService.restoreRecoveryPoint();
          this.shell.showToast("Estado anterior recuperado.");
          this.window.setTimeout(() => this.window.location.reload(), 450);
        } catch (error) {
          this.handleFailure(error, "Não foi possível recuperar o estado anterior.");
        }
      },
      onClose: () => this.shell.syncToastLayer(),
    });
  }

  openPendingImports() {
    openPendingImportsModal({
      document: this.document,
      entries: this.exerciseService.listPending(),
      onDismiss: (id) => {
        try {
          this.exerciseService.dismissPending(id);
          this.shell.showToast("Pendência descartada sem importar o conteúdo.");
          if (this.router.getCurrentSection() === "settings") {
            this.renderSection("settings");
          }
        } catch (error) {
          this.handleFailure(error, "Não foi possível descartar a pendência.");
        }
      },
      onClose: () => this.shell.syncToastLayer(),
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

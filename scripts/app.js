import { APP_CONFIG } from "./config/app-config.js";
import { ConceptCompassAdapter } from "./integrations/concept-compass-adapter.js";
import { SubjectService } from "./services/subject-service.js";
import { LocalStorageAdapter } from "./storage/local-storage-adapter.js";
import { MigrationRunner } from "./storage/migrations/migration-runner.js";
import { StateRepository } from "./storage/state-repository.js";
import { createInitialState } from "./storage/state-schema.js";
import { PreferencesService } from "./services/preferences-service.js";
import { AppShell } from "./ui/app-shell.js";
import { Router } from "./ui/router.js";
import { renderMissingContextState } from "./ui/states/missing-context-state.js";
import { renderOverviewSection } from "./ui/sections/overview-section.js";
import { renderPlaceholderSection } from "./ui/sections/placeholder-section.js";
import { renderSettingsSection } from "./ui/sections/settings-section.js";

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
    this.preferencesService = null;
    this.subjectService = null;
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
      migrationRunner: new MigrationRunner(
        APP_CONFIG.storage.schemaVersion,
      ),
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

    this.shell = new AppShell({
      document: this.document,
      window: this.window,
      config: APP_CONFIG,
      onPreferencesChange: (partial) => {
        this.updatePreferences(partial);
      },
    });

    this.shell.initialize(this.preferences);
    this.shell.setSubjectContext(this.subject ?? this.context);
    this.shell.setStorageStatus({
      schemaVersion: APP_CONFIG.storage.schemaVersion,
      saved: true,
    });
    this.shell.onNavigate((sectionId) => {
      this.router.navigate(sectionId);
    });
    this.shell.onReturn(() => {
      this.returnToConceptCompass();
    });

    this.router = new Router(
      this.window,
      this.preferences.startSection || APP_CONFIG.defaultSection,
    );
    this.router.onChange((sectionId) => {
      this.renderSection(sectionId);
    });
    this.router.start();
  }

  updatePreferences(partial) {
    try {
      this.preferences = this.preferencesService.update(
        this.preferences,
        partial,
      );
      this.shell.applyPreferences(this.preferences);
      this.shell.setStorageStatus({
        schemaVersion: APP_CONFIG.storage.schemaVersion,
        saved: true,
      });
      this.shell.showToast("Preferências salvas no estado v1.");

      if (this.router.getCurrentSection() === "settings") {
        this.renderSection("settings");
      }
    } catch (error) {
      console.error(error);
      this.shell.setStorageStatus({
        schemaVersion: APP_CONFIG.storage.schemaVersion,
        saved: false,
      });
      this.shell.showToast(
        "Não foi possível salvar as preferências.",
        "warning",
      );
    }
  }

  resetPreferences() {
    try {
      this.preferences = this.preferencesService.reset();
      this.shell.applyPreferences(this.preferences);
      this.shell.showToast("Preferências restauradas.");
      this.renderSection("settings");
    } catch (error) {
      console.error(error);
      this.shell.showToast(
        "Não foi possível restaurar as preferências.",
        "warning",
      );
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

    if (sectionId === "overview") {
      renderOverviewSection({
        document: this.document,
        container,
        context: this.context,
        subject: this.subject,
        storageInfo: this.getStorageInfo(),
        navigate: (target) => this.router.navigate(target),
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

  getStorageInfo() {
    const state = this.repository.getState();

    return Object.freeze({
      storageKey: `${APP_CONFIG.storageNamespace}:${APP_CONFIG.storage.stateKey}`,
      schemaVersion: state.schemaVersion,
      appVersion: state.appVersion,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      subjectCount: state.integrity.collectionCounts.subjects,
      historyCount: state.integrity.collectionCounts.historyEvents,
      integrityStatus: state.integrity.status,
    });
  }

  returnToConceptCompass() {
    const returnUrl = ConceptCompassAdapter.getReturnUrl(
      this.context,
      APP_CONFIG,
    );

    if (!returnUrl) {
      this.shell.showToast(
        "Nenhum endereço seguro de retorno foi encontrado.",
        "warning",
      );
      return;
    }

    if (this.context.source === "development-fixture") {
      this.shell.showToast(
        "Retorno simulado no contexto de desenvolvimento.",
      );
      return;
    }

    this.window.location.assign(returnUrl);
  }
}

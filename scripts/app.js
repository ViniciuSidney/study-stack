import { APP_CONFIG } from "./config/app-config.js";
import { ConceptCompassAdapter } from "./integrations/concept-compass-adapter.js";
import { LocalStorageAdapter } from "./storage/local-storage-adapter.js";
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
    this.preferences = null;
    this.shell = null;
    this.router = null;
    this.preferencesService = null;
  }

  start() {
    const storage = new LocalStorageAdapter(
      this.window.localStorage,
      APP_CONFIG.storageNamespace,
    );

    this.preferencesService = new PreferencesService(
      storage,
      APP_CONFIG.preferenceDefaults,
    );
    this.preferences = this.preferencesService.load();

    this.context = ConceptCompassAdapter.resolveSubjectContext(
      this.window.location,
      APP_CONFIG,
    );

    this.shell = new AppShell({
      document: this.document,
      window: this.window,
      config: APP_CONFIG,
      onPreferencesChange: (partial) => {
        this.updatePreferences(partial);
      },
    });

    this.shell.initialize(this.preferences);
    this.shell.setSubjectContext(this.context);
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
      this.shell.showToast("Preferências salvas.");

      if (this.router.getCurrentSection() === "settings") {
        this.renderSection("settings");
      }
    } catch (error) {
      console.error(error);
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
        onUpdate: (partial) => this.updatePreferences(partial),
        onReset: () => this.resetPreferences(),
      });
      this.shell.focusContent();
      return;
    }

    if (!this.context.valid) {
      renderMissingContextState({
        document: this.document,
        container,
        context: this.context,
        onOpenDevelopmentContext: () => {
          const url = new URL(this.window.location.href);
          url.searchParams.delete("noContext");
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

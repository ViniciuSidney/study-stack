import { getNavigationItem } from "../domain/navigation.js";
import { getRequiredElement } from "../utils/dom.js";

export class AppShell {
  constructor({ document, window, config, onPreferencesChange }) {
    this.document = document;
    this.window = window;
    this.config = config;
    this.onPreferencesChange = onPreferencesChange;
    this.navigateListener = null;
    this.returnListener = null;
    this.newRecordListener = null;
    this.backupListener = null;
    this.restoreListener = null;
    this.diagnosticListener = null;
    this.toastObserver = null;
    this.preferences = null;
    this.drawerOpen = false;

    this.elements = {
      appShell: getRequiredElement(document, "#appShell"),
      navigationToggle: getRequiredElement(document, "#navigationToggle"),
      desktopSidebar: getRequiredElement(document, "#desktopSidebar"),
      mobileDrawer: getRequiredElement(document, "#mobileDrawer"),
      drawerBackdrop: getRequiredElement(document, "#drawerBackdrop"),
      closeDrawerButton: getRequiredElement(document, "#closeDrawerButton"),
      mainContent: getRequiredElement(document, "#mainContent"),
      utilitiesButton: getRequiredElement(document, "#utilitiesButton"),
      utilitiesMenu: getRequiredElement(document, "#utilitiesMenu"),
      returnButton: getRequiredElement(document, "#returnButton"),
      subjectArea: getRequiredElement(document, "#subjectArea"),
      subjectTheme: getRequiredElement(document, "#subjectTheme"),
      subjectBreadcrumbName: getRequiredElement(
        document,
        "#subjectBreadcrumbName",
      ),
      subjectTitle: getRequiredElement(document, "#subjectTitle"),
      subjectStatus: getRequiredElement(document, "#subjectStatus"),
      saveState: getRequiredElement(document, "#saveState"),
      newRecordButton: getRequiredElement(document, "#newRecordButton"),
      progressButton: getRequiredElement(document, "#progressButton"),
      toastRegion: getRequiredElement(document, "#toastRegion"),
    };

    this.handleResize = this.handleResize.bind(this);
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  initialize(preferences) {
    this.preferences = preferences;
    this.applyPreferences(preferences);
    this.#bindEvents();
    this.toastObserver = new this.window.MutationObserver(() => {
      this.syncToastLayer();
    });
    this.toastObserver.observe(this.document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["open"],
    });

    this.window.addEventListener("resize", this.handleResize);
    this.document.addEventListener("click", this.handleDocumentClick);
    this.document.addEventListener("keydown", this.handleKeydown);
  }

  destroy() {
    this.window.removeEventListener("resize", this.handleResize);
    this.document.removeEventListener("click", this.handleDocumentClick);
    this.document.removeEventListener("keydown", this.handleKeydown);
    this.toastObserver?.disconnect();
  }

  onNavigate(listener) {
    this.navigateListener = listener;
  }

  onReturn(listener) {
    this.returnListener = listener;
  }

  onNewRecord(listener) {
    this.newRecordListener = listener;
  }

  onBackup(listener) {
    this.backupListener = listener;
  }

  onRestore(listener) {
    this.restoreListener = listener;
  }

  onDiagnostics(listener) {
    this.diagnosticListener = listener;
  }

  getContentContainer() {
    return this.elements.mainContent;
  }

  setMissingContextMode(enabled) {
    this.elements.appShell.classList.toggle(
      "missing-context-mode",
      Boolean(enabled),
    );
  }

  setSubjectContext(context) {
    if (context.valid === false || (!context.valid && !context.id)) {
      this.elements.subjectArea.textContent = "Concept Compass";
      this.elements.subjectTheme.textContent = "Vínculo";
      this.elements.subjectBreadcrumbName.textContent = "Ausente";
      this.elements.subjectTitle.textContent = "Assunto não identificado";
      this.elements.subjectStatus.textContent = "Vínculo ausente";
      this.elements.subjectStatus.className =
        "status-badge status-warning";
      return;
    }

    this.elements.subjectArea.textContent =
      context.matterName || context.subjectArea;
    this.elements.subjectTheme.textContent = context.themeName;
    this.elements.subjectBreadcrumbName.textContent =
      context.subjectName;
    this.elements.subjectTitle.textContent = context.subjectName;
    const statusLabels = {
      initial_base: "Base inicial",
      in_practice: "Em prática",
      in_review: "Em revisão",
      consolidated: "Consolidado",
      custom: "Personalizado",
    };
    this.elements.subjectStatus.textContent =
      statusLabels[context.studyState] || "Base inicial";
    this.elements.subjectStatus.className = "status-badge status-base";
  }

  setNewRecordEnabled(enabled) {
    this.elements.newRecordButton.disabled = !enabled;
    this.elements.newRecordButton.title = enabled
      ? "Criar um Resumo ou uma Anotação."
      : "Abra a aplicação com um assunto válido para criar registros.";
  }

  setProgress(progress) {
    const strong = this.elements.progressButton.querySelector("strong");
    const label = this.elements.progressButton.querySelector("span");

    if (!progress) {
      strong.textContent = "0/10";
      label.textContent = "Sem vínculo";
      this.elements.progressButton.disabled = true;
      this.elements.progressButton.title = "Abra um assunto válido para ver o progresso.";
      return;
    }

    strong.textContent = `${progress.currentTotal}/${progress.goalTotal}`;
    label.textContent = `${progress.percentage}% concluído`;
    this.elements.progressButton.disabled = false;
    this.elements.progressButton.title = "Abrir a Visão Geral e conferir as evidências.";
  }

  updateCounters(counts) {
    const values = {
      summaries: counts.summaries ?? 0,
      notes: counts.notes ?? 0,
      exercises: counts.exercises ?? 0,
      errors: counts.errors ?? 0,
      archived: counts.archived ?? 0,
    };

    this.document.querySelectorAll("[data-section]").forEach((button) => {
      const counter = button.querySelector(".nav-count");
      if (counter && Object.hasOwn(values, button.dataset.section)) {
        counter.textContent = String(values[button.dataset.section]);
      }
    });
  }

  setStorageStatus({ schemaVersion, saved }) {
    this.elements.saveState.textContent = saved
      ? `Schema ${schemaVersion} · salvo localmente`
      : `Schema ${schemaVersion} · falha ao salvar`;
    this.elements.saveState.classList.toggle("save-error", !saved);
  }

  setActiveSection(sectionId) {
    const item = getNavigationItem(sectionId);

    this.document.querySelectorAll("[data-section]").forEach((button) => {
      const active = button.dataset.section === sectionId;
      button.classList.toggle("active", active);

      if (active) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    this.document.title = item
      ? `${item.label} | ${this.config.appName}`
      : this.config.appName;
  }

  applyPreferences(preferences) {
    this.preferences = preferences;
    this.#applyTheme(preferences.theme);

    this.document.documentElement.dataset.reducedMotion = String(
      preferences.reducedMotion,
    );

    this.elements.appShell.classList.toggle(
      "sidebar-collapsed",
      !preferences.sidebarOpen,
    );
    this.elements.appShell.classList.toggle(
      "no-counters",
      !preferences.showCounters,
    );

    this.#updateNavigationToggle();
  }

  focusContent() {
    this.elements.mainContent.focus({ preventScroll: true });
  }

  syncToastLayer() {
    const openDialogs = [...this.document.querySelectorAll("dialog[open]")];
    const topDialog = openDialogs.at(-1);
    const target = topDialog ?? this.document.body;

    if (this.elements.toastRegion.parentElement !== target) {
      target.append(this.elements.toastRegion);
    }
  }

  showToast(message, type = "success") {
    this.syncToastLayer();
    const toast = this.document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    this.elements.toastRegion.append(toast);

    this.window.setTimeout(() => {
      toast.remove();
      if (!this.elements.toastRegion.children.length) {
        this.syncToastLayer();
      }
    }, 3200);
  }

  closeUtilitiesMenu() {
    this.elements.utilitiesMenu.hidden = true;
    this.elements.utilitiesButton.setAttribute("aria-expanded", "false");
  }

  handleResize() {
    if (!this.#isMobile() && this.drawerOpen) {
      this.closeMobileDrawer();
    }

    this.#updateNavigationToggle();
  }

  handleDocumentClick(event) {
    if (
      !this.elements.utilitiesMenu.hidden &&
      !event.target.closest(".utilities")
    ) {
      this.closeUtilitiesMenu();
    }
  }

  handleKeydown(event) {
    if (event.key !== "Escape") {
      return;
    }

    if (this.drawerOpen) {
      this.closeMobileDrawer();
      return;
    }

    this.closeUtilitiesMenu();
  }

  #bindEvents() {
    this.elements.navigationToggle.addEventListener("click", () => {
      if (this.#isMobile()) {
        this.openMobileDrawer();
        return;
      }

      const sidebarOpen =
        this.elements.appShell.classList.contains("sidebar-collapsed");

      this.onPreferencesChange({ sidebarOpen });
    });

    this.elements.closeDrawerButton.addEventListener("click", () => {
      this.closeMobileDrawer();
    });

    this.elements.drawerBackdrop.addEventListener("click", () => {
      this.closeMobileDrawer();
    });

    this.document.querySelectorAll("[data-section]").forEach((button) => {
      button.addEventListener("click", () => {
        this.navigateListener?.(button.dataset.section);

        if (this.drawerOpen) {
          this.closeMobileDrawer();
        }
      });
    });

    this.elements.utilitiesButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = this.elements.utilitiesMenu.hidden;
      this.elements.utilitiesMenu.hidden = !willOpen;
      this.elements.utilitiesButton.setAttribute(
        "aria-expanded",
        String(willOpen),
      );
    });

    this.elements.utilitiesMenu
      .querySelector('[data-utility="settings"]')
      .addEventListener("click", () => {
        this.closeUtilitiesMenu();
        this.navigateListener?.("settings");
      });

    this.elements.utilitiesMenu
      .querySelector('[data-utility="backup"]')
      .addEventListener("click", () => {
        this.closeUtilitiesMenu();
        this.backupListener?.();
      });

    this.elements.utilitiesMenu
      .querySelector('[data-utility="restore"]')
      .addEventListener("click", () => {
        this.closeUtilitiesMenu();
        this.restoreListener?.();
      });

    this.elements.utilitiesMenu
      .querySelector('[data-utility="diagnostics"]')
      .addEventListener("click", () => {
        this.closeUtilitiesMenu();
        this.diagnosticListener?.();
      });

    this.elements.returnButton.addEventListener("click", () => {
      this.returnListener?.();
    });

    this.elements.newRecordButton.addEventListener("click", () => {
      this.newRecordListener?.();
    });

    this.elements.progressButton.addEventListener("click", () => {
      this.navigateListener?.("overview");
    });
  }

  openMobileDrawer() {
    this.drawerOpen = true;
    this.elements.mobileDrawer.classList.add("open");
    this.elements.mobileDrawer.setAttribute("aria-hidden", "false");
    this.elements.drawerBackdrop.hidden = false;
    this.document.body.classList.add("drawer-open");
    this.#updateNavigationToggle();
    this.elements.closeDrawerButton.focus();
  }

  closeMobileDrawer() {
    this.drawerOpen = false;
    this.elements.mobileDrawer.classList.remove("open");
    this.elements.mobileDrawer.setAttribute("aria-hidden", "true");
    this.elements.drawerBackdrop.hidden = true;
    this.document.body.classList.remove("drawer-open");
    this.#updateNavigationToggle();
    this.elements.navigationToggle.focus();
  }

  #applyTheme(themePreference) {
    const prefersDark = this.window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const resolvedTheme =
      themePreference === "system"
        ? prefersDark
          ? "dark"
          : "light"
        : themePreference;

    this.document.documentElement.dataset.theme = resolvedTheme;
  }

  #isMobile() {
    return this.window.innerWidth <= this.config.mobileBreakpoint;
  }

  #updateNavigationToggle() {
    const desktopOpen =
      !this.elements.appShell.classList.contains("sidebar-collapsed");
    const expanded = this.#isMobile() ? this.drawerOpen : desktopOpen;
    const action = expanded ? "Fechar" : "Abrir";

    this.elements.navigationToggle.setAttribute(
      "aria-expanded",
      String(expanded),
    );
    this.elements.navigationToggle.setAttribute(
      "aria-label",
      `${action} navegação lateral`,
    );
  }
}

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

    this.window.addEventListener("resize", this.handleResize);
    this.document.addEventListener("click", this.handleDocumentClick);
    this.document.addEventListener("keydown", this.handleKeydown);
  }

  destroy() {
    this.window.removeEventListener("resize", this.handleResize);
    this.document.removeEventListener("click", this.handleDocumentClick);
    this.document.removeEventListener("keydown", this.handleKeydown);
  }

  onNavigate(listener) {
    this.navigateListener = listener;
  }

  onReturn(listener) {
    this.returnListener = listener;
  }

  getContentContainer() {
    return this.elements.mainContent;
  }

  setSubjectContext(context) {
    if (!context.valid) {
      this.elements.subjectArea.textContent = "Concept Compass";
      this.elements.subjectTheme.textContent = "Vínculo";
      this.elements.subjectBreadcrumbName.textContent = "Ausente";
      this.elements.subjectTitle.textContent = "Assunto não identificado";
      this.elements.subjectStatus.textContent = "Vínculo ausente";
      this.elements.subjectStatus.className =
        "status-badge status-warning";
      return;
    }

    this.elements.subjectArea.textContent = context.subjectArea;
    this.elements.subjectTheme.textContent = context.themeName;
    this.elements.subjectBreadcrumbName.textContent =
      context.subjectName;
    this.elements.subjectTitle.textContent = context.subjectName;
    this.elements.subjectStatus.textContent = "Base inicial";
    this.elements.subjectStatus.className = "status-badge status-base";
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

  showToast(message, type = "success") {
    const toast = this.document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    this.elements.toastRegion.append(toast);

    this.window.setTimeout(() => {
      toast.remove();
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

    this.elements.returnButton.addEventListener("click", () => {
      this.returnListener?.();
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

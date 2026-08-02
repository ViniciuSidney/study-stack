import {
  clearElement,
  createElement,
} from "../../utils/dom.js";

function createSelectField(document, labelText, name, options, value) {
  const field = createElement(document, "div", { className: "field" });
  const label = createElement(document, "label", {
    text: labelText,
    attributes: { for: name },
  });
  const select = createElement(document, "select", {
    attributes: { id: name, name },
  });

  options.forEach((option) => {
    const element = createElement(document, "option", {
      text: option.label,
      attributes: { value: option.value },
    });

    element.selected = option.value === value;
    select.append(element);
  });

  field.append(label, select);
  return { field, select };
}

function createToggle(document, labelText, description, checked) {
  const row = createElement(document, "label", {
    className: "toggle-row",
  });

  const copy = createElement(document, "span");
  copy.append(
    createElement(document, "strong", { text: labelText }),
    document.createElement("br"),
    createElement(document, "span", { text: description }),
  );

  const switchLabel = createElement(document, "span", {
    className: "switch",
  });
  const input = createElement(document, "input", {
    attributes: { type: "checkbox" },
  });
  input.checked = checked;
  switchLabel.append(
    input,
    createElement(document, "span", {
      className: "switch-track",
      attributes: { "aria-hidden": "true" },
    }),
  );

  row.append(copy, switchLabel);
  return { row, input };
}

export function renderSettingsSection({
  document,
  container,
  preferences,
  onUpdate,
  onReset,
}) {
  clearElement(container);

  const inner = createElement(document, "div", {
    className: "content-inner",
  });

  const header = createElement(document, "header", {
    className: "section-header",
  });
  const headerCopy = createElement(document, "div");
  headerCopy.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Aplicação",
    }),
    createElement(document, "h2", { text: "Configurações" }),
    createElement(document, "p", {
      className: "section-description",
      text:
        "Preferências globais ficam separadas dos registros do assunto e " +
        "já são persistidas localmente.",
    }),
  );
  header.append(headerCopy);

  const grid = createElement(document, "section", {
    className: "settings-grid",
  });

  const appearancePanel = createElement(document, "article", {
    className: "panel settings-panel",
  });
  appearancePanel.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Aparência",
    }),
    createElement(document, "h3", { text: "Tema e movimento" }),
  );

  const themeField = createSelectField(
    document,
    "Tema",
    "themePreference",
    [
      { value: "system", label: "Usar preferência do sistema" },
      { value: "light", label: "Claro" },
      { value: "dark", label: "Escuro" },
    ],
    preferences.theme,
  );

  const motionToggle = createToggle(
    document,
    "Reduzir animações",
    "Diminui transições e movimentos decorativos.",
    preferences.reducedMotion,
  );

  appearancePanel.append(themeField.field, motionToggle.row);

  const navigationPanel = createElement(document, "article", {
    className: "panel settings-panel",
  });
  navigationPanel.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Navegação",
    }),
    createElement(document, "h3", { text: "Comportamento inicial" }),
  );

  const startSectionField = createSelectField(
    document,
    "Seção inicial",
    "startSectionPreference",
    [
      { value: "overview", label: "Visão Geral" },
      { value: "summaries", label: "Resumos" },
      { value: "notes", label: "Anotações" },
      { value: "exercises", label: "Exercícios" },
      { value: "errors", label: "Erros" },
      { value: "history", label: "Histórico" },
      { value: "archived", label: "Arquivados" },
    ],
    preferences.startSection,
  );

  const sidebarToggle = createToggle(
    document,
    "Abrir sidebar no desktop",
    "Define o estado inicial da navegação lateral.",
    preferences.sidebarOpen,
  );
  const countersToggle = createToggle(
    document,
    "Mostrar contadores",
    "Exibe indicadores compactos na navegação.",
    preferences.showCounters,
  );

  navigationPanel.append(
    startSectionField.field,
    sidebarToggle.row,
    countersToggle.row,
  );

  const resetPanel = createElement(document, "article", {
    className: "panel settings-panel",
  });
  resetPanel.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Manutenção",
    }),
    createElement(document, "h3", { text: "Restaurar preferências" }),
    createElement(document, "p", {
      text:
        "Remove somente as preferências desta fundação. Nenhum dado de " +
        "estudo existe nesta etapa.",
    }),
  );
  const resetButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Restaurar padrões",
    attributes: { type: "button" },
  });
  resetButton.addEventListener("click", onReset);
  const resetActions = createElement(document, "div", {
    className: "action-row",
  });
  resetActions.append(resetButton);
  resetPanel.append(resetActions);

  themeField.select.addEventListener("change", (event) => {
    onUpdate({ theme: event.target.value });
  });
  startSectionField.select.addEventListener("change", (event) => {
    onUpdate({ startSection: event.target.value });
  });
  motionToggle.input.addEventListener("change", (event) => {
    onUpdate({ reducedMotion: event.target.checked });
  });
  sidebarToggle.input.addEventListener("change", (event) => {
    onUpdate({ sidebarOpen: event.target.checked });
  });
  countersToggle.input.addEventListener("change", (event) => {
    onUpdate({ showCounters: event.target.checked });
  });

  grid.append(appearancePanel, navigationPanel, resetPanel);
  inner.append(header, grid);
  container.append(inner);
}

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

function createDetails(document, label) {
  const details = createElement(document, "details", {
    className: "settings-details",
  });
  const summary = createElement(document, "summary", {
    text: label,
  });
  const content = createElement(document, "div", {
    className: "settings-details-content",
  });
  details.append(summary, content);
  return { details, content };
}

export function renderSettingsSection({
  document,
  container,
  preferences,
  storageInfo,
  maintenanceInfo,
  onUpdate,
  onReset,
  onBackup,
  onRestore,
  onDiagnostics,
  onPendingImports,
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
        "Ajuste a aparência, a navegação e cuide dos dados salvos neste navegador.",
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

  const maintenancePanel = createElement(document, "article", {
    className: "panel settings-panel settings-maintenance-panel",
  });
  maintenancePanel.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Segurança dos dados",
    }),
    createElement(document, "h3", { text: "Backup e manutenção" }),
    createElement(document, "p", {
      text:
        "Crie uma cópia dos seus dados ou restaure um backup quando precisar recuperar informações.",
    }),
  );

  const maintenanceSummary = createElement(document, "div", {
    className: "maintenance-summary",
  });
  maintenanceSummary.append(
    createElement(document, "span", {
      text: maintenanceInfo.lastBackupAt
        ? `Último backup: ${new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date(maintenanceInfo.lastBackupAt))}`
        : "Você ainda não criou um backup manual.",
    }),
  );
  if (maintenanceInfo.pendingImportCount > 0) {
    maintenanceSummary.append(
      createElement(document, "span", {
        text: `${maintenanceInfo.pendingImportCount} importação(ões) aguardando sua atenção.`,
      }),
    );
  }

  const maintenanceActions = createElement(document, "div", {
    className: "maintenance-actions",
  });
  const backupButton = createElement(document, "button", {
    className: "button button-primary",
    text: "Criar backup",
    attributes: { type: "button" },
  });
  const restoreButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Restaurar backup",
    attributes: { type: "button" },
  });
  backupButton.addEventListener("click", onBackup);
  restoreButton.addEventListener("click", onRestore);
  maintenanceActions.append(backupButton, restoreButton);

  const maintenanceTools = createDetails(document, "Ferramentas de manutenção");
  maintenanceTools.content.append(
    createElement(document, "p", {
      text:
        "Use estas opções quando precisar verificar o armazenamento ou revisar resultados de importação que não foram aplicados.",
    }),
  );
  const maintenanceToolsActions = createElement(document, "div", {
    className: "action-row",
  });
  const diagnosticButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Verificar armazenamento",
    attributes: { type: "button" },
  });
  const pendingButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Ver importações pendentes",
    attributes: { type: "button" },
  });
  pendingButton.disabled = maintenanceInfo.pendingImportCount === 0;
  diagnosticButton.addEventListener("click", onDiagnostics);
  pendingButton.addEventListener("click", onPendingImports);
  maintenanceToolsActions.append(diagnosticButton, pendingButton);
  maintenanceTools.content.append(maintenanceToolsActions);

  maintenancePanel.append(
    maintenanceSummary,
    maintenanceActions,
    maintenanceTools.details,
  );

  const resetPanel = createElement(document, "article", {
    className: "panel settings-panel",
  });
  resetPanel.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Preferências",
    }),
    createElement(document, "h3", { text: "Restaurar configurações padrão" }),
    createElement(document, "p", {
      text:
        "Restaura apenas aparência e navegação. Seus Resumos, Anotações, Exercícios e demais dados de estudo não serão apagados.",
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

  const storagePanel = createElement(document, "article", {
    className: "panel settings-panel settings-technical-panel",
  });
  storagePanel.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Informações da aplicação",
    }),
    createElement(document, "h3", { text: "Dados técnicos" }),
    createElement(document, "p", {
      text:
        "Estas informações ajudam em diagnóstico e suporte, mas não são necessárias no uso normal do Study Stack.",
    }),
  );

  const technicalDetails = createDetails(document, "Mostrar detalhes técnicos");
  technicalDetails.content.append(
    createElement(document, "p", {
      text: `Versão dos dados: ${storageInfo.schemaVersion} · ${storageInfo.subjectCount} assunto(s) armazenado(s) · ${storageInfo.recordCount} registro(s).`,
    }),
    createElement(document, "div", {
      className: "code-block",
      text: storageInfo.storageKey,
    }),
  );
  storagePanel.append(technicalDetails.details);

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

  grid.append(
    appearancePanel,
    navigationPanel,
    maintenancePanel,
    resetPanel,
    storagePanel,
  );
  inner.append(header, grid);
  container.append(inner);
}

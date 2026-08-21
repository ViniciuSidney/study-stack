import { createElement } from "../../utils/dom.js";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value) {
  if (!value) return "Não disponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function createDetails(document, label, className = "") {
  const details = createElement(document, "details", {
    className: `diagnostic-details ${className}`.trim(),
  });
  details.append(createElement(document, "summary", { text: label }));
  const content = createElement(document, "div", {
    className: "diagnostic-details-content",
  });
  details.append(content);
  return { details, content };
}

const INTEGRATION_META = {
  ConceptCompass: {
    label: "Concept Compass",
    description: "Contexto de matérias, temas e assuntos.",
  },
  TestQuest: {
    label: "Test Quest",
    description: "Listas, questões e resultados de exercícios.",
  },
  FlashCore: {
    label: "FlashCore",
    description: "Flashcards e revisões, integração prevista para versões futuras.",
  },
};

const INTEGRATION_STATE_META = {
  connected: { label: "Conectado", className: "connected" },
  idle: { label: "Disponível", className: "idle" },
  future: { label: "Planejado", className: "future" },
  disconnected: { label: "Indisponível", className: "disconnected" },
};

function normalizeIntegrationState(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return INTEGRATION_STATE_META[normalized]
    ? normalized
    : "disconnected";
}

function createIntegrationRow(document, name, value) {
  const meta = INTEGRATION_META[name] ?? {
    label: name,
    description: "Integração registrada pelo Study Stack.",
  };
  const state = normalizeIntegrationState(value);
  const stateMeta = INTEGRATION_STATE_META[state];

  const row = createElement(document, "div", {
    className: `diagnostic-integration-row integration-${state}`,
  });
  const copy = createElement(document, "div", {
    className: "diagnostic-integration-copy",
  });
  copy.append(
    createElement(document, "strong", { text: meta.label }),
    createElement(document, "small", { text: meta.description }),
  );
  row.append(
    copy,
    createElement(document, "span", {
      className: `diagnostic-integration-badge integration-badge-${stateMeta.className}`,
      text: stateMeta.label,
    }),
  );
  return row;
}

export function openDiagnosticModal({
  document,
  report,
  onBackup,
  onRestoreRecovery,
  onClearRecovery,
  onClose = () => {},
}) {
  const dialog = createElement(document, "dialog", {
    className: "modal diagnostic-modal",
  });
  const card = createElement(document, "div", {
    className: "modal-card diagnostic-card",
  });

  const header = createElement(document, "header", { className: "modal-header" });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", { className: "eyebrow", text: "Manutenção" }),
    createElement(document, "h2", { text: "Verificação do armazenamento" }),
    createElement(document, "p", {
      className: "modal-description",
      text: "Confira se os dados locais do Study Stack estão íntegros e se existe algo que precisa da sua atenção.",
    }),
  );
  const closeButton = createElement(document, "button", {
    className: "icon-button",
    text: "×",
    attributes: { type: "button", "aria-label": "Fechar verificação" },
  });
  header.append(copy, closeButton);

  const body = createElement(document, "div", {
    className: "modal-body diagnostic-body",
  });

  const statusLabels = {
    healthy: {
      title: "Tudo certo com seus dados",
      description: "Nenhum problema de integridade foi encontrado nesta verificação.",
    },
    warning: {
      title: "Há itens que merecem atenção",
      description: "Seus dados continuam acessíveis, mas existem avisos que vale a pena revisar.",
    },
    error: {
      title: "Foram encontrados problemas nos dados",
      description: "Revise os resultados abaixo antes de continuar fazendo alterações importantes.",
    },
  };
  const statusCopy = statusLabels[report.status] ?? statusLabels.warning;
  const status = createElement(document, "section", {
    className: `diagnostic-status diagnostic-${report.status}`,
  });
  const statusText = createElement(document, "div", {
    className: "diagnostic-status-copy",
  });
  statusText.append(
    createElement(document, "strong", { text: statusCopy.title }),
    createElement(document, "p", { text: statusCopy.description }),
  );
  status.append(
    statusText,
    createElement(document, "small", {
      text: `Verificado em ${formatDate(report.checkedAt)}`,
    }),
  );
  body.append(status);

  const metrics = createElement(document, "section", {
    className: "diagnostic-metrics diagnostic-summary-metrics",
  });
  const metricData = [
    ["Assuntos", report.collectionCounts.subjects],
    ["Registros", report.collectionCounts.records],
    ["Sessões", report.collectionCounts.importedSessions],
    ["Erros", report.collectionCounts.errorRecords],
    ["Rascunhos", report.drafts.length],
    ["Pendências", report.pendingImports.length],
  ];
  metricData.forEach(([label, value]) => {
    const metric = createElement(document, "div");
    metric.append(
      createElement(document, "strong", { text: value }),
      createElement(document, "span", { text: label }),
    );
    metrics.append(metric);
  });
  body.append(metrics);

  if (report.validationErrors.length || report.warnings.length) {
    const issues = createElement(document, "section", {
      className: "diagnostic-panel diagnostic-results-panel",
    });
    issues.append(
      createElement(document, "h3", { text: "O que precisa de atenção" }),
      createElement(document, "p", {
        className: "section-helper",
        text: "Estes avisos explicam o que foi encontrado durante a verificação.",
      }),
    );
    const list = createElement(document, "ul", { className: "diagnostic-issue-list" });
    [...report.validationErrors, ...report.warnings].forEach((issue) => {
      list.append(createElement(document, "li", { text: issue }));
    });
    issues.append(list);
    body.append(issues);
  }

  const recoveryPanel = createElement(document, "section", {
    className: "diagnostic-panel recovery-panel",
  });
  recoveryPanel.append(
    createElement(document, "h3", { text: "Ponto de recuperação" }),
    createElement(document, "p", {
      text: report.recoveryPoint
        ? `Há uma cópia do estado anterior criada em ${formatDate(report.recoveryPoint.createdAt)} antes da última substituição.`
        : "Nenhum ponto de recuperação está armazenado no momento.",
    }),
  );
  if (report.recoveryPoint) {
    const actions = createElement(document, "div", { className: "action-row" });
    const recoverButton = createElement(document, "button", {
      className: "button button-secondary",
      text: "Recuperar estado anterior",
      attributes: { type: "button" },
    });
    const clearButton = createElement(document, "button", {
      className: "button button-quiet-danger",
      text: "Remover ponto",
      attributes: { type: "button" },
    });
    recoverButton.addEventListener("click", () => {
      onRestoreRecovery();
      dialog.close();
    });
    clearButton.addEventListener("click", () => {
      onClearRecovery();
      dialog.close();
    });
    actions.append(recoverButton, clearButton);
    recoveryPanel.append(actions);
  }
  body.append(recoveryPanel);

  const technical = createDetails(document, "Mostrar detalhes técnicos");
  const technicalSummary = createElement(document, "div", {
    className: "diagnostic-technical-summary",
  });
  technicalSummary.append(
    createElement(document, "span", { text: `Versão dos dados: ${report.schemaVersion}` }),
    createElement(document, "span", { text: `Espaço ocupado: ${formatBytes(report.storageBytes)}` }),
  );
  technical.content.append(technicalSummary);

  const integrationBlock = createElement(document, "section", {
    className: "diagnostic-technical-block",
  });
  integrationBlock.append(createElement(document, "h3", { text: "Integrações" }));
  const integrationList = createElement(document, "div", {
    className: "diagnostic-integration-list",
  });
  const integrations = report.integrations ?? {};
  const preferredIntegrations = [
    ["ConceptCompass", integrations.ConceptCompass],
    ["TestQuest", integrations.TestQuest],
    ["FlashCore", integrations.FlashCore ?? "future"],
  ];
  preferredIntegrations.forEach(([name, value]) => {
    integrationList.append(createIntegrationRow(document, name, value));
  });
  Object.entries(integrations)
    .filter(([name]) => !INTEGRATION_META[name])
    .forEach(([name, value]) => {
      integrationList.append(createIntegrationRow(document, name, value));
    });
  integrationBlock.append(integrationList);
  technical.content.append(integrationBlock);

  if (report.technicalLogs.length) {
    const logs = createElement(document, "section", {
      className: "diagnostic-technical-block diagnostic-logs",
    });
    logs.append(createElement(document, "h3", { text: "Eventos técnicos recentes" }));
    const list = createElement(document, "ul");
    report.technicalLogs.forEach((log) => {
      list.append(
        createElement(document, "li", {
          text: `${formatDate(log.occurredAt)} · ${log.message}`,
        }),
      );
    });
    logs.append(list);
    technical.content.append(logs);
  }
  body.append(technical.details);

  const footer = createElement(document, "footer", {
    className: "modal-footer diagnostic-footer",
  });
  const backupButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Criar backup agora",
    attributes: { type: "button" },
  });
  const doneButton = createElement(document, "button", {
    className: "button button-primary",
    text: "Concluir",
    attributes: { type: "button" },
  });
  backupButton.addEventListener("click", onBackup);
  footer.append(backupButton, doneButton);

  card.append(header, body, footer);
  dialog.append(card);
  document.body.append(dialog);

  function close() {
    if (dialog.open) dialog.close();
  }

  closeButton.addEventListener("click", close);
  doneButton.addEventListener("click", close);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => {
    dialog.remove();
    onClose();
  });

  dialog.showModal();
  doneButton.focus();
  return dialog;
}

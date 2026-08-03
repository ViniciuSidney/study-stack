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
    createElement(document, "h2", { text: "Diagnóstico do armazenamento" }),
    createElement(document, "p", {
      className: "modal-description",
      text: `Verificação executada em ${formatDate(report.checkedAt)}.`,
    }),
  );
  const closeButton = createElement(document, "button", {
    className: "icon-button",
    text: "×",
    attributes: { type: "button", "aria-label": "Fechar diagnóstico" },
  });
  header.append(copy, closeButton);

  const body = createElement(document, "div", {
    className: "modal-body diagnostic-body",
  });
  const status = createElement(document, "section", {
    className: `diagnostic-status diagnostic-${report.status}`,
  });
  const statusLabels = {
    healthy: "Estado saudável",
    warning: "Atenção recomendada",
    error: "Problemas de integridade encontrados",
  };
  status.append(
    createElement(document, "strong", { text: statusLabels[report.status] }),
    createElement(document, "span", {
      text: `Schema ${report.schemaVersion} · ${formatBytes(report.storageBytes)}`,
    }),
  );
  body.append(status);

  const metrics = createElement(document, "section", {
    className: "diagnostic-metrics",
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
    const issues = createElement(document, "section", { className: "diagnostic-panel" });
    issues.append(createElement(document, "h3", { text: "Resultados" }));
    const list = createElement(document, "ul", { className: "diagnostic-issue-list" });
    [...report.validationErrors, ...report.warnings].forEach((issue) => {
      list.append(createElement(document, "li", { text: issue }));
    });
    issues.append(list);
    body.append(issues);
  }

  const integrationPanel = createElement(document, "section", {
    className: "diagnostic-panel",
  });
  integrationPanel.append(createElement(document, "h3", { text: "Integrações" }));
  const integrationList = createElement(document, "div", {
    className: "diagnostic-integration-list",
  });
  Object.entries(report.integrations).forEach(([name, value]) => {
    const row = createElement(document, "div");
    row.append(
      createElement(document, "span", { text: name }),
      createElement(document, "strong", { text: value }),
    );
    integrationList.append(row);
  });
  integrationPanel.append(integrationList);
  body.append(integrationPanel);

  const recoveryPanel = createElement(document, "section", {
    className: "diagnostic-panel recovery-panel",
  });
  recoveryPanel.append(
    createElement(document, "h3", { text: "Ponto de recuperação" }),
    createElement(document, "p", {
      text: report.recoveryPoint
        ? `Criado em ${formatDate(report.recoveryPoint.createdAt)} antes da última restauração.`
        : "Nenhum ponto de recuperação está armazenado.",
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

  if (report.technicalLogs.length) {
    const logs = createElement(document, "details", {
      className: "diagnostic-panel diagnostic-logs",
    });
    logs.append(
      createElement(document, "summary", {
        text: `Eventos técnicos recentes · ${report.technicalLogCount}`,
      }),
    );
    const list = createElement(document, "ul");
    report.technicalLogs.forEach((log) => {
      list.append(
        createElement(document, "li", {
          text: `${formatDate(log.occurredAt)} · ${log.message}`,
        }),
      );
    });
    logs.append(list);
    body.append(logs);
  }

  const footer = createElement(document, "footer", { className: "modal-footer" });
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

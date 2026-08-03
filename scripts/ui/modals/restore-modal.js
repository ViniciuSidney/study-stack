import { createElement } from "../../utils/dom.js";

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(value ?? 0);
}

function createMetric(document, label, value) {
  const metric = createElement(document, "div", { className: "restore-metric" });
  metric.append(
    createElement(document, "strong", { text: formatNumber(value) }),
    createElement(document, "span", { text: label }),
  );
  return metric;
}

export function openRestoreModal({
  document,
  onParse,
  onPreview,
  onRestore,
  onClose = () => {},
}) {
  let envelope = null;
  let preview = null;

  const dialog = createElement(document, "dialog", {
    className: "modal restore-modal",
  });
  const card = createElement(document, "form", {
    className: "modal-card restore-card",
  });
  card.noValidate = true;

  const header = createElement(document, "header", { className: "modal-header" });
  const headerCopy = createElement(document, "div");
  headerCopy.append(
    createElement(document, "p", { className: "eyebrow", text: "Segurança local" }),
    createElement(document, "h2", { text: "Restaurar backup" }),
    createElement(document, "p", {
      className: "modal-description",
      text: "O arquivo é validado integralmente antes de qualquer alteração no estado atual.",
    }),
  );
  const closeButton = createElement(document, "button", {
    className: "icon-button",
    text: "×",
    attributes: { type: "button", "aria-label": "Fechar restauração" },
  });
  header.append(headerCopy, closeButton);

  const body = createElement(document, "div", {
    className: "modal-body restore-body",
  });

  const sourcePanel = createElement(document, "section", {
    className: "restore-panel",
  });
  sourcePanel.append(
    createElement(document, "h3", { text: "1. Selecionar arquivo" }),
    createElement(document, "p", {
      className: "section-helper",
      text: "Escolha um backup JSON exportado pelo Study Stack ou cole o conteúdo abaixo.",
    }),
  );
  const fileInput = createElement(document, "input", {
    className: "file-input",
    attributes: { type: "file", accept: ".json,application/json" },
  });
  const textArea = createElement(document, "textarea", {
    className: "restore-json-input",
    attributes: {
      rows: "7",
      placeholder: "Cole aqui o conteúdo completo do backup JSON.",
      spellcheck: "false",
    },
  });
  sourcePanel.append(fileInput, textArea);

  const modePanel = createElement(document, "section", {
    className: "restore-panel",
  });
  modePanel.append(
    createElement(document, "h3", { text: "2. Escolher estratégia" }),
  );
  const modeOptions = createElement(document, "div", {
    className: "restore-mode-options",
  });
  const modes = [
    {
      value: "merge",
      title: "Mesclar com o estado atual",
      description: "Adiciona entidades novas e preserva conflitos sem sobrescrever.",
    },
    {
      value: "replace",
      title: "Substituir todo o estado",
      description: "Troca os dados atuais pelo backup após criar um ponto de recuperação.",
    },
  ];
  const modeInputs = [];
  modes.forEach((mode, index) => {
    const option = createElement(document, "label", { className: "restore-mode" });
    const input = createElement(document, "input", {
      attributes: { type: "radio", name: "restoreMode", value: mode.value },
    });
    input.checked = index === 0;
    modeInputs.push(input);
    const copy = createElement(document, "span");
    copy.append(
      createElement(document, "strong", { text: mode.title }),
      createElement(document, "small", { text: mode.description }),
    );
    option.append(input, copy);
    modeOptions.append(option);
  });
  modePanel.append(modeOptions);

  const previewPanel = createElement(document, "section", {
    className: "restore-panel restore-preview-panel",
  });
  previewPanel.append(
    createElement(document, "h3", { text: "3. Prévia da restauração" }),
  );
  const previewContent = createElement(document, "div", {
    className: "restore-preview-content",
  });
  previewContent.append(
    createElement(document, "p", {
      className: "muted",
      text: "Carregue o arquivo para conferir conteúdo, conflitos e integridade.",
    }),
  );
  previewPanel.append(previewContent);

  const replaceConfirmation = createElement(document, "label", {
    className: "restore-replace-confirmation",
  });
  const replaceCheck = createElement(document, "input", {
    attributes: { type: "checkbox" },
  });
  replaceConfirmation.append(
    replaceCheck,
    createElement(document, "span", {
      text: "Entendo que o modo Substituir trocará todos os dados atuais.",
    }),
  );
  replaceConfirmation.hidden = true;
  body.append(sourcePanel, modePanel, previewPanel, replaceConfirmation);

  const errorMessage = createElement(document, "p", {
    className: "form-error",
    attributes: { role: "alert" },
  });
  errorMessage.hidden = true;
  body.append(errorMessage);

  const footer = createElement(document, "footer", { className: "modal-footer" });
  const previewButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Validar e visualizar",
    attributes: { type: "button" },
  });
  const cancelButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Cancelar",
    attributes: { type: "button" },
  });
  const restoreButton = createElement(document, "button", {
    className: "button button-primary",
    text: "Aplicar restauração",
    attributes: { type: "button" },
  });
  restoreButton.disabled = true;
  const footerActions = createElement(document, "div", { className: "restore-footer-actions" });
  footerActions.append(cancelButton, restoreButton);
  footer.append(previewButton, footerActions);

  card.append(header, body, footer);
  dialog.append(card);
  document.body.append(dialog);

  function selectedMode() {
    return modeInputs.find((input) => input.checked)?.value ?? "merge";
  }

  function updateRestoreAvailability() {
    const requiresConfirmation = selectedMode() === "replace";
    replaceConfirmation.hidden = !requiresConfirmation;
    restoreButton.disabled =
      !preview?.valid || (requiresConfirmation && !replaceCheck.checked);
    restoreButton.className = requiresConfirmation
      ? "button button-danger"
      : "button button-primary";
  }

  function renderPreview(result) {
    previewContent.replaceChildren();

    if (!result.valid) {
      const list = createElement(document, "ul", { className: "restore-issue-list error" });
      result.errors.forEach((error) => {
        list.append(createElement(document, "li", { text: error }));
      });
      previewContent.append(
        createElement(document, "strong", { text: "O backup não pode ser aplicado." }),
        list,
      );
      updateRestoreAvailability();
      return;
    }

    const metrics = createElement(document, "div", { className: "restore-metrics" });
    metrics.append(
      createMetric(document, "assuntos", result.summary?.subjectCount),
      createMetric(document, "registros", result.summary?.recordCount),
      createMetric(document, "arquivados", result.summary?.archivedRecordCount),
      createMetric(document, "rascunhos", result.summary?.draftCount),
    );
    previewContent.append(metrics);

    if (result.mode === "merge") {
      const added = Object.values(result.additions).reduce((sum, value) => sum + value, 0);
      const unchanged = Object.values(result.identical).reduce((sum, value) => sum + value, 0);
      previewContent.append(
        createElement(document, "p", {
          text: `${added} entidade(s) nova(s), ${unchanged} idêntica(s) e ${result.conflicts.length} conflito(s).`,
        }),
      );
    } else {
      previewContent.append(
        createElement(document, "p", {
          text: "O estado inteiro será substituído pelo conteúdo validado do backup.",
        }),
      );
    }

    if (result.warnings.length) {
      const warnings = createElement(document, "ul", { className: "restore-issue-list warning" });
      result.warnings.forEach((warning) => {
        warnings.append(createElement(document, "li", { text: warning }));
      });
      previewContent.append(warnings);
    }

    if (result.conflicts.length) {
      const details = createElement(document, "details", { className: "restore-conflicts" });
      details.append(
        createElement(document, "summary", {
          text: `Ver ${result.conflicts.length} conflito(s) preservado(s)`,
        }),
      );
      const list = createElement(document, "ul");
      result.conflicts.slice(0, 20).forEach((conflict) => {
        list.append(
          createElement(document, "li", {
            text: `${conflict.collectionName} · ${conflict.id}`,
          }),
        );
      });
      details.append(list);
      previewContent.append(details);
    }

    updateRestoreAvailability();
  }

  function performPreview() {
    errorMessage.hidden = true;
    try {
      envelope = onParse(textArea.value);
      preview = onPreview(envelope, selectedMode());
      renderPreview(preview);
    } catch (error) {
      preview = null;
      errorMessage.textContent = error instanceof Error ? error.message : "Falha ao ler o backup.";
      errorMessage.hidden = false;
      updateRestoreAvailability();
    }
  }

  function close() {
    if (dialog.open) {
      dialog.close();
    }
  }

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    textArea.value = await file.text();
    performPreview();
  });
  previewButton.addEventListener("click", performPreview);
  modeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      replaceCheck.checked = false;
      if (envelope) {
        preview = onPreview(envelope, selectedMode());
        renderPreview(preview);
      } else {
        updateRestoreAvailability();
      }
    });
  });
  replaceCheck.addEventListener("change", updateRestoreAvailability);
  restoreButton.addEventListener("click", () => {
    if (!preview?.valid || !envelope) return;
    const applied = onRestore(envelope, selectedMode());
    if (applied !== false) {
      close();
    }
  });
  closeButton.addEventListener("click", close);
  cancelButton.addEventListener("click", close);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => {
    dialog.remove();
    onClose();
  });

  dialog.showModal();
  fileInput.focus();
  return dialog;
}

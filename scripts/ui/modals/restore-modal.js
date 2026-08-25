import { createElement } from "../../utils/dom.js";

const REPLACE_CONFIRMATION_TEXT = "SUBSTITUIR TUDO";

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

function getVisibleRecordCounts(envelope) {
  const records = Object.values(envelope?.data?.collections?.records ?? {});
  return Object.freeze({
    summaries: records.filter((record) => record.type === "summary").length,
    notes: records.filter((record) => record.type === "note").length,
    sessions: records.filter((record) => record.type === "imported_session").length,
    errors: records.filter((record) => record.type === "error_record").length,
  });
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
    createElement(document, "p", { className: "eyebrow", text: "Backup e segurança" }),
    createElement(document, "h2", { text: "Restaurar backup" }),
    createElement(document, "p", {
      className: "modal-description",
      text: "Confira o arquivo e o efeito da restauração antes de alterar seus dados atuais.",
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
    createElement(document, "p", { className: "restore-step-label", text: "Etapa 1 de 3" }),
    createElement(document, "h3", { text: "Escolha o backup" }),
    createElement(document, "p", {
      className: "section-helper",
      text: "Selecione um arquivo JSON criado pelo Study Stack. Ele será apenas lido e validado nesta etapa.",
    }),
  );
  const fileInput = createElement(document, "input", {
    className: "file-input restore-primary-file-input",
    attributes: {
      type: "file",
      accept: ".json,application/json",
      "aria-label": "Selecionar arquivo de backup do Study Stack",
    },
  });
  sourcePanel.append(fileInput);

  const advancedSource = createElement(document, "details", {
    className: "restore-advanced-source",
  });
  advancedSource.append(
    createElement(document, "summary", {
      text: "Opções avançadas: colar JSON manualmente",
    }),
  );
  const advancedCopy = createElement(document, "p", {
    className: "section-helper",
    text: "Use esta opção somente se você já tiver o conteúdo bruto de um backup.",
  });
  const textArea = createElement(document, "textarea", {
    className: "restore-json-input",
    attributes: {
      rows: "7",
      placeholder: "Cole aqui o conteúdo completo do backup JSON.",
      spellcheck: "false",
      "aria-label": "Conteúdo JSON do backup",
    },
  });
  advancedSource.append(advancedCopy, textArea);
  sourcePanel.append(advancedSource);

  const modePanel = createElement(document, "section", {
    className: "restore-panel",
  });
  modePanel.append(
    createElement(document, "p", { className: "restore-step-label", text: "Etapa 2 de 3" }),
    createElement(document, "h3", { text: "Escolha como restaurar" }),
    createElement(document, "p", {
      className: "section-helper",
      text: "Na dúvida, use Adicionar ao que já existe. Seus dados atuais são preservados.",
    }),
  );
  const modeOptions = createElement(document, "div", {
    className: "restore-mode-options",
  });
  const modes = [
    {
      value: "merge",
      title: "Adicionar ao que já existe",
      description: "Adiciona o que ainda não existe e mantém seus dados atuais sem substituições.",
      badge: "Recomendado",
    },
    {
      value: "replace",
      title: "Substituir todos os dados",
      description: "Troca o conteúdo atual pelo backup. Antes disso, o Study Stack cria um ponto de recuperação.",
      badge: "Atenção",
    },
  ];
  const modeInputs = [];
  modes.forEach((mode, index) => {
    const option = createElement(document, "label", {
      className: `restore-mode restore-mode-${mode.value}`,
    });
    const input = createElement(document, "input", {
      attributes: { type: "radio", name: "restoreMode", value: mode.value },
    });
    input.checked = index === 0;
    modeInputs.push(input);
    const copy = createElement(document, "span", { className: "restore-mode-copy" });
    const titleLine = createElement(document, "span", { className: "restore-mode-title-line" });
    titleLine.append(
      createElement(document, "strong", { text: mode.title }),
      createElement(document, "small", {
        className: `restore-mode-badge restore-mode-badge-${mode.value}`,
        text: mode.badge,
      }),
    );
    copy.append(
      titleLine,
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
    createElement(document, "p", { className: "restore-step-label", text: "Etapa 3 de 3" }),
    createElement(document, "h3", { text: "Confira antes de restaurar" }),
  );
  const previewContent = createElement(document, "div", {
    className: "restore-preview-content",
  });
  previewContent.append(
    createElement(document, "p", {
      className: "muted",
      text: "Selecione um backup e use Pré-visualizar restauração para conferir o que será aplicado.",
    }),
  );
  previewPanel.append(previewContent);

  const replaceConfirmation = createElement(document, "section", {
    className: "restore-replace-confirmation",
  });
  replaceConfirmation.hidden = true;
  replaceConfirmation.append(
    createElement(document, "strong", { text: "Confirmação necessária" }),
    createElement(document, "p", {
      text: "Esta opção substituirá todos os dados atuais pelos dados do backup. Um ponto de recuperação será criado automaticamente antes da alteração.",
    }),
    createElement(document, "label", {
      className: "field restore-confirmation-field",
    }),
  );
  const confirmationField = replaceConfirmation.lastElementChild;
  confirmationField.append(
    createElement(document, "span", {
      text: `Digite ${REPLACE_CONFIRMATION_TEXT} para confirmar`,
    }),
  );
  const replaceConfirmationInput = createElement(document, "input", {
    attributes: {
      type: "text",
      autocomplete: "off",
      placeholder: REPLACE_CONFIRMATION_TEXT,
      "aria-label": `Digite ${REPLACE_CONFIRMATION_TEXT} para confirmar a substituição`,
    },
  });
  confirmationField.append(replaceConfirmationInput);

  body.append(sourcePanel, modePanel, previewPanel, replaceConfirmation);

  const errorMessage = createElement(document, "p", {
    className: "form-error",
    attributes: { role: "alert" },
  });
  errorMessage.hidden = true;
  body.append(errorMessage);

  const footer = createElement(document, "footer", { className: "modal-footer restore-footer" });
  const previewButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Pré-visualizar restauração",
    attributes: { type: "button" },
  });
  const cancelButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Cancelar",
    attributes: { type: "button" },
  });
  const restoreButton = createElement(document, "button", {
    className: "button button-primary",
    text: "Restaurar backup",
    attributes: { type: "button" },
  });
  restoreButton.disabled = true;
  const restoreRequirementHint = createElement(document, "small", {
    className: "restore-requirement-hint",
    text: "Faça a pré-visualização antes de restaurar.",
  });
  const footerActions = createElement(document, "div", { className: "restore-footer-actions" });
  footerActions.append(cancelButton, restoreButton);
  footer.append(previewButton, restoreRequirementHint, footerActions);

  card.append(header, body, footer);
  dialog.append(card);
  document.body.append(dialog);

  function selectedMode() {
    return modeInputs.find((input) => input.checked)?.value ?? "merge";
  }

  function replacementConfirmed() {
    return replaceConfirmationInput.value.trim() === REPLACE_CONFIRMATION_TEXT;
  }

  function updateRestoreAvailability() {
    const requiresConfirmation = selectedMode() === "replace";
    replaceConfirmation.hidden = !requiresConfirmation || !preview?.valid;
    restoreButton.disabled =
      !preview?.valid || (requiresConfirmation && !replacementConfirmed());
    restoreButton.className = requiresConfirmation
      ? "button button-danger"
      : "button button-primary";
    restoreButton.textContent = requiresConfirmation
      ? "Substituir todos os dados"
      : "Restaurar backup";

    if (!preview?.valid) {
      restoreRequirementHint.textContent = "Faça a pré-visualização antes de restaurar.";
      restoreButton.title = "Faça a pré-visualização antes de restaurar.";
    } else if (requiresConfirmation && !replacementConfirmed()) {
      restoreRequirementHint.textContent =
        `Digite ${REPLACE_CONFIRMATION_TEXT} para habilitar a substituição.`;
      restoreButton.title = restoreRequirementHint.textContent;
    } else if (requiresConfirmation) {
      restoreRequirementHint.textContent =
        "A substituição está pronta. Um ponto de recuperação será criado antes da alteração.";
      restoreButton.title = "Substituir os dados atuais pelo backup validado.";
    } else {
      restoreRequirementHint.textContent = "O backup está validado e pronto para ser adicionado.";
      restoreButton.title = "Adicionar os dados validados ao estado atual.";
    }
  }

  function renderPreview(result) {
    previewContent.replaceChildren();

    if (!result.valid) {
      const list = createElement(document, "ul", { className: "restore-issue-list error" });
      result.errors.forEach((error) => {
        list.append(createElement(document, "li", { text: error }));
      });
      previewContent.append(
        createElement(document, "strong", { text: "Este backup não pode ser restaurado." }),
        createElement(document, "p", {
          className: "section-helper",
          text: "Nenhum dado atual foi alterado.",
        }),
        list,
      );
      updateRestoreAvailability();
      return;
    }

    previewContent.append(
      createElement(document, "strong", {
        className: "restore-preview-success",
        text: "Backup válido",
      }),
    );

    const visibleCounts = getVisibleRecordCounts(envelope);
    const metrics = createElement(document, "div", { className: "restore-metrics" });
    metrics.append(
      createMetric(document, "Resumos", visibleCounts.summaries),
      createMetric(document, "Anotações", visibleCounts.notes),
      createMetric(document, "Listas", visibleCounts.sessions),
      createMetric(document, "Erros", visibleCounts.errors),
    );
    previewContent.append(metrics);

    if (result.mode === "merge") {
      const summary = createElement(document, "div", {
        className: "restore-merge-summary",
      });
      summary.append(
        createElement(document, "p", {
          text: "O que ainda não existe será adicionado. O que já existe será mantido, sem substituir seus dados atuais.",
        }),
      );
      previewContent.append(summary);
    } else {
      previewContent.append(
        createElement(document, "div", { className: "restore-replace-preview-warning" }),
      );
      previewContent.lastElementChild.append(
        createElement(document, "strong", { text: "Todos os dados atuais serão substituídos." }),
        createElement(document, "span", {
          text: "Antes da alteração, o Study Stack criará automaticamente um ponto de recuperação.",
        }),
      );
    }

    const warningMessages = result.warnings.filter(
      (warning) =>
        !(result.mode === "merge" && result.conflicts.length > 0 && /conflito/iu.test(warning)),
    );
    if (result.mode === "merge" && result.conflicts.length > 0) {
      warningMessages.push(
        "Algumas diferenças foram encontradas. Seus dados atuais serão mantidos.",
      );
    }
    if (warningMessages.length) {
      const warnings = createElement(document, "ul", {
        className: "restore-issue-list warning",
      });
      [...new Set(warningMessages)].forEach((warning) => {
        warnings.append(createElement(document, "li", { text: warning }));
      });
      previewContent.append(warnings);
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
      errorMessage.textContent =
        error instanceof Error ? error.message : "Não foi possível ler este backup.";
      errorMessage.hidden = false;
      updateRestoreAvailability();
    }
  }

  function resetPreview() {
    preview = null;
    replaceConfirmationInput.value = "";
    previewContent.replaceChildren(
      createElement(document, "p", {
        className: "muted",
        text: "Use Pré-visualizar restauração para conferir o efeito desta opção.",
      }),
    );
    updateRestoreAvailability();
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
    advancedSource.open = false;
    performPreview();
  });
  textArea.addEventListener("input", resetPreview);
  previewButton.addEventListener("click", performPreview);
  modeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      replaceConfirmationInput.value = "";
      if (envelope) {
        preview = onPreview(envelope, selectedMode());
        renderPreview(preview);
      } else {
        updateRestoreAvailability();
      }
    });
  });
  replaceConfirmationInput.addEventListener("input", updateRestoreAvailability);
  restoreButton.addEventListener("click", () => {
    if (!preview?.valid || !envelope) return;
    if (selectedMode() === "replace" && !replacementConfirmed()) return;
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

  updateRestoreAvailability();
  dialog.showModal();
  fileInput.focus();
  return dialog;
}
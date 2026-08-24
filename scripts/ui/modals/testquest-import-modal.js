import { TestQuestAdapter } from "../../integrations/testquest-adapter.js";
import { createElement } from "../../utils/dom.js";

export function openTestQuestImportModal({
  document,
  subject,
  allowDevelopmentExample = false,
  onSubmit,
  onClose = () => {},
}) {
  const dialog = createElement(document, "dialog", {
    className: "modal testquest-import-modal",
  });
  const card = createElement(document, "div", {
    className: "modal-card test-quest-import-card",
  });
  const header = createElement(document, "header", {
    className: "modal-header",
  });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Integração Test Quest",
    }),
    createElement(document, "h2", { text: "Importar resultado" }),
    createElement(document, "p", {
      className: "modal-description",
      text:
        "Importe uma sessão concluída do Test Quest para registrar os resultados neste assunto.",
    }),
  );
  const closeButton = createElement(document, "button", {
    className: "icon-button",
    text: "×",
    attributes: { type: "button", "aria-label": "Fechar importação" },
  });
  header.append(copy, closeButton);

  const body = createElement(document, "div", {
    className: "modal-body test-quest-import-body",
  });
  const contextPanel = createElement(document, "section", {
    className: "import-context-panel",
  });
  contextPanel.append(
    createElement(document, "span", {
      className: "eyebrow",
      text: "Assunto",
    }),
    createElement(document, "strong", { text: subject.subjectName }),
    createElement(document, "small", {
      text: `${subject.matterName} › ${subject.themeName}`,
    }),
  );

  const sourceSection = createElement(document, "section", {
    className: "testquest-import-source",
  });
  const sourceCopy = createElement(document, "div", {
    className: "testquest-import-source-copy",
  });
  sourceCopy.append(
    createElement(document, "strong", { text: "Arquivo da sessão" }),
    createElement(document, "p", {
      text: "Selecione o arquivo JSON exportado pelo Test Quest.",
    }),
  );

  const fileField = createElement(document, "label", {
    className: "field testquest-file-field",
  });
  const fileInput = createElement(document, "input", {
    attributes: {
      type: "file",
      accept: ".json,application/json",
      "aria-describedby": "testQuestImportStatus",
    },
  });
  fileField.append(fileInput);
  sourceSection.append(sourceCopy, fileField);

  const manualDetails = createElement(document, "details", {
    className: "testquest-manual-entry",
  });
  manualDetails.append(
    createElement(document, "summary", { text: "Colar JSON manualmente" }),
  );
  const manualContent = createElement(document, "div", {
    className: "testquest-manual-content",
  });
  const textareaField = createElement(document, "label", {
    className: "field",
  });
  textareaField.append(
    createElement(document, "span", { text: "JSON da sessão" }),
  );
  const textarea = createElement(document, "textarea", {
    className: "json-import-textarea",
    attributes: {
      rows: "9",
      spellcheck: "false",
      placeholder: "Cole aqui o JSON exportado pelo Test Quest...",
    },
  });
  textareaField.append(textarea);
  manualContent.append(textareaField);

  const supportActions = createElement(document, "div", {
    className: "import-support-actions",
  });
  if (allowDevelopmentExample) {
    const exampleButton = createElement(document, "button", {
      className: "button button-secondary button-small",
      text: "Carregar exemplo de teste",
      attributes: { type: "button" },
    });
    exampleButton.addEventListener("click", () => {
      textarea.value = JSON.stringify(
        TestQuestAdapter.createDevelopmentPayload(subject),
        null,
        2,
      );
      manualDetails.open = true;
      error.hidden = true;
      refreshInputState("Exemplo de teste pronto para importar.");
      textarea.focus();
    });
    supportActions.append(exampleButton);
    manualContent.append(supportActions);
  }
  manualDetails.append(manualContent);

  const status = createElement(document, "p", {
    className: "testquest-import-status",
    attributes: {
      id: "testQuestImportStatus",
      role: "status",
      "aria-live": "polite",
    },
  });
  status.hidden = true;

  const error = createElement(document, "p", {
    className: "form-error",
    attributes: { role: "alert" },
  });
  error.hidden = true;

  body.append(contextPanel, sourceSection, manualDetails, status, error);

  const footer = createElement(document, "footer", {
    className: "modal-footer",
  });
  const cancelButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Cancelar",
    attributes: { type: "button" },
  });
  const importButton = createElement(document, "button", {
    className: "button button-primary",
    text: "Importar resultado",
    attributes: { type: "button", disabled: "" },
  });
  footer.append(cancelButton, importButton);
  card.append(header, body, footer);
  dialog.append(card);
  document.body.append(dialog);

  let submitted = false;

  function setStatus(message, tone = "info") {
    status.textContent = message;
    status.dataset.tone = tone;
    status.hidden = !message;
  }

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
    error.scrollIntoView?.({ block: "nearest" });
  }

  function clearError() {
    error.hidden = true;
    error.textContent = "";
  }

  function refreshInputState(successMessage = "JSON pronto para importar.") {
    const parsed = TestQuestAdapter.parseManualText(textarea.value);

    if (!String(textarea.value ?? "").trim()) {
      importButton.disabled = true;
      setStatus("");
      return parsed;
    }

    if (parsed.valid) {
      importButton.disabled = false;
      setStatus(successMessage, "success");
      return parsed;
    }

    importButton.disabled = true;
    setStatus("O conteúdo ainda não é um JSON válido.", "warning");
    return parsed;
  }

  function close() {
    if (dialog.open) {
      dialog.close();
    }
  }

  fileInput.addEventListener("change", async () => {
    const [file] = fileInput.files ?? [];
    if (!file) {
      return;
    }

    try {
      textarea.value = await file.text();
      clearError();
      const parsed = refreshInputState(`${file.name} pronto para importar.`);
      if (!parsed.valid) {
        showError("O arquivo selecionado não contém um JSON válido.");
      }
    } catch {
      importButton.disabled = true;
      setStatus("");
      showError("Não foi possível ler o arquivo selecionado.");
    }
  });

  textarea.addEventListener("input", () => {
    clearError();
    refreshInputState();
  });

  importButton.addEventListener("click", () => {
    const parsed = TestQuestAdapter.parseManualText(textarea.value);
    if (!parsed.valid) {
      showError(parsed.error);
      return;
    }

    try {
      const result = onSubmit(parsed.payload);
      submitted = true;
      close();
      return result;
    } catch (submitError) {
      showError(
        submitError instanceof Error
          ? submitError.message
          : "Não foi possível importar o resultado.",
      );
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
    onClose({ submitted });
  });

  dialog.showModal();
  fileInput.focus();
  return dialog;
}

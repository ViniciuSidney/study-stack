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
        "Importe o JSON completo de uma sessão concluída. O conteúdo original será preservado como evidência imutável.",
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
      text: "Assunto de destino",
    }),
    createElement(document, "strong", { text: subject.subjectName }),
    createElement(document, "small", {
      text: `${subject.matterName} › ${subject.themeName} · ID ${subject.id}`,
    }),
  );

  const fileField = createElement(document, "label", {
    className: "field file-field",
  });
  fileField.append(
    createElement(document, "span", { text: "Arquivo JSON" }),
  );
  const fileInput = createElement(document, "input", {
    attributes: {
      type: "file",
      accept: ".json,application/json",
      "aria-describedby": "testQuestImportHelp",
    },
  });
  fileField.append(fileInput);

  const textareaField = createElement(document, "label", {
    className: "field",
  });
  textareaField.append(
    createElement(document, "span", { text: "Conteúdo do resultado" }),
  );
  const textarea = createElement(document, "textarea", {
    className: "json-import-textarea",
    attributes: {
      rows: "13",
      spellcheck: "false",
      placeholder:
        '{\n  "contractVersion": "1.0.0",\n  "sourceApp": "test_quest",\n  ...\n}',
    },
  });
  textareaField.append(textarea);

  const help = createElement(document, "p", {
    className: "field-help",
    text:
      "Contrato aceito: 1.0.0. O subjectId deve corresponder ao assunto aberto. Sessões repetidas são ignoradas sem duplicação.",
    attributes: { id: "testQuestImportHelp" },
  });
  const error = createElement(document, "p", {
    className: "form-error",
    attributes: { role: "alert" },
  });
  error.hidden = true;

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
      error.hidden = true;
      textarea.focus();
    });
    supportActions.append(exampleButton);
  }

  body.append(contextPanel, fileField, textareaField, help, supportActions, error);

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
    text: "Validar e importar",
    attributes: { type: "button" },
  });
  footer.append(cancelButton, importButton);
  card.append(header, body, footer);
  dialog.append(card);
  document.body.append(dialog);

  let submitted = false;

  function showError(message) {
    error.textContent = message;
    error.hidden = false;
    error.scrollIntoView?.({ block: "nearest" });
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
      error.hidden = true;
    } catch {
      showError("Não foi possível ler o arquivo selecionado.");
    }
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
  textarea.focus();
  return dialog;
}

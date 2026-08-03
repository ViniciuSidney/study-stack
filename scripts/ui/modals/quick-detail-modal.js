import { createElement } from "../../utils/dom.js";

function createField(document, labelText, input, { hint = "", wide = false } = {}) {
  const field = createElement(document, "label", {
    className: `field${wide ? " field-wide" : ""}`,
  });
  field.append(createElement(document, "span", { text: labelText }), input);

  if (hint) {
    field.append(createElement(document, "small", { text: hint }));
  }

  return field;
}

function normalizeTags(value) {
  return String(value ?? "")
    .split(/[;,]/u)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function openQuickDetailModal({
  document,
  defaultStudyDate,
  onSubmit,
  onClose = () => {},
}) {
  const dialog = createElement(document, "dialog", {
    className: "modal quick-detail-modal",
  });
  const form = createElement(document, "form", {
    className: "modal-card quick-detail-card",
    attributes: { method: "dialog" },
  });
  const header = createElement(document, "header", { className: "modal-header" });
  const headerCopy = createElement(document, "div");
  headerCopy.append(
    createElement(document, "p", { className: "eyebrow", text: "Captura rápida" }),
    createElement(document, "h2", { text: "Apenas um detalhe" }),
    createElement(document, "p", {
      className: "modal-description",
      text:
        "Registre uma ideia sem interromper o estudo. Ela será criada como uma Anotação normal e poderá ser ampliada depois.",
    }),
  );
  const closeButton = createElement(document, "button", {
    className: "icon-button",
    text: "×",
    attributes: { type: "button", "aria-label": "Fechar" },
  });
  header.append(headerCopy, closeButton);

  const body = createElement(document, "div", {
    className: "modal-body record-form-grid",
  });
  const detailInput = createElement(document, "textarea", {
    attributes: {
      rows: "8",
      maxlength: "5000",
      required: "",
      placeholder:
        "Ex.: [ ] Confirmar a diferença entre cadeia e teia alimentar\n\nTambém é possível escrever uma observação livre.",
    },
  });
  const titleInput = createElement(document, "input", {
    attributes: {
      type: "text",
      maxlength: "160",
      autocomplete: "off",
      placeholder: "Opcional. O primeiro trecho será usado como título.",
    },
  });
  const dateInput = createElement(document, "input", {
    attributes: { type: "date", required: "" },
  });
  dateInput.value = defaultStudyDate;
  const tagsInput = createElement(document, "input", {
    attributes: {
      type: "text",
      maxlength: "240",
      autocomplete: "off",
      placeholder: "dúvida, lembrete, conexão",
    },
  });
  const importantLabel = createElement(document, "label", {
    className: "check-row field-wide",
  });
  const importantInput = createElement(document, "input", {
    attributes: { type: "checkbox" },
  });
  importantLabel.append(
    importantInput,
    createElement(document, "span", {
      text: "Manter este detalhe no atalho de Importantes",
    }),
  );

  body.append(
    createField(document, "Detalhe *", detailInput, {
      wide: true,
      hint: "Use [ ] item e [x] item para checklists textuais.",
    }),
    createField(document, "Título", titleInput, { wide: true }),
    createField(document, "Data de estudo", dateInput),
    createField(document, "Tags separadas por vírgula", tagsInput),
    importantLabel,
  );

  const errorMessage = createElement(document, "p", {
    className: "form-error field-wide",
    attributes: { role: "alert" },
  });
  errorMessage.hidden = true;
  body.append(errorMessage);

  const footer = createElement(document, "footer", { className: "modal-footer" });
  const cancelButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Cancelar",
    attributes: { type: "button" },
  });
  const saveButton = createElement(document, "button", {
    className: "button button-primary",
    text: "Salvar detalhe",
    attributes: { type: "submit" },
  });
  footer.append(cancelButton, saveButton);
  form.append(header, body, footer);
  dialog.append(form);
  document.body.append(dialog);

  function close() {
    if (dialog.open) {
      dialog.close();
    } else {
      dialog.remove();
      onClose();
    }
  }

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

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    errorMessage.hidden = true;
    saveButton.disabled = true;

    try {
      onSubmit({
        content: detailInput.value,
        title: titleInput.value,
        studyDate: dateInput.value,
        tags: normalizeTags(tagsInput.value),
        isImportant: importantInput.checked,
      });
      close();
    } catch (error) {
      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
      saveButton.disabled = false;
      errorMessage.scrollIntoView({ block: "nearest" });
    }
  });

  dialog.showModal();
  detailInput.focus();
  return dialog;
}

import { createElement } from "../../utils/dom.js";

const TYPE_OPTIONS = Object.freeze([
  { value: "summary", label: "Resumo" },
  { value: "note", label: "Anotação" },
]);

const STATUS_OPTIONS = Object.freeze([
  { value: "draft", label: "Rascunho" },
  { value: "in_progress", label: "Em andamento" },
]);

function createField(document, labelText, input) {
  const field = createElement(document, "label", { className: "field" });
  field.append(
    createElement(document, "span", { text: labelText }),
    input,
  );
  return field;
}

function createSelect(document, options, value) {
  const select = createElement(document, "select");

  for (const option of options) {
    const element = createElement(document, "option", {
      text: option.label,
      attributes: { value: option.value },
    });
    element.selected = option.value === value;
    select.append(element);
  }

  return select;
}

function normalizeTags(value) {
  return String(value ?? "")
    .split(/[;,]/u)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function openRecordModal({
  document,
  record = null,
  defaultType = "summary",
  defaultStudyDate,
  onSubmit,
  onClose = () => {},
}) {
  const editing = Boolean(record);
  const dialog = createElement(document, "dialog", {
    className: "modal record-modal",
  });
  const form = createElement(document, "form", {
    className: "modal-card",
    attributes: { method: "dialog" },
  });

  const header = createElement(document, "header", {
    className: "modal-header",
  });
  const headerCopy = createElement(document, "div");
  headerCopy.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: editing ? "Editar registro" : "Novo registro",
    }),
    createElement(document, "h2", {
      text: editing ? record.title || "Registro sem título" : "Criar registro",
    }),
    createElement(document, "p", {
      className: "modal-description",
      text: editing
        ? "O tipo e o assunto permanecem fixos para preservar os vínculos."
        : "Nesta fundação, Resumos e Anotações começam pelo registro-base.",
    }),
  );
  const closeButton = createElement(document, "button", {
    className: "icon-button",
    text: "×",
    attributes: {
      type: "button",
      "aria-label": "Fechar modal",
    },
  });
  header.append(headerCopy, closeButton);

  const body = createElement(document, "div", {
    className: "modal-body record-form-grid",
  });

  const typeSelect = createSelect(
    document,
    TYPE_OPTIONS,
    record?.type ?? defaultType,
  );
  typeSelect.disabled = editing;
  typeSelect.name = "type";

  const titleInput = createElement(document, "input", {
    attributes: {
      type: "text",
      name: "title",
      maxlength: "160",
      placeholder: "Ex.: Introdução às cadeias alimentares",
      autocomplete: "off",
    },
  });
  titleInput.value = record?.title ?? "";

  const dateInput = createElement(document, "input", {
    attributes: {
      type: "date",
      name: "studyDate",
      required: "",
    },
  });
  dateInput.value = record?.studyDate ?? defaultStudyDate;

  const statusOptions = [...STATUS_OPTIONS];
  if (record?.status === "completed") {
    statusOptions.push({ value: "completed", label: "Concluído" });
  }
  const statusSelect = createSelect(
    document,
    statusOptions,
    record?.status ?? "draft",
  );
  statusSelect.name = "status";

  const tagsInput = createElement(document, "input", {
    attributes: {
      type: "text",
      name: "tags",
      maxlength: "240",
      placeholder: "ecologia, revisão, conceito",
      autocomplete: "off",
    },
  });
  tagsInput.value = record?.tags?.join(", ") ?? "";

  const notesInput = createElement(document, "textarea", {
    attributes: {
      name: "personalNotes",
      rows: "5",
      maxlength: "2000",
      placeholder: "Observações gerais sobre este registro...",
    },
  });
  notesInput.value = record?.personalNotes?.plainText ?? "";

  const importantLabel = createElement(document, "label", {
    className: "check-row",
  });
  const importantInput = createElement(document, "input", {
    attributes: { type: "checkbox", name: "isImportant" },
  });
  importantInput.checked = Boolean(record?.isImportant);
  importantLabel.append(
    importantInput,
    createElement(document, "span", {
      text: "Manter este registro no atalho de Importantes",
    }),
  );

  const typeField = createField(document, "Tipo", typeSelect);
  const titleField = createField(document, "Título", titleInput);
  const dateField = createField(document, "Data de estudo", dateInput);
  const statusField = createField(document, "Status", statusSelect);
  const tagsField = createField(document, "Tags separadas por vírgula", tagsInput);
  const notesField = createField(document, "Observações pessoais", notesInput);
  titleField.classList.add("field-wide");
  tagsField.classList.add("field-wide");
  notesField.classList.add("field-wide");
  importantLabel.classList.add("field-wide");

  body.append(
    typeField,
    statusField,
    titleField,
    dateField,
    tagsField,
    notesField,
    importantLabel,
  );

  const errorMessage = createElement(document, "p", {
    className: "form-error",
    attributes: { role: "alert" },
  });
  errorMessage.hidden = true;
  body.append(errorMessage);

  const footer = createElement(document, "footer", {
    className: "modal-footer",
  });
  const cancelButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Cancelar",
    attributes: { type: "button" },
  });
  const saveButton = createElement(document, "button", {
    className: "button button-primary",
    text: editing ? "Salvar alterações" : "Criar registro",
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
        type: record?.type ?? typeSelect.value,
        title: titleInput.value,
        studyDate: dateInput.value,
        status: statusSelect.value,
        tags: normalizeTags(tagsInput.value),
        personalNotes: notesInput.value,
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
  titleInput.focus();
  return dialog;
}

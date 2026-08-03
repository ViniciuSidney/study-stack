import { SUMMARY_SOURCE_TYPES } from "../../domain/summary.js";
import { createElement } from "../../utils/dom.js";
import { createRichTextEditor } from "../components/rich-text-editor.js";

const SOURCE_LABELS = Object.freeze({
  ai: "Inteligência artificial",
  handout: "Apostila ou material",
  class: "Aula",
  video: "Vídeo",
  book: "Livro",
  website: "Site",
  other: "Outra fonte",
});

const STATUS_OPTIONS = Object.freeze([
  ["draft", "Rascunho"],
  ["in_progress", "Em andamento"],
  ["completed", "Concluído"],
]);

function createField(document, labelText, input, { wide = false, hint = "" } = {}) {
  const field = createElement(document, "label", {
    className: `field${wide ? " field-wide" : ""}`,
  });
  field.append(createElement(document, "span", { text: labelText }), input);

  if (hint) {
    field.append(createElement(document, "small", { text: hint }));
  }

  return field;
}

function createSelect(document, options, value) {
  const select = createElement(document, "select");

  for (const [optionValue, label] of options) {
    const option = createElement(document, "option", {
      text: label,
      attributes: { value: optionValue },
    });
    option.selected = optionValue === value;
    select.append(option);
  }

  return select;
}

function normalizeTags(value) {
  return String(value ?? "")
    .split(/[;,]/u)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeReferences(value) {
  return String(value ?? "")
    .split(/\r?\n/gu)
    .map((reference) => reference.trim())
    .filter(Boolean);
}

function createSwitch(document, label, checked) {
  const wrapper = createElement(document, "label", {
    className: "summary-switch-row",
  });
  const input = createElement(document, "input", {
    attributes: { type: "checkbox" },
  });
  input.checked = checked;
  wrapper.append(input, createElement(document, "span", { text: label }));
  return { wrapper, input };
}

export function openSummaryEditorModal({
  document,
  view,
  recoveredDraft = null,
  autosaveDelayMs = 900,
  onAutosave,
  onDiscardDraft,
  onSubmit,
  onClose = () => {},
}) {
  const { record, summary } = view;
  const modalInstanceId = `summary-editor-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const originalState = {
    record: {
      title: record.title,
      studyDate: record.studyDate,
      tags: record.tags,
      personalNotes: record.personalNotes?.plainText ?? "",
      isImportant: record.isImportant,
    },
    summary: {
      mainContent: summary.mainContent,
      studyObjective: summary.studyObjective,
      keyConcepts: summary.keyConcepts,
      examples: summary.examples,
      remainingQuestions: summary.remainingQuestions,
      synthesis: summary.synthesis,
      sourceType: summary.sourceType,
      sourceDescription: summary.sourceDescription ?? "",
      references: summary.references,
    },
    status: record.status,
    isStudied: summary.isStudied,
  };
  const initialState = recoveredDraft?.workingState ?? originalState;
  let autosaveTimer = null;
  let finalSaved = false;
  let discarded = false;
  let dirty = Boolean(recoveredDraft);

  const dialog = createElement(document, "dialog", {
    className: "modal summary-editor-modal",
  });
  const form = createElement(document, "form", {
    className: "modal-card summary-editor-card",
    attributes: { method: "dialog" },
  });

  const header = createElement(document, "header", {
    className: "modal-header summary-editor-header",
  });
  const headerCopy = createElement(document, "div");
  headerCopy.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Editor de Resumo",
    }),
    createElement(document, "h2", {
      text: record.title || "Resumo sem título",
    }),
    createElement(document, "p", {
      className: "modal-description",
      text:
        "Título e conteúdo principal são obrigatórios apenas para concluir. O restante pode crescer com o estudo.",
    }),
  );
  const closeButton = createElement(document, "button", {
    className: "icon-button",
    text: "×",
    attributes: {
      type: "button",
      "aria-label": "Fechar editor preservando o rascunho",
    },
  });
  header.append(headerCopy, closeButton);

  const body = createElement(document, "div", {
    className: "modal-body summary-editor-body",
  });

  if (recoveredDraft) {
    const recovery = createElement(document, "section", {
      className: "draft-recovery-banner",
      attributes: { role: "status" },
    });
    recovery.append(
      createElement(document, "strong", { text: "Rascunho de edição recuperado" }),
      createElement(document, "span", {
        text: `Salvo automaticamente em ${new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(recoveredDraft.lastSavedAt))}.`,
      }),
    );
    body.append(recovery);
  }

  const metadataPanel = createElement(document, "section", {
    className: "summary-editor-section panel",
  });
  metadataPanel.append(
    createElement(document, "div", {
      className: "summary-editor-section-heading",
      text: "Identificação do registro",
    }),
  );
  const metadataGrid = createElement(document, "div", {
    className: "summary-metadata-grid",
  });

  const titleInput = createElement(document, "input", {
    attributes: {
      type: "text",
      maxlength: "160",
      autocomplete: "off",
      placeholder: "Ex.: Cadeias alimentares: conceitos essenciais",
    },
  });
  titleInput.value = initialState.record.title ?? "";

  const dateInput = createElement(document, "input", {
    attributes: { type: "date", required: "" },
  });
  dateInput.value = initialState.record.studyDate;

  const statusSelect = createSelect(document, STATUS_OPTIONS, initialState.status);

  const tagsInput = createElement(document, "input", {
    attributes: {
      type: "text",
      maxlength: "240",
      autocomplete: "off",
      placeholder: "ecologia, base teórica, revisão",
    },
  });
  tagsInput.value = (initialState.record.tags ?? []).join(", ");

  const personalNotesInput = createElement(document, "textarea", {
    attributes: {
      rows: "3",
      maxlength: "2000",
      placeholder: "Observações pessoais sobre o registro...",
    },
  });
  personalNotesInput.value = initialState.record.personalNotes ?? "";

  metadataGrid.append(
    createField(document, "Título", titleInput, {
      wide: true,
      hint: "Obrigatório para concluir o Resumo.",
    }),
    createField(document, "Data de estudo", dateInput),
    createField(document, "Status", statusSelect),
    createField(document, "Tags separadas por vírgula", tagsInput, { wide: true }),
    createField(document, "Observações pessoais", personalNotesInput, { wide: true }),
  );

  const flags = createElement(document, "div", {
    className: "summary-editor-flags",
  });
  const importantSwitch = createSwitch(
    document,
    "Manter no atalho de Importantes",
    initialState.record.isImportant,
  );
  const studiedSwitch = createSwitch(
    document,
    "Marcar este Resumo como estudado",
    initialState.isStudied,
  );
  flags.append(importantSwitch.wrapper, studiedSwitch.wrapper);
  metadataPanel.append(metadataGrid, flags);
  body.append(metadataPanel);

  const editors = {};
  const contentPanel = createElement(document, "section", {
    className: "summary-editor-section panel",
  });
  contentPanel.append(
    createElement(document, "div", {
      className: "summary-editor-section-heading",
      text: "Conteúdo principal",
    }),
  );
  editors.mainContent = createRichTextEditor({
    document,
    label: "Conteúdo do Resumo",
    value: initialState.summary.mainContent,
    placeholder: "Construa aqui a base teórica do assunto...",
    required: true,
    onInput: scheduleAutosave,
  });
  contentPanel.append(editors.mainContent.root);
  body.append(contentPanel);

  const optionalPanel = createElement(document, "section", {
    className: "summary-editor-section panel",
  });
  optionalPanel.append(
    createElement(document, "div", {
      className: "summary-editor-section-heading",
      text: "Campos de aprofundamento",
    }),
    createElement(document, "p", {
      className: "summary-section-help",
      text: "Abra somente os blocos úteis para este estudo. Nenhum deles é obrigatório.",
    }),
  );

  const optionalFields = [
    ["studyObjective", "Objetivo do estudo", "O que este Resumo deve esclarecer?"],
    ["keyConcepts", "Conceitos principais", "Liste e diferencie os conceitos centrais..."],
    ["examples", "Exemplos", "Registre exemplos que ajudem a reconhecer o conceito..."],
    ["remainingQuestions", "Dúvidas restantes", "O que ainda precisa ser investigado?"],
    ["synthesis", "Síntese final", "Resuma a ideia central com suas próprias palavras..."],
  ];

  for (const [key, label, placeholder] of optionalFields) {
    const details = createElement(document, "details", {
      className: "summary-optional-group",
    });
    const detailsSummary = createElement(document, "summary", { text: label });
    editors[key] = createRichTextEditor({
      document,
      label,
      value: initialState.summary[key],
      placeholder,
      compact: true,
      onInput: scheduleAutosave,
    });
    details.append(detailsSummary, editors[key].root);
    optionalPanel.append(details);
  }
  body.append(optionalPanel);

  const sourcePanel = createElement(document, "section", {
    className: "summary-editor-section panel",
  });
  sourcePanel.append(
    createElement(document, "div", {
      className: "summary-editor-section-heading",
      text: "Fonte e referências",
    }),
  );
  const sourceGrid = createElement(document, "div", {
    className: "summary-metadata-grid",
  });
  const sourceOptions = [["", "Não informada"]].concat(
    SUMMARY_SOURCE_TYPES.map((type) => [type, SOURCE_LABELS[type]]),
  );
  const sourceTypeSelect = createSelect(
    document,
    sourceOptions,
    initialState.summary.sourceType ?? "",
  );
  const sourceDescriptionInput = createElement(document, "input", {
    attributes: {
      type: "text",
      maxlength: "500",
      placeholder: "Ex.: Aula de Biologia ou material gerado para revisão",
    },
  });
  sourceDescriptionInput.value = initialState.summary.sourceDescription ?? "";
  const referencesInput = createElement(document, "textarea", {
    attributes: {
      rows: "5",
      maxlength: "5000",
      placeholder: "Uma referência por linha",
    },
  });
  referencesInput.value = (initialState.summary.references ?? []).join("\n");
  sourceGrid.append(
    createField(document, "Tipo de fonte", sourceTypeSelect),
    createField(document, "Descrição da fonte", sourceDescriptionInput),
    createField(document, "Referências", referencesInput, {
      wide: true,
      hint: "Podem ser links ou referências textuais.",
    }),
  );
  sourcePanel.append(sourceGrid);
  body.append(sourcePanel);

  const errorMessage = createElement(document, "p", {
    className: "form-error summary-editor-error",
    attributes: { role: "alert" },
  });
  errorMessage.hidden = true;
  body.append(errorMessage);

  const footer = createElement(document, "footer", {
    className: "modal-footer summary-editor-footer",
  });
  const autosaveStatus = createElement(document, "span", {
    className: "summary-autosave-status",
    text: recoveredDraft ? "Rascunho recuperado" : "Nenhuma alteração pendente",
    attributes: { "aria-live": "polite" },
  });
  const footerActions = createElement(document, "div", {
    className: "summary-footer-actions",
  });
  const discardButton = createElement(document, "button", {
    className: "button button-quiet-danger",
    text: "Descartar alterações",
    attributes: { type: "button" },
  });
  const closeFooterButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Fechar",
    attributes: { type: "button" },
  });
  const saveButton = createElement(document, "button", {
    className: "button button-primary",
    text: "Salvar Resumo",
    attributes: { type: "submit" },
  });
  footerActions.append(discardButton, closeFooterButton, saveButton);
  footer.append(autosaveStatus, footerActions);

  form.append(header, body, footer);
  dialog.append(form);
  document.body.append(dialog);

  const watchedInputs = [
    titleInput,
    dateInput,
    statusSelect,
    tagsInput,
    personalNotesInput,
    importantSwitch.input,
    studiedSwitch.input,
    sourceTypeSelect,
    sourceDescriptionInput,
    referencesInput,
  ];
  watchedInputs.forEach((input) => input.addEventListener("input", scheduleAutosave));
  watchedInputs.forEach((input) => input.addEventListener("change", scheduleAutosave));

  function getWorkingState() {
    return {
      record: {
        title: titleInput.value,
        studyDate: dateInput.value,
        tags: normalizeTags(tagsInput.value),
        personalNotes: personalNotesInput.value,
        isImportant: importantSwitch.input.checked,
      },
      summary: {
        mainContent: editors.mainContent.getValue(),
        studyObjective: editors.studyObjective.getValue(),
        keyConcepts: editors.keyConcepts.getValue(),
        examples: editors.examples.getValue(),
        remainingQuestions: editors.remainingQuestions.getValue(),
        synthesis: editors.synthesis.getValue(),
        sourceType: sourceTypeSelect.value || null,
        sourceDescription: sourceDescriptionInput.value,
        references: normalizeReferences(referencesInput.value),
      },
      status: statusSelect.value,
      isStudied: studiedSwitch.input.checked,
    };
  }

  function scheduleAutosave() {
    dirty = true;
    autosaveStatus.textContent = "Salvamento automático pendente...";
    autosaveStatus.classList.remove("save-error");
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(saveDraftNow, autosaveDelayMs);
  }

  function saveDraftNow() {
    clearTimeout(autosaveTimer);

    if (!dirty || finalSaved || discarded) {
      return;
    }

    try {
      const buffer = onAutosave({
        modalInstanceId,
        originalState,
        workingState: getWorkingState(),
      });
      autosaveStatus.textContent = `Rascunho salvo às ${new Intl.DateTimeFormat(
        "pt-BR",
        { hour: "2-digit", minute: "2-digit", second: "2-digit" },
      ).format(new Date(buffer.lastSavedAt))}`;
      autosaveStatus.classList.remove("save-error");
    } catch (error) {
      console.error(error);
      autosaveStatus.textContent = "Falha ao salvar o rascunho";
      autosaveStatus.classList.add("save-error");
    }
  }

  function close({ preserveDraft = true } = {}) {
    if (preserveDraft) {
      saveDraftNow();
    }

    if (dialog.open) {
      dialog.close();
    }
  }

  closeButton.addEventListener("click", () => close());
  closeFooterButton.addEventListener("click", () => close());
  discardButton.addEventListener("click", () => {
    clearTimeout(autosaveTimer);
    discarded = true;
    onDiscardDraft();
    close({ preserveDraft: false });
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => {
    clearTimeout(autosaveTimer);
    dialog.remove();
    onClose({
      finalSaved,
      draftPreserved: !finalSaved && !discarded && dirty,
      discarded,
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    errorMessage.hidden = true;
    saveButton.disabled = true;

    try {
      const workingState = getWorkingState();
      onSubmit(workingState);
      onDiscardDraft();
      finalSaved = true;
      dirty = false;
      close({ preserveDraft: false });
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

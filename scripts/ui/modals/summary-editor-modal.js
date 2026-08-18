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

function createTabSystem(document, tabs) {
  const tabList = createElement(document, "div", {
    className: "summary-editor-tabs",
    attributes: { role: "tablist", "aria-label": "Seções do Editor de Resumo" },
  });
  const panels = new Map();
  const buttons = new Map();

  for (const [id, label] of tabs) {
    const button = createElement(document, "button", {
      className: "summary-editor-tab",
      text: label,
      attributes: {
        type: "button",
        role: "tab",
        id: `summary-tab-${id}`,
        "aria-controls": `summary-panel-${id}`,
        "aria-selected": "false",
        tabindex: "-1",
      },
    });
    const panel = createElement(document, "section", {
      className: "summary-editor-tab-panel",
      attributes: {
        role: "tabpanel",
        id: `summary-panel-${id}`,
        "aria-labelledby": `summary-tab-${id}`,
        tabindex: "0",
      },
    });
    panel.hidden = true;
    tabList.append(button);
    panels.set(id, panel);
    buttons.set(id, button);
  }

  function activate(id, { focus = false } = {}) {
    for (const [tabId, button] of buttons) {
      const active = tabId === id;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      panels.get(tabId).hidden = !active;
    }
    if (focus) {
      buttons.get(id)?.focus();
    }
  }

  for (const [id, button] of buttons) {
    button.addEventListener("click", () => activate(id));
    button.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        return;
      }
      event.preventDefault();
      const ids = [...buttons.keys()];
      const currentIndex = ids.indexOf(id);
      let targetIndex = currentIndex;
      if (event.key === "ArrowLeft") targetIndex = (currentIndex - 1 + ids.length) % ids.length;
      if (event.key === "ArrowRight") targetIndex = (currentIndex + 1) % ids.length;
      if (event.key === "Home") targetIndex = 0;
      if (event.key === "End") targetIndex = ids.length - 1;
      activate(ids[targetIndex], { focus: true });
    });
  }

  activate(tabs[0][0]);
  return { tabList, panels, activate };
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
  const headerTitle = createElement(document, "h2", {
    text: initialState.record.title || "Resumo sem título",
  });
  headerCopy.append(
    createElement(document, "p", { className: "eyebrow", text: "Editor de Resumo" }),
    headerTitle,
    createElement(document, "p", {
      className: "modal-description",
      text: "Edite o conteúdo principal e use as demais abas quando precisar.",
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

  const tabs = createTabSystem(document, [
    ["content", "Conteúdo"],
    ["identification", "Identificação"],
    ["deepening", "Aprofundamento"],
    ["sources", "Fontes"],
  ]);
  body.append(tabs.tabList);

  const editors = {};

  const contentPanel = tabs.panels.get("content");
  editors.mainContent = createRichTextEditor({
    document,
    label: "Conteúdo do Resumo",
    value: initialState.summary.mainContent,
    placeholder: "Construa aqui a base teórica do assunto...",
    required: true,
    onInput: scheduleAutosave,
  });
  const studiedSwitch = createSwitch(
    document,
    "Confirmar este Resumo como estudado",
    initialState.isStudied,
  );
  contentPanel.append(
    createElement(document, "p", {
      className: "summary-section-help",
      text: "Construa a base teórica deste assunto. O conteúdo principal é obrigatório apenas para concluir o Resumo.",
    }),
    editors.mainContent.root,
    createElement(document, "div", {
      className: "summary-editor-flags summary-editor-content-flags",
      children: [studiedSwitch.wrapper],
    }),
  );

  const titleInput = createElement(document, "input", {
    attributes: {
      type: "text",
      maxlength: "160",
      autocomplete: "off",
      placeholder: "Ex.: Cadeias alimentares: conceitos essenciais",
    },
  });
  titleInput.value = initialState.record.title ?? "";

  const typeInput = createElement(document, "input", {
    attributes: { type: "text", value: "Resumo", disabled: "", "aria-label": "Tipo do registro" },
  });

  const dateInput = createElement(document, "input", {
    attributes: { type: "date", required: "" },
  });
  dateInput.value = initialState.record.studyDate;

  const tagsInput = createElement(document, "input", {
    attributes: {
      type: "text",
      maxlength: "240",
      autocomplete: "off",
      placeholder: "Ex.: ecologia, base teórica, revisão",
    },
  });
  tagsInput.value = (initialState.record.tags ?? []).join(", ");

  const personalNotesInput = createElement(document, "textarea", {
    attributes: {
      rows: "3",
      maxlength: "2000",
      placeholder: "Observações sobre este registro...",
    },
  });
  personalNotesInput.value = initialState.record.personalNotes ?? "";

  const importantSwitch = createSwitch(
    document,
    "Marcar como importante",
    initialState.record.isImportant,
  );

  const identificationPanel = tabs.panels.get("identification");
  const metadataGrid = createElement(document, "div", {
    className: "summary-metadata-grid",
  });
  metadataGrid.append(
    createField(document, "Título", titleInput, { wide: true }),
    createField(document, "Tipo", typeInput),
    createField(document, "Data de estudo", dateInput),
    createField(document, "Tags", tagsInput, {
      wide: true,
      hint: "Separe as tags por vírgulas.",
    }),
    createField(document, "Observações", personalNotesInput, { wide: true }),
  );
  identificationPanel.append(
    metadataGrid,
    createElement(document, "div", {
      className: "summary-editor-flags",
      children: [importantSwitch.wrapper],
    }),
  );

  const deepeningPanel = tabs.panels.get("deepening");
  deepeningPanel.append(
    createElement(document, "p", {
      className: "summary-section-help",
      text: "Use apenas os complementos que ajudarem neste estudo. Todos são opcionais.",
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
    deepeningPanel.append(details);
  }

  const sourcesPanel = tabs.panels.get("sources");
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
      placeholder: "Ex.: Aula de Biologia ou material de revisão",
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
  sourcesPanel.append(sourceGrid);

  for (const panel of tabs.panels.values()) {
    body.append(panel);
  }

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
    text: recoveredDraft ? "Rascunho recuperado" : "Salvo",
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
  const saveButton = createElement(document, "button", {
    className: "button button-primary",
    text: "Salvar Resumo",
    attributes: { type: "submit" },
  });
  footerActions.append(discardButton, saveButton);
  footer.append(autosaveStatus, footerActions);

  form.append(header, body, footer);
  dialog.append(form);
  document.body.append(dialog);

  const watchedInputs = [
    titleInput,
    dateInput,
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
  titleInput.addEventListener("input", () => {
    headerTitle.textContent = titleInput.value.trim() || "Resumo sem título";
  });

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
      status: initialState.status,
      isStudied: studiedSwitch.input.checked,
    };
  }

  function scheduleAutosave() {
    dirty = true;
    autosaveStatus.textContent = "Alterações não salvas";
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
      onAutosave({
        modalInstanceId,
        originalState,
        workingState: getWorkingState(),
      });
      autosaveStatus.textContent = "Salvo";
      autosaveStatus.classList.remove("save-error");
    } catch (error) {
      console.error(error);
      autosaveStatus.textContent = "Falha ao salvar";
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
  const contentEditable = editors.mainContent.root.querySelector("[contenteditable='true']");
  contentEditable?.focus();
  return dialog;
}

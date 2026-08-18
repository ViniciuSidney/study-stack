import { getChecklistStats } from "../../domain/note.js";
import { createElement } from "../../utils/dom.js";
import { createRichTextEditor } from "../components/rich-text-editor.js";

const TYPE_LABELS = Object.freeze({
  summary: "Resumo",
  note: "Anotação",
  imported_session: "Lista importada",
  error_record: "Registro de erro",
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

function normalizeTags(value) {
  return String(value ?? "")
    .split(/[;,]/u)
    .map((tag) => tag.trim())
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
    attributes: { role: "tablist", "aria-label": "Seções do Editor de Anotação" },
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
        id: `note-tab-${id}`,
        "aria-controls": `note-panel-${id}`,
        "aria-selected": "false",
        tabindex: "-1",
      },
    });
    const panel = createElement(document, "section", {
      className: "summary-editor-tab-panel",
      attributes: {
        role: "tabpanel",
        id: `note-panel-${id}`,
        "aria-labelledby": `note-tab-${id}`,
        tabindex: "0",
      },
    });
    panel.hidden = true;
    tabList.append(button);
    buttons.set(id, button);
    panels.set(id, panel);
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
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        return;
      }

      event.preventDefault();
      const ids = [...buttons.keys()];
      const currentIndex = ids.indexOf(id);
      let targetIndex = currentIndex;

      if (event.key === "ArrowLeft") {
        targetIndex = (currentIndex - 1 + ids.length) % ids.length;
      }
      if (event.key === "ArrowRight") {
        targetIndex = (currentIndex + 1) % ids.length;
      }
      if (event.key === "Home") {
        targetIndex = 0;
      }
      if (event.key === "End") {
        targetIndex = ids.length - 1;
      }

      activate(ids[targetIndex], { focus: true });
    });
  }

  activate(tabs[0][0]);
  return { tabList, panels };
}

function createLinkPicker({ document, options, selectedIds, onInput }) {
  const root = createElement(document, "div", { className: "note-link-picker" });
  const search = createElement(document, "input", {
    className: "note-link-search",
    attributes: {
      type: "search",
      placeholder: "Buscar registros do mesmo assunto...",
      "aria-label": "Buscar registros para vincular",
    },
  });
  const list = createElement(document, "div", {
    className: "note-link-list",
    attributes: { role: "group", "aria-label": "Registros vinculáveis" },
  });
  const empty = createElement(document, "p", {
    className: "note-link-empty",
    text: options.length
      ? "Nenhum registro corresponde à busca."
      : "Ainda não há outros registros neste assunto.",
  });
  empty.hidden = options.length > 0;
  const inputs = new Map();

  for (const option of options) {
    const label = createElement(document, "label", {
      className: `note-link-option${option.archivedAt ? " archived" : ""}`,
      attributes: {
        "data-link-search": `${option.title} ${TYPE_LABELS[option.type] ?? option.type}`
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/gu, "")
          .toLocaleLowerCase("pt-BR"),
      },
    });
    const input = createElement(document, "input", {
      attributes: { type: "checkbox", value: option.id },
    });
    input.checked = selectedIds.includes(option.id);
    const copy = createElement(document, "span");
    copy.append(
      createElement(document, "strong", { text: option.title }),
      createElement(document, "small", {
        text: `${TYPE_LABELS[option.type] ?? option.type} · ${option.studyDate}${
          option.archivedAt ? " · Arquivado" : ""
        }`,
      }),
    );
    input.addEventListener("change", onInput);
    label.append(input, copy);
    list.append(label);
    inputs.set(option.id, input);
  }

  search.addEventListener("input", () => {
    const query = search.value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLocaleLowerCase("pt-BR")
      .trim();
    let visible = 0;

    list.querySelectorAll(".note-link-option").forEach((label) => {
      const matches = !query || label.dataset.linkSearch.includes(query);
      label.hidden = !matches;
      visible += Number(matches);
    });

    empty.hidden = visible > 0;
  });

  root.append(search, list, empty);

  return Object.freeze({
    root,
    getSelectedIds() {
      return [...inputs.entries()]
        .filter(([, input]) => input.checked)
        .map(([id]) => id);
    },
  });
}

export function openNoteEditorModal({
  document,
  view,
  linkOptions = [],
  recoveredDraft = null,
  autosaveDelayMs = 900,
  onAutosave,
  onDiscardDraft,
  onSubmit,
  onClose = () => {},
}) {
  const { record, note } = view;
  const modalInstanceId = `note-editor-${Date.now()}-${Math.random()
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
    note: {
      content: note.content,
      linkedRecordIds: note.linkedRecordIds,
    },
    status: record.status,
  };
  const initialState = recoveredDraft?.workingState ?? originalState;
  let autosaveTimer = null;
  let finalSaved = false;
  let discarded = false;
  let dirty = Boolean(recoveredDraft);

  const dialog = createElement(document, "dialog", {
    className: "modal summary-editor-modal note-editor-modal",
  });
  const form = createElement(document, "form", {
    className: "modal-card summary-editor-card note-editor-card",
    attributes: { method: "dialog" },
  });

  const header = createElement(document, "header", {
    className: "modal-header summary-editor-header",
  });
  const headerCopy = createElement(document, "div");
  const headerTitle = createElement(document, "h2", {
    text: initialState.record.title || "Anotação sem título",
  });
  headerCopy.append(
    createElement(document, "p", { className: "eyebrow", text: "Editor de Anotação" }),
    headerTitle,
    createElement(document, "p", {
      className: "modal-description",
      text: "Registre ideias, dúvidas, relações, explicações ou lembretes.",
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
    ["links", "Vínculos"],
  ]);
  body.append(tabs.tabList);

  const contentPanel = tabs.panels.get("content");

  if (note.createdFromQuickDetail) {
    const originBanner = createElement(document, "section", {
      className: "quick-detail-origin-banner",
    });
    originBanner.append(
      createElement(document, "strong", { text: "Criada como Apenas um detalhe" }),
      createElement(document, "span", {
        text: note.quickDetailExpandedAt
          ? "Agora ela está aberta no editor completo e continua sendo uma Anotação comum."
          : "Esta é a primeira abertura no editor completo.",
      }),
    );
    contentPanel.append(originBanner);
  }

  const editor = createRichTextEditor({
    document,
    label: "Conteúdo da Anotação",
    value: initialState.note.content,
    placeholder: "Registre ideias, dúvidas, relações, explicações ou lembretes...",
    required: true,
    onInput: () => {
      updateChecklistStatus();
      scheduleAutosave();
    },
  });
  const checklistStatus = createElement(document, "p", {
    className: "note-checklist-live",
    attributes: { "aria-live": "polite" },
  });
  const checklistHelp = createElement(document, "details", {
    className: "note-checklist-help",
  });
  checklistHelp.append(
    createElement(document, "summary", { text: "Como usar checklists" }),
    createElement(document, "p", {
      className: "summary-section-help",
      text: "Escreva [ ] antes de um item pendente e [x] antes de um item concluído.",
    }),
  );
  contentPanel.append(editor.root, checklistStatus, checklistHelp);

  const titleInput = createElement(document, "input", {
    attributes: {
      type: "text",
      maxlength: "160",
      autocomplete: "off",
      placeholder: "Ex.: Diferença entre cadeia e teia alimentar",
    },
  });
  titleInput.value = initialState.record.title ?? "";

  const typeInput = createElement(document, "input", {
    attributes: {
      type: "text",
      value: "Anotação",
      disabled: "",
      "aria-label": "Tipo do registro",
    },
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
      placeholder: "Ex.: dúvida, conexão, revisão",
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
  const flags = createElement(document, "div", {
    className: "summary-editor-flags note-editor-flags",
  });
  flags.append(importantSwitch.wrapper);
  identificationPanel.append(metadataGrid, flags);

  const linksPanel = tabs.panels.get("links");
  linksPanel.append(
    createElement(document, "p", {
      className: "summary-section-help",
      text: "Vincule Resumos ou outras Anotações deste mesmo assunto. Arquivar um registro não rompe o vínculo.",
    }),
  );
  const linkPicker = createLinkPicker({
    document,
    options: linkOptions,
    selectedIds: initialState.note.linkedRecordIds ?? [],
    onInput: scheduleAutosave,
  });
  linksPanel.append(linkPicker.root);

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
    text: "Salvar Anotação",
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
  ];
  watchedInputs.forEach((input) => input.addEventListener("input", scheduleAutosave));
  watchedInputs.forEach((input) => input.addEventListener("change", scheduleAutosave));
  titleInput.addEventListener("input", () => {
    headerTitle.textContent = titleInput.value.trim() || "Anotação sem título";
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
      note: {
        content: editor.getValue(),
        linkedRecordIds: linkPicker.getSelectedIds(),
      },
      status: initialState.status,
    };
  }

  function updateChecklistStatus() {
    const stats = getChecklistStats({
      content: {
        plainText: editor.getValue().plainText,
      },
    });
    checklistStatus.textContent = stats.total
      ? `${stats.completed} de ${stats.total} itens concluídos.`
      : "Nenhum checklist detectado.";
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
      const buffer = onAutosave({
        modalInstanceId,
        originalState,
        workingState: getWorkingState(),
      });
      autosaveStatus.textContent = `Salvo às ${new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date(buffer.lastSavedAt))}`;
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
      onSubmit(getWorkingState());
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

  updateChecklistStatus();
  dialog.showModal();
  editor.root.querySelector('[contenteditable="true"]')?.focus();
  return dialog;
}

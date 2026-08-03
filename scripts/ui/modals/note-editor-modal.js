import { getChecklistStats } from "../../domain/note.js";
import { createElement } from "../../utils/dom.js";
import { createRichTextEditor } from "../components/rich-text-editor.js";

const STATUS_OPTIONS = Object.freeze([
  ["draft", "Rascunho"],
  ["in_progress", "Em andamento"],
  ["completed", "Concluída"],
]);

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
  headerCopy.append(
    createElement(document, "p", { className: "eyebrow", text: "Editor de Anotação" }),
    createElement(document, "h2", {
      text: record.title || "Anotação sem título",
    }),
    createElement(document, "p", {
      className: "modal-description",
      text:
        "Escreva livremente, use marca-texto, checklists textuais e vínculos com registros do mesmo assunto.",
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
    body.append(originBanner);
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
      placeholder: "Ex.: Diferença entre cadeia e teia alimentar",
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
      placeholder: "dúvida, conexão, revisão",
    },
  });
  tagsInput.value = (initialState.record.tags ?? []).join(", ");
  const personalNotesInput = createElement(document, "textarea", {
    attributes: {
      rows: "3",
      maxlength: "2000",
      placeholder: "Observações gerais sobre este registro...",
    },
  });
  personalNotesInput.value = initialState.record.personalNotes ?? "";
  metadataGrid.append(
    createField(document, "Título", titleInput, {
      wide: true,
      hint: "Obrigatório para concluir a Anotação.",
    }),
    createField(document, "Data de estudo", dateInput),
    createField(document, "Status", statusSelect),
    createField(document, "Tags separadas por vírgula", tagsInput, { wide: true }),
    createField(document, "Observações pessoais", personalNotesInput, { wide: true }),
  );
  const flags = createElement(document, "div", {
    className: "summary-editor-flags note-editor-flags",
  });
  const importantSwitch = createSwitch(
    document,
    "Manter no atalho de Importantes",
    initialState.record.isImportant,
  );
  flags.append(importantSwitch.wrapper);
  metadataPanel.append(metadataGrid, flags);
  body.append(metadataPanel);

  const contentPanel = createElement(document, "section", {
    className: "summary-editor-section panel",
  });
  contentPanel.append(
    createElement(document, "div", {
      className: "summary-editor-section-heading",
      text: "Conteúdo da Anotação",
    }),
    createElement(document, "p", {
      className: "summary-section-help",
      text:
        "Checklists permanecem como texto: escreva [ ] item pendente e [x] item concluído.",
    }),
  );
  const editor = createRichTextEditor({
    document,
    label: "Conteúdo livre",
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
  contentPanel.append(editor.root, checklistStatus);
  body.append(contentPanel);

  const linksPanel = createElement(document, "section", {
    className: "summary-editor-section panel",
  });
  linksPanel.append(
    createElement(document, "div", {
      className: "summary-editor-section-heading",
      text: "Registros vinculados",
    }),
    createElement(document, "p", {
      className: "summary-section-help",
      text:
        "Vincule Resumos ou outras Anotações deste mesmo assunto. Arquivar um registro não rompe o vínculo.",
    }),
  );
  const linkPicker = createLinkPicker({
    document,
    options: linkOptions,
    selectedIds: initialState.note.linkedRecordIds ?? [],
    onInput: scheduleAutosave,
  });
  linksPanel.append(linkPicker.root);
  body.append(linksPanel);

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
    text: "Salvar Anotação",
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
      note: {
        content: editor.getValue(),
        linkedRecordIds: linkPicker.getSelectedIds(),
      },
      status: statusSelect.value,
    };
  }

  function updateChecklistStatus() {
    const stats = getChecklistStats({
      content: {
        plainText: editor.getValue().plainText,
      },
    });
    checklistStatus.textContent = stats.total
      ? `${stats.completed} de ${stats.total} itens textuais marcados como concluídos.`
      : "Nenhum checklist textual detectado.";
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
  titleInput.focus();
  return dialog;
}

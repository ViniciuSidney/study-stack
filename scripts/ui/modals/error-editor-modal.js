import { ERROR_TAG_OPTIONS } from "../../domain/error-record.js";
import { createElement } from "../../utils/dom.js";

const TYPE_LABELS = Object.freeze({
  summary: "Resumo",
  note: "Anotação",
});

function appendRichContent(document, container, value, emptyText) {
  if (!value?.plainText) {
    container.append(
      createElement(document, "p", {
        className: "muted error-empty-answer",
        text: emptyText,
      }),
    );
    return;
  }

  const content = createElement(document, "div", {
    className: "rich-content-display",
  });
  content.innerHTML = value.content;
  container.append(content);
}

function createSourceBlock(document, title, value, emptyText) {
  const block = createElement(document, "section", {
    className: "error-source-block",
  });
  block.append(createElement(document, "h4", { text: title }));
  appendRichContent(document, block, value, emptyText);
  return block;
}

function createTextAreaField(document, label, value, placeholder, rows = 5) {
  const field = createElement(document, "label", { className: "field" });
  field.append(createElement(document, "span", { text: label }));
  const textarea = createElement(document, "textarea", {
    attributes: { rows: String(rows), placeholder },
  });
  textarea.value =
    typeof value === "string" ? value : value?.plainText ?? "";
  field.append(textarea);
  return { field, textarea };
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function openErrorEditorModal({
  document,
  view,
  linkOptions,
  recoveredDraft = null,
  autosaveDelayMs = 900,
  onAutosave,
  onDiscardDraft,
  onSubmit,
  onClose = () => {},
}) {
  const { record, errorRecord, primaryQuestion, occurrences, evidences } = view;
  const modalInstanceId = `error-editor-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const originalState = {
    title: record.title,
    studyDate: record.studyDate,
    isImportant: record.isImportant,
    whyItHappened: errorRecord.analysis.whyItHappened?.plainText ?? "",
    correctRule: errorRecord.analysis.correctRule?.plainText ?? "",
    howToAvoid: errorRecord.analysis.howToAvoid?.plainText ?? "",
    errorTags: [...errorRecord.errorTags],
    linkedRecordIds: [...errorRecord.linkedRecordIds],
    personalNotes: record.personalNotes?.plainText ?? "",
  };
  const initialState = recoveredDraft?.workingState ?? originalState;
  let autosaveTimer = null;
  let finalSaved = false;
  let discarded = false;
  let dirty = Boolean(recoveredDraft);
  const dialog = createElement(document, "dialog", {
    className: "modal error-editor-modal",
  });
  const card = createElement(document, "form", {
    className: "modal-card error-editor-card",
  });
  card.noValidate = true;

  const header = createElement(document, "header", {
    className: "modal-header error-editor-header",
  });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", { className: "eyebrow", text: "Análise metacognitiva" }),
    createElement(document, "h2", { text: "Analisar Registro de Erro" }),
    createElement(document, "p", {
      className: "modal-description",
      text:
        "A análise pode permanecer como rascunho. Ela fica completa quando causa, regra correta e prevenção estiverem preenchidas.",
    }),
  );
  const closeButton = createElement(document, "button", {
    className: "icon-button",
    text: "×",
    attributes: { type: "button", "aria-label": "Fechar análise" },
  });
  header.append(copy, closeButton);

  const body = createElement(document, "div", {
    className: "modal-body error-editor-body",
  });

  const statePanel = createElement(document, "section", {
    className: `error-editor-state error-editor-state-${view.category}`,
  });
  statePanel.append(
    createElement(document, "strong", {
      text:
        errorRecord.masteryStatus === "overcome"
          ? "Erro superado"
          : errorRecord.recurrenceCount > 0
            ? "Erro reincidente"
            : errorRecord.reviewStatus === "reviewed"
              ? "Erro revisado"
              : "Erro pendente",
    }),
    createElement(document, "span", {
      text: `${errorRecord.recurrenceCount} reincidência(s) · ${errorRecord.reviewCount} revisão(ões) · ${errorRecord.currentCorrectStreak}/2 acertos consecutivos`,
    }),
  );
  body.append(statePanel);

  if (recoveredDraft) {
    const recovery = createElement(document, "section", {
      className: "draft-recovery-banner",
      attributes: { role: "status" },
    });
    recovery.append(
      createElement(document, "strong", { text: "Rascunho de análise recuperado" }),
      createElement(document, "span", {
        text: `Salvo automaticamente em ${new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(recoveredDraft.lastSavedAt))}.`,
      }),
    );
    body.append(recovery);
  }

  const source = createElement(document, "section", {
    className: "error-editor-section error-question-source",
  });
  source.append(
    createElement(document, "div", { className: "error-editor-section-heading" }),
  );
  source.firstElementChild.append(
    createElement(document, "div", {
      className: "placeholder-icon compact-placeholder-icon",
      text: "!",
    }),
    createElement(document, "div"),
  );
  source.firstElementChild.lastElementChild.append(
    createElement(document, "p", { className: "eyebrow", text: `Questão ${primaryQuestion.order}` }),
    createElement(document, "h3", { text: primaryQuestion.statement.plainText }),
  );
  const sourceGrid = createElement(document, "div", { className: "error-source-grid" });
  sourceGrid.append(
    createSourceBlock(
      document,
      "Sua resposta",
      primaryQuestion.userAnswer,
      "Resposta não registrada.",
    ),
    createSourceBlock(
      document,
      "Resposta correta",
      primaryQuestion.correctAnswer,
      "Resposta correta não fornecida.",
    ),
  );
  if (primaryQuestion.correction?.plainText) {
    sourceGrid.append(
      createSourceBlock(
        document,
        "Correção e explicação",
        primaryQuestion.correction,
        "Correção não informada.",
      ),
    );
  }
  source.append(sourceGrid);
  body.append(source);

  const metadata = createElement(document, "section", {
    className: "error-editor-section",
  });
  metadata.append(createElement(document, "h3", { text: "Identificação" }));
  const metadataGrid = createElement(document, "div", {
    className: "error-metadata-grid",
  });
  const titleField = createElement(document, "label", { className: "field field-wide" });
  titleField.append(createElement(document, "span", { text: "Título" }));
  const titleInput = createElement(document, "input", {
    attributes: { type: "text", required: "", maxlength: "180" },
  });
  titleInput.value = initialState.title ?? record.title;
  titleField.append(titleInput);

  const dateField = createElement(document, "label", { className: "field" });
  dateField.append(createElement(document, "span", { text: "Data de estudo" }));
  const dateInput = createElement(document, "input", {
    attributes: { type: "date", required: "" },
  });
  dateInput.value = initialState.studyDate ?? record.studyDate;
  dateField.append(dateInput);

  const importantField = createElement(document, "label", {
    className: "toggle-row error-important-toggle",
  });
  importantField.append(
    createElement(document, "span", { text: "Marcar como importante" }),
  );
  const importantSwitch = createElement(document, "span", { className: "switch" });
  const importantInput = createElement(document, "input", {
    attributes: { type: "checkbox" },
  });
  importantInput.checked = Boolean(initialState.isImportant);
  importantSwitch.append(
    importantInput,
    createElement(document, "span", { className: "switch-track" }),
  );
  importantField.append(importantSwitch);
  metadataGrid.append(titleField, dateField, importantField);
  metadata.append(metadataGrid);
  body.append(metadata);

  const analysis = createElement(document, "section", {
    className: "error-editor-section",
  });
  analysis.append(
    createElement(document, "h3", { text: "Análise do erro" }),
    createElement(document, "p", {
      className: "section-helper",
      text:
        "Escreva com precisão suficiente para reconhecer o padrão no futuro, sem transformar o registro em um resumo inteiro.",
    }),
  );
  const why = createTextAreaField(
    document,
    "Por que o erro aconteceu?",
    initialState.whyItHappened,
    "Ex.: confundi nível trófico com posição fixa e ignorei que um organismo pode ocupar posições diferentes.",
  );
  const rule = createTextAreaField(
    document,
    "Qual é a regra ou o conceito correto?",
    initialState.correctRule,
    "Registre a regra correta, a condição em que se aplica e uma distinção importante.",
  );
  const avoid = createTextAreaField(
    document,
    "Como evitar o mesmo erro?",
    initialState.howToAvoid,
    "Ex.: antes de responder, identificar a cadeia analisada e verificar o alimento de cada organismo.",
  );
  analysis.append(why.field, rule.field, avoid.field);
  body.append(analysis);

  const classification = createElement(document, "section", {
    className: "error-editor-section",
  });
  classification.append(createElement(document, "h3", { text: "Classificação" }));
  const tagPicker = createElement(document, "div", {
    className: "error-tag-picker",
    attributes: { role: "group", "aria-label": "Categorias do erro" },
  });
  const tagInputs = [];
  ERROR_TAG_OPTIONS.forEach((tag) => {
    const option = createElement(document, "label", { className: "error-tag-option" });
    const input = createElement(document, "input", {
      attributes: { type: "checkbox", value: tag },
    });
    input.checked = (initialState.errorTags ?? []).includes(tag);
    tagInputs.push(input);
    option.append(input, createElement(document, "span", { text: tag }));
    tagPicker.append(option);
  });
  classification.append(tagPicker);
  body.append(classification);

  const links = createElement(document, "section", {
    className: "error-editor-section",
  });
  links.append(
    createElement(document, "h3", { text: "Registros relacionados" }),
    createElement(document, "p", {
      className: "section-helper",
      text: "Vincule Resumos e Anotações do mesmo assunto que ajudam a corrigir este erro.",
    }),
  );
  const linkList = createElement(document, "div", { className: "error-link-list" });
  const linkInputs = [];
  if (!linkOptions.length) {
    linkList.append(
      createElement(document, "p", {
        className: "note-link-empty",
        text: "Nenhum Resumo ou Anotação disponível neste assunto.",
      }),
    );
  } else {
    linkOptions.forEach((linkedRecord) => {
      const option = createElement(document, "label", {
        className: `error-link-option${linkedRecord.archivedAt ? " archived" : ""}`,
      });
      const input = createElement(document, "input", {
        attributes: { type: "checkbox", value: linkedRecord.id },
      });
      input.checked = (initialState.linkedRecordIds ?? []).includes(
        linkedRecord.id,
      );
      linkInputs.push(input);
      const text = createElement(document, "span");
      text.append(
        createElement(document, "strong", { text: linkedRecord.title }),
        createElement(document, "small", {
          text: `${TYPE_LABELS[linkedRecord.type]}${linkedRecord.archivedAt ? " · arquivado" : ""}`,
        }),
      );
      option.append(input, text);
      linkList.append(option);
    });
  }
  links.append(linkList);
  body.append(links);

  const notes = createTextAreaField(
    document,
    "Observação complementar",
    initialState.personalNotes,
    "Informação opcional que não faz parte dos três campos da análise.",
    3,
  );
  const notesSection = createElement(document, "section", {
    className: "error-editor-section",
  });
  notesSection.append(notes.field);
  body.append(notesSection);

  const history = createElement(document, "section", {
    className: "error-editor-history error-editor-section",
  });
  const historyToggle = createElement(document, "button", {
    className: "error-editor-history-toggle",
    text: `Ocorrências e evidências · ${occurrences.length + evidences.length}`,
    attributes: {
      type: "button",
      "aria-expanded": "false",
    },
  });
  const timeline = createElement(document, "ol", {
    className: "error-mini-timeline",
    attributes: { hidden: "" },
  });
  const items = [
    ...occurrences.map((occurrence) => ({
      at: occurrence.occurredAt,
      kind: occurrence.kind === "initial" ? "Ocorrência inicial" : "Reincidência",
      text: occurrence.kind === "initial" ? "O erro foi registrado." : "O erro voltou a acontecer.",
      className: "occurrence",
    })),
    ...evidences.map((evidence) => ({
      at: evidence.answeredAt,
      kind: evidence.invalidatedAt ? "Evidência histórica" : "Evidência correta",
      text: evidence.invalidatedAt
        ? "Esta evidência foi invalidada por uma reincidência posterior."
        : `Posição ${evidence.sequencePosition} na sequência atual.`,
      className: evidence.invalidatedAt ? "invalidated" : "evidence",
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  items.forEach((item) => {
    const entry = createElement(document, "li", {
      className: `error-mini-event ${item.className}`,
    });
    entry.append(
      createElement(document, "strong", { text: item.kind }),
      createElement(document, "span", { text: item.text }),
      createElement(document, "small", { text: formatDateTime(item.at) }),
    );
    timeline.append(entry);
  });
  historyToggle.addEventListener("click", () => {
    const willOpen = timeline.hidden;
    timeline.hidden = !willOpen;
    history.classList.toggle("open", willOpen);
    historyToggle.setAttribute("aria-expanded", String(willOpen));

    if (willOpen) {
      requestAnimationFrame(() => {
        const bodyRect = body.getBoundingClientRect();
        const historyRect = history.getBoundingClientRect();
        const targetScrollTop =
          body.scrollTop + historyRect.top - bodyRect.top - 12;
        body.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: "auto",
        });
      });
    }
  });
  history.append(historyToggle, timeline);
  body.append(history);

  const errorMessage = createElement(document, "p", {
    className: "form-error",
    attributes: { role: "alert" },
  });
  errorMessage.hidden = true;
  body.append(errorMessage);

  const footer = createElement(document, "footer", {
    className: "modal-footer error-editor-footer",
  });
  const footerStatus = createElement(document, "div", {
    className: "error-editor-footer-status",
  });
  const completion = createElement(document, "span", {
    className: "error-analysis-status",
    text: errorRecord.analysis.isComplete
      ? "Análise completa"
      : "Pode ser salva como rascunho",
  });
  const autosaveStatus = createElement(document, "span", {
    className: "summary-autosave-status",
    text: recoveredDraft ? "Rascunho recuperado" : "Nenhuma alteração pendente",
    attributes: { "aria-live": "polite" },
  });
  footerStatus.append(completion, autosaveStatus);
  const actions = createElement(document, "div", { className: "summary-footer-actions" });
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
    text: "Salvar análise",
    attributes: { type: "submit" },
  });
  actions.append(discardButton, closeFooterButton, saveButton);
  footer.append(footerStatus, actions);
  card.append(header, body, footer);
  dialog.append(card);
  document.body.append(dialog);

  function getWorkingState() {
    return {
      title: titleInput.value,
      studyDate: dateInput.value,
      isImportant: importantInput.checked,
      whyItHappened: why.textarea.value,
      correctRule: rule.textarea.value,
      howToAvoid: avoid.textarea.value,
      errorTags: tagInputs
        .filter((input) => input.checked)
        .map((input) => input.value),
      linkedRecordIds: linkInputs
        .filter((input) => input.checked)
        .map((input) => input.value),
      personalNotes: notes.textarea.value,
    };
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

  function scheduleAutosave() {
    dirty = true;
    autosaveStatus.textContent = "Salvamento automático pendente...";
    autosaveStatus.classList.remove("save-error");
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(saveDraftNow, autosaveDelayMs);
  }

  function close({ preserveDraft = true } = {}) {
    if (preserveDraft) {
      saveDraftNow();
    }
    if (dialog.open) {
      dialog.close();
    }
  }

  const watchedInputs = [
    titleInput,
    dateInput,
    importantInput,
    why.textarea,
    rule.textarea,
    avoid.textarea,
    notes.textarea,
    ...tagInputs,
    ...linkInputs,
  ];
  watchedInputs.forEach((input) => {
    input.addEventListener("input", scheduleAutosave);
    input.addEventListener("change", scheduleAutosave);
  });

  card.addEventListener("submit", (event) => {
    event.preventDefault();
    errorMessage.hidden = true;
    saveButton.disabled = true;
    const workingState = getWorkingState();
    const title = workingState.title.trim();
    if (!title) {
      errorMessage.textContent = "Informe um título para o Registro de Erro.";
      errorMessage.hidden = false;
      saveButton.disabled = false;
      titleInput.focus();
      return;
    }
    if (!workingState.studyDate) {
      errorMessage.textContent = "Informe a data de estudo.";
      errorMessage.hidden = false;
      saveButton.disabled = false;
      dateInput.focus();
      return;
    }

    try {
      onSubmit({ ...workingState, title });
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

  dialog.showModal();
  titleInput.focus();
  return dialog;
}

import { createElement } from "../../utils/dom.js";
import {
  PERCEIVED_MASTERY_LEVELS,
  getPerceivedMasteryLevel,
} from "../overview-perception.js";

const STUDY_STATE_OPTIONS = Object.freeze([
  { value: "initial_base", label: "Base inicial" },
  { value: "in_practice", label: "Em prática" },
  { value: "in_review", label: "Em revisão" },
  { value: "consolidated", label: "Consolidado" },
]);

function createField(document, labelText, input, helpText = "") {
  const field = createElement(document, "label", { className: "field" });
  field.append(createElement(document, "span", { text: labelText }), input);
  if (helpText) {
    field.append(createElement(document, "small", { text: helpText }));
  }
  return field;
}

function createTextArea(document, name, value, placeholder, rows = 4) {
  const textarea = createElement(document, "textarea", {
    attributes: {
      name,
      rows: String(rows),
      maxlength: "2000",
      placeholder,
    },
  });
  textarea.value = value ?? "";
  return textarea;
}

function createStudyStateSelect(document, value) {
  const select = createElement(document, "select", {
    attributes: {
      name: "studyState",
      title: "Esta é uma percepção pessoal da etapa, separada do progresso calculado pelas evidências.",
    },
  });

  STUDY_STATE_OPTIONS.forEach((option) => {
    const element = createElement(document, "option", {
      text: option.label,
      attributes: { value: option.value },
    });
    element.selected = option.value === value;
    select.append(element);
  });

  return select;
}

function createMasterySelect(document, value) {
  const select = createElement(document, "select", {
    attributes: {
      name: "perceivedMastery",
      title: "Autoavaliação pessoal. Ela não altera a pontuação objetiva do assunto.",
    },
  });
  select.append(
    createElement(document, "option", {
      text: "Não informado",
      attributes: { value: "" },
    }),
  );

  const currentLevel = getPerceivedMasteryLevel(value);
  PERCEIVED_MASTERY_LEVELS.forEach((level) => {
    const option = createElement(document, "option", {
      text: level.label,
      attributes: { value: String(level.value) },
    });
    option.selected = currentLevel?.value === level.value;
    select.append(option);
  });

  if (!currentLevel) {
    select.value = "";
  }

  return select;
}

function createGroup(document, title, description) {
  const section = createElement(document, "section", {
    className: "overview-editor-group",
  });
  const header = createElement(document, "header", {
    className: "overview-editor-group-header",
  });
  header.append(
    createElement(document, "h3", { text: title }),
    createElement(document, "p", { text: description }),
  );
  section.append(header);
  return section;
}

export function openOverviewEditorModal({
  document,
  subject,
  onSubmit,
  onClose = () => {},
}) {
  const dialog = createElement(document, "dialog", {
    className: "modal overview-editor-modal",
  });
  const form = createElement(document, "form", {
    className: "modal-card overview-editor-card",
    attributes: { method: "dialog" },
  });

  const header = createElement(document, "header", { className: "modal-header" });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", { className: "eyebrow", text: "Visão Geral" }),
    createElement(document, "h2", { text: "Editar Visão Geral" }),
    createElement(document, "p", {
      className: "modal-description",
      text: "Registre o que ajuda a orientar seu próximo estudo.",
    }),
  );
  const closeButton = createElement(document, "button", {
    className: "icon-button",
    text: "×",
    attributes: { type: "button", "aria-label": "Fechar modal" },
  });
  header.append(copy, closeButton);

  const body = createElement(document, "div", {
    className: "modal-body overview-editor-body",
  });

  const stateSelect = createStudyStateSelect(document, subject.studyState);
  const masterySelect = createMasterySelect(
    document,
    subject.overview.perceivedMastery,
  );

  const momentGroup = createGroup(
    document,
    "Momento percebido",
    "Como você sente o assunto agora.",
  );
  const metaGrid = createElement(document, "div", {
    className: "overview-editor-meta-grid",
  });
  metaGrid.append(
    createField(document, "Percepção da etapa", stateSelect),
    createField(document, "Segurança no assunto", masterySelect),
  );
  momentGroup.append(
    metaGrid,
    createField(
      document,
      "Percepção atual",
      createTextArea(
        document,
        "currentPerception",
        subject.overview.currentPerception?.plainText,
        "O que já está claro e o que ainda parece frágil?",
        3,
      ),
    ),
    createField(
      document,
      "Dificuldade principal",
      createTextArea(
        document,
        "mainDifficulty",
        subject.overview.mainDifficulty?.plainText,
        "Ex.: diferenciar consumidores secundários e terciários.",
        3,
      ),
    ),
  );

  const nextGroup = createGroup(
    document,
    "Próximos passos",
    "Registre uma intenção prática e uma mudança relevante, quando houver.",
  );
  nextGroup.append(
    createField(
      document,
      "Próximo passo pessoal",
      createTextArea(
        document,
        "nextStep",
        subject.overview.nextStep?.plainText,
        "Ex.: resolver uma lista de questões e analisar os erros.",
        3,
      ),
    ),
    createField(
      document,
      "Observação de progresso",
      createTextArea(
        document,
        "progressObservation",
        subject.overview.progressObservation?.plainText,
        "Registre uma mudança relevante percebida desde o último estudo.",
        3,
      ),
    ),
  );

  body.append(momentGroup, nextGroup);

  const errorMessage = createElement(document, "p", {
    className: "form-error",
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
    text: "Salvar Visão Geral",
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
      const data = new FormData(form);
      onSubmit({
        studyState: String(data.get("studyState") ?? "initial_base"),
        overview: {
          nextStep: String(data.get("nextStep") ?? ""),
          mainDifficulty: String(data.get("mainDifficulty") ?? ""),
          currentPerception: String(data.get("currentPerception") ?? ""),
          progressObservation: String(data.get("progressObservation") ?? ""),
          perceivedMastery: String(data.get("perceivedMastery") ?? ""),
        },
      });
      close();
    } catch (error) {
      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
      saveButton.disabled = false;
    }
  });

  dialog.showModal();
  stateSelect.focus();
  return dialog;
}

import { createElement } from "../../utils/dom.js";

const PREREQUISITE_KEYS = Object.freeze([
  "base",
  "practice",
  "errorAnalysis",
  "review",
]);

export function openConsolidationModal({
  document,
  flowView,
  onSubmit,
  onClose = () => {},
}) {
  const dialog = createElement(document, "dialog", {
    className: "modal consolidation-modal",
  });
  const form = createElement(document, "form", {
    className: "modal-card consolidation-card",
  });
  form.noValidate = true;

  const header = createElement(document, "header", { className: "modal-header" });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", { className: "eyebrow", text: "Consolidação final" }),
    createElement(document, "h2", { text: "Confirmar consolidação do assunto" }),
    createElement(document, "p", {
      className: "modal-description",
      text:
        "A confirmação final é consciente e manual. Revise as evidências dos nove pontos antes de concluir.",
    }),
  );
  const closeButton = createElement(document, "button", {
    className: "icon-button",
    text: "×",
    attributes: { type: "button", "aria-label": "Fechar consolidação" },
  });
  header.append(copy, closeButton);

  const body = createElement(document, "div", {
    className: "modal-body consolidation-body",
  });
  const evidenceGrid = createElement(document, "div", {
    className: "consolidation-evidence-grid",
  });
  PREREQUISITE_KEYS.forEach((key) => {
    const stage = flowView.stages.find((candidate) => candidate.key === key);
    const item = createElement(document, "article", {
      className: `consolidation-evidence ${stage.complete ? "complete" : ""}`,
    });
    item.append(
      createElement(document, "div", { className: "consolidation-evidence-heading" }),
      createElement(document, "p", {
        text: stage.evidence.length
          ? stage.evidence.join(" · ")
          : "Nenhuma evidência registrada.",
      }),
    );
    item.firstElementChild.append(
      createElement(document, "strong", { text: stage.shortLabel }),
      createElement(document, "span", {
        text: `${stage.activePoints}/${stage.cap}`,
      }),
    );
    evidenceGrid.append(item);
  });

  const total = createElement(document, "section", {
    className: "consolidation-total",
  });
  total.append(
    createElement(document, "strong", {
      text: `${flowView.prerequisitePoints}/9 pontos anteriores`,
    }),
    createElement(document, "span", {
      text:
        flowView.prerequisitePoints >= 9
          ? "Requisitos objetivos cumpridos"
          : "Ainda existem requisitos pendentes",
    }),
  );

  const observationField = createElement(document, "label", { className: "field" });
  observationField.append(
    createElement(document, "span", { text: "Observação final opcional" }),
  );
  const textarea = createElement(document, "textarea", {
    attributes: {
      name: "finalObservation",
      rows: "4",
      maxlength: "2000",
      placeholder:
        "Ex.: consigo explicar o tema, resolver questões e reconhecer meus erros recorrentes.",
    },
  });
  observationField.append(textarea);

  const confirmationLabel = createElement(document, "label", {
    className: "consolidation-confirmation",
  });
  const checkbox = createElement(document, "input", {
    attributes: { type: "checkbox", name: "confirmation" },
  });
  confirmationLabel.append(
    checkbox,
    createElement(document, "span", {
      text:
        "Revisei as evidências e considero este assunto consolidado neste momento.",
    }),
  );

  const errorMessage = createElement(document, "p", {
    className: "form-error",
    attributes: { role: "alert" },
  });
  errorMessage.hidden = true;

  body.append(total, evidenceGrid, observationField, confirmationLabel, errorMessage);

  const footer = createElement(document, "footer", { className: "modal-footer" });
  const cancelButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Cancelar",
    attributes: { type: "button" },
  });
  const confirmButton = createElement(document, "button", {
    className: "button button-primary",
    text: "Confirmar consolidação",
    attributes: { type: "submit" },
  });
  footer.append(cancelButton, confirmButton);

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
    if (flowView.prerequisitePoints < 9) {
      errorMessage.textContent =
        "Os nove pontos anteriores precisam estar ativos antes da confirmação.";
      errorMessage.hidden = false;
      return;
    }
    if (!checkbox.checked) {
      errorMessage.textContent = "Marque a confirmação consciente para continuar.";
      errorMessage.hidden = false;
      checkbox.focus();
      return;
    }
    confirmButton.disabled = true;
    try {
      onSubmit(textarea.value);
      close();
    } catch (error) {
      errorMessage.textContent = error.message;
      errorMessage.hidden = false;
      confirmButton.disabled = false;
    }
  });

  dialog.showModal();
  checkbox.focus();
  return dialog;
}

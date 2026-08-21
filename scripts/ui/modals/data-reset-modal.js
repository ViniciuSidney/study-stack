import { createElement } from "../../utils/dom.js";

const MODE_CONFIG = Object.freeze({
  "study-data": {
    eyebrow: "Zona de risco",
    title: "Excluir dados de estudo?",
    phrase: "EXCLUIR TUDO",
    confirmLabel: "Excluir dados de estudo",
    lead:
      "Esta ação remove o conteúdo de estudo salvo neste navegador, mas preserva suas preferências e o estado das integrações.",
    preserved:
      "Preferências de aparência e navegação, integrações e eventos técnicos serão preservados.",
    recovery:
      "Antes da exclusão, o Study Stack criará automaticamente um ponto de recuperação.",
  },
  "full-reset": {
    eyebrow: "Zona de risco",
    title: "Redefinir todo o Study Stack?",
    phrase: "ZERAR STUDY STACK",
    confirmLabel: "Redefinir tudo",
    lead:
      "Esta ação restaura o armazenamento local ao estado inicial, incluindo preferências, integrações e dados de estudo.",
    preserved:
      "Nada do estado atual será preservado dentro do Study Stack. Integrações ativas podem registrar novamente o contexto atual após o recarregamento.",
    recovery:
      "O ponto de recuperação atual também será removido. Crie um backup antes de continuar se quiser guardar uma cópia.",
  },
});

function createMetric(document, value, label) {
  const metric = createElement(document, "div", {
    className: "data-reset-metric",
  });
  metric.append(
    createElement(document, "strong", { text: String(value) }),
    createElement(document, "span", { text: label }),
  );
  return metric;
}

export function openDataResetModal({
  document,
  mode,
  summary,
  onBackup,
  onConfirm,
  onClose = () => {},
}) {
  const config = MODE_CONFIG[mode];
  if (!config) {
    throw new RangeError(`Modo de redefinição desconhecido: ${mode}`);
  }

  const dialog = createElement(document, "dialog", {
    className: "modal data-reset-modal",
  });
  const card = createElement(document, "div", {
    className: "modal-card data-reset-card",
  });

  const header = createElement(document, "header", { className: "modal-header" });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", { className: "eyebrow", text: config.eyebrow }),
    createElement(document, "h2", { text: config.title }),
    createElement(document, "p", {
      className: "modal-description",
      text: "Revise com atenção antes de confirmar. Esta ação afeta dados armazenados localmente neste navegador.",
    }),
  );
  const closeButton = createElement(document, "button", {
    className: "icon-button",
    text: "×",
    attributes: { type: "button", "aria-label": "Fechar confirmação" },
  });
  header.append(copy, closeButton);

  const body = createElement(document, "div", {
    className: "modal-body data-reset-body",
  });

  const warning = createElement(document, "section", {
    className: "data-reset-warning",
  });
  warning.append(
    createElement(document, "strong", { text: config.lead }),
    createElement(document, "p", { text: config.preserved }),
    createElement(document, "p", { text: config.recovery }),
  );
  body.append(warning);

  if (mode === "study-data") {
    const metrics = createElement(document, "section", {
      className: "data-reset-metrics",
    });
    metrics.append(
      createMetric(document, summary.subjects, "Assuntos"),
      createMetric(document, summary.records, "Registros"),
      createMetric(document, summary.sessions, "Listas"),
      createMetric(document, summary.questions, "Questões"),
      createMetric(document, summary.errors, "Erros"),
      createMetric(document, summary.drafts, "Rascunhos"),
    );
    body.append(metrics);

    const contextNote = createElement(document, "p", {
      className: "data-reset-context-note",
      text:
        "O assunto atualmente aberto pode reaparecer vazio depois do recarregamento caso o Concept Compass envie novamente esse contexto. Os dados de estudo anteriores continuarão excluídos.",
    });
    body.append(contextNote);
  }

  const confirmation = createElement(document, "section", {
    className: "data-reset-confirmation",
  });
  const label = createElement(document, "label", {
    attributes: { for: "dataResetConfirmation" },
  });
  label.append(
    createElement(document, "strong", {
      text: `Digite ${config.phrase} para confirmar`,
    }),
    createElement(document, "span", {
      text: "A frase deve ser digitada exatamente como aparece acima.",
    }),
  );
  const input = createElement(document, "input", {
    attributes: {
      id: "dataResetConfirmation",
      type: "text",
      autocomplete: "off",
      spellcheck: "false",
      placeholder: config.phrase,
    },
  });
  const hint = createElement(document, "p", {
    className: "data-reset-confirmation-hint",
    text: "Confirmação pendente.",
  });
  confirmation.append(label, input, hint);
  body.append(confirmation);

  const footer = createElement(document, "footer", {
    className: "modal-footer data-reset-footer",
  });
  const backupButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Criar backup antes",
    attributes: { type: "button" },
  });
  const cancelButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Cancelar",
    attributes: { type: "button" },
  });
  const confirmButton = createElement(document, "button", {
    className: "button button-danger data-reset-confirm-button",
    text: config.confirmLabel,
    attributes: { type: "button", disabled: "" },
  });

  function updateConfirmation() {
    const confirmed = input.value === config.phrase;
    confirmButton.disabled = !confirmed;
    hint.textContent = confirmed
      ? "Confirmação reconhecida. A ação está liberada."
      : "Confirmação pendente.";
    hint.classList.toggle("confirmed", confirmed);
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  input.addEventListener("input", updateConfirmation);
  backupButton.addEventListener("click", () => onBackup?.());
  cancelButton.addEventListener("click", close);
  closeButton.addEventListener("click", close);
  confirmButton.addEventListener("click", () => {
    if (input.value !== config.phrase) return;
    const completed = onConfirm?.();
    if (completed !== false) close();
  });

  footer.append(backupButton, cancelButton, confirmButton);
  card.append(header, body, footer);
  dialog.append(card);
  document.body.append(dialog);

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => {
    dialog.remove();
    onClose();
  });

  dialog.showModal();
  input.focus();
  return dialog;
}

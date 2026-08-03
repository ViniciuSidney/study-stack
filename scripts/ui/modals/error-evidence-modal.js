import { createElement } from "../../utils/dom.js";

function optionLabel(candidate) {
  const sessionTitle = candidate.session?.sessionTitle ?? "Lista importada";
  const statement = candidate.question.statement.plainText;
  const short = statement.length > 84 ? `${statement.slice(0, 81).trim()}…` : statement;
  return `${sessionTitle} · Questão ${candidate.question.order} · ${short}`;
}

export function openErrorEvidenceModal({
  document,
  view,
  candidates,
  mode,
  onSubmit,
  onClose = () => {},
}) {
  const recurrence = mode === "recurrence";
  const dialog = createElement(document, "dialog", {
    className: "modal error-evidence-modal",
  });
  const card = createElement(document, "form", {
    className: "modal-card error-evidence-card",
  });
  const header = createElement(document, "header", { className: "modal-header" });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: recurrence ? "Nova ocorrência" : "Evidência de superação",
    }),
    createElement(document, "h2", {
      text: recurrence ? "Registrar que errei de novo" : "Registrar resposta correta",
    }),
    createElement(document, "p", {
      className: "modal-description",
      text: recurrence
        ? "Escolha uma questão incorreta real deste assunto. A sequência correta atual será reiniciada e o erro voltará a ficar pendente."
        : "Escolha uma questão correta real deste assunto. Duas respostas corretas distintas e consecutivas superam o erro.",
    }),
  );
  const closeButton = createElement(document, "button", {
    className: "icon-button",
    text: "×",
    attributes: { type: "button", "aria-label": "Fechar" },
  });
  header.append(copy, closeButton);

  const body = createElement(document, "div", { className: "modal-body" });
  const context = createElement(document, "section", {
    className: `error-evidence-context ${recurrence ? "recurrence" : "correct"}`,
  });
  context.append(
    createElement(document, "strong", { text: view.record.title }),
    createElement(document, "span", {
      text: `${view.errorRecord.currentCorrectStreak}/2 acertos consecutivos · ${view.errorRecord.recurrenceCount} reincidência(s)`,
    }),
  );
  body.append(context);

  if (!candidates.length) {
    const empty = createElement(document, "section", {
      className: "empty-state error-candidate-empty",
    });
    empty.append(
      createElement(document, "div", {
        className: "placeholder-icon compact-placeholder-icon",
        text: recurrence ? "↻" : "✓",
      }),
      createElement(document, "h3", {
        text: recurrence
          ? "Nenhuma questão incorreta disponível"
          : "Nenhuma nova questão correta disponível",
      }),
      createElement(document, "p", {
        text: recurrence
          ? "Importe ou conclua outra lista no Test Quest para registrar uma reincidência real."
          : "Importe ou conclua outra lista no Test Quest. Uma questão já usada não pode contar duas vezes na mesma sequência.",
      }),
    );
    body.append(empty);
  } else {
    const field = createElement(document, "label", { className: "field" });
    field.append(
      createElement(document, "span", {
        text: recurrence ? "Questão incorreta" : "Questão correta",
      }),
    );
    const select = createElement(document, "select", {
      attributes: { required: "" },
    });
    candidates.forEach((candidate) =>
      select.append(
        createElement(document, "option", {
          text: optionLabel(candidate),
          attributes: { value: candidate.question.id },
        }),
      ),
    );
    field.append(select);
    body.append(field);

    const preview = createElement(document, "section", {
      className: "error-candidate-preview",
    });
    body.append(preview);

    function renderPreview() {
      const candidate = candidates.find(
        (item) => item.question.id === select.value,
      );
      preview.replaceChildren();
      if (!candidate) {
        return;
      }
      preview.append(
        createElement(document, "p", {
          className: "eyebrow",
          text: `Questão ${candidate.question.order}`,
        }),
        createElement(document, "strong", {
          text: candidate.question.statement.plainText,
        }),
        createElement(document, "p", {
          text: recurrence
            ? `Resposta registrada: ${candidate.question.userAnswer?.plainText ?? "não informada"}`
            : `Resposta correta registrada: ${candidate.question.correctAnswer?.plainText ?? "não informada"}`,
        }),
      );
    }
    select.addEventListener("change", renderPreview);
    renderPreview();

    card.addEventListener("submit", (event) => {
      event.preventDefault();
      onSubmit(select.value);
      if (dialog.open) {
        dialog.close();
      }
    });
  }

  const footer = createElement(document, "footer", { className: "modal-footer" });
  const cancelButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Cancelar",
    attributes: { type: "button" },
  });
  const submitButton = createElement(document, "button", {
    className: recurrence ? "button button-danger" : "button button-primary",
    text: recurrence ? "Registrar reincidência" : "Registrar acerto",
    attributes: { type: "submit" },
  });
  submitButton.disabled = !candidates.length;
  footer.append(cancelButton, submitButton);
  card.append(header, body, footer);
  dialog.append(card);
  document.body.append(dialog);

  function close() {
    if (dialog.open) {
      dialog.close();
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

  dialog.showModal();
  closeButton.focus();
  return dialog;
}

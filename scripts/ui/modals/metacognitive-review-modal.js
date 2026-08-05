import { METACOGNITIVE_REASON_OPTIONS } from "../../domain/guided-flow.js";
import { getRichContentPlainText } from "../../domain/rich-content.js";
import { createElement } from "../../utils/dom.js";

function truncate(value, maxLength = 170) {
  const text = String(value ?? "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

const DIFFICULTY_LABELS = Object.freeze({
  easy: "Fácil",
  medium: "Média",
  hard: "Difícil",
});

function createQuestionOption(document, item, selected = false) {
  const difficulty = DIFFICULTY_LABELS[item.question.difficulty] ?? "Sem nível";
  const option = createElement(document, "option", {
    text: `${item.session?.sessionTitle ?? "Lista"} · Q${item.question.order} · ${difficulty} · ${truncate(item.label, 100)}`,
    attributes: { value: item.question.id },
  });
  option.selected = selected;
  return option;
}

function reasonLabel(value) {
  return (
    METACOGNITIVE_REASON_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}

function statusLabel(check) {
  if (check.review?.status === "confirmed") {
    return "Compreensão confirmada";
  }
  if (check.review?.status === "reviewed") {
    return "Revisada, aguardando confirmação";
  }
  return "Analisada, aguardando revisão";
}

export function openMetacognitiveReviewModal({
  document,
  view,
  onCreate,
  onReview,
  onConfirm,
  onClose = () => {},
}) {
  const dialog = createElement(document, "dialog", {
    className: "modal metacognitive-modal",
  });
  const card = createElement(document, "div", {
    className: "modal-card metacognitive-card",
  });
  const header = createElement(document, "header", { className: "modal-header" });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Caminho alternativo",
    }),
    createElement(document, "h2", { text: "Verificar acertos difíceis" }),
    createElement(document, "p", {
      className: "modal-description",
      text:
        "Use questões corretas que exigiram esforço, demora, insegurança ou eliminação. Isso não cria um erro fictício.",
    }),
  );
  const closeButton = createElement(document, "button", {
    className: "icon-button",
    text: "×",
    attributes: { type: "button", "aria-label": "Fechar verificação" },
  });
  header.append(copy, closeButton);

  const body = createElement(document, "div", {
    className: "modal-body metacognitive-body",
  });

  const existingSection = createElement(document, "section", {
    className: "metacognitive-section",
  });
  existingSection.append(
    createElement(document, "div", { className: "metacognitive-section-heading" }),
  );
  existingSection.firstElementChild.append(
    createElement(document, "div"),
    createElement(document, "span", {
      className: "record-badge",
      text: String(view.checks.length),
    }),
  );
  existingSection.firstElementChild.firstElementChild.append(
    createElement(document, "h3", { text: "Verificações registradas" }),
    createElement(document, "p", {
      text:
        "Uma análise completa alimenta Análise de erros; revisão e confirmação alimentam Revisão.",
    }),
  );

  const checkList = createElement(document, "div", {
    className: "metacognitive-check-list",
  });
  if (!view.checks.length) {
    checkList.append(
      createElement(document, "p", {
        className: "metacognitive-empty",
        text: "Nenhum acerto difícil foi verificado ainda.",
      }),
    );
  }

  view.checks.forEach(
    ({ check, question, session, confirmationQuestion, active }) => {
      const item = createElement(document, "article", {
      className: `metacognitive-check status-${check.review.status} ${active ? "" : "inactive"}`,
    });
    const heading = createElement(document, "div", {
      className: "metacognitive-check-heading",
    });
    const headingCopy = createElement(document, "div");
    headingCopy.append(
      createElement(document, "strong", {
        text: `Q${question?.order ?? "?"} · ${truncate(
          getRichContentPlainText(question?.statement) || "Questão indisponível",
        )}`,
      }),
      createElement(document, "span", {
        text: session?.sessionTitle ?? "Lista importada",
      }),
    );
    heading.append(
      headingCopy,
      createElement(document, "span", {
        className: "metacognitive-status",
        text: active ? statusLabel(check) : "Evidência histórica",
      }),
    );

    const tags = createElement(document, "div", {
      className: "metacognitive-tag-list",
    });
    check.reasonTags.forEach((tag) => {
      tags.append(
        createElement(document, "span", {
          className: "tag-chip",
          text: reasonLabel(tag),
        }),
      );
    });

    const analysis = createElement(document, "div", {
      className: "metacognitive-analysis-preview",
    });
    analysis.append(
      createElement(document, "p", {
        text: getRichContentPlainText(check.analysis.whyDemanding),
      }),
      createElement(document, "p", {
        text: `Raciocínio correto: ${getRichContentPlainText(
          check.analysis.correctReasoning,
        )}`,
      }),
    );

    const actions = createElement(document, "div", {
      className: "metacognitive-check-actions",
    });
    if (!active) {
      actions.append(
        createElement(document, "p", {
          className: "metacognitive-inactive-copy",
          text:
            "A prática de origem foi arquivada ou deixou de ser válida. Esta verificação permanece no histórico, mas não concede pontos nem aceita novas revisões.",
        }),
      );
    } else if (check.review.status === "pending") {
      const reviewButton = createElement(document, "button", {
        className: "button button-secondary",
        text: "Marcar revisão concluída",
        attributes: { type: "button" },
      });
      reviewButton.addEventListener("click", () => {
        try {
          onReview(check.id);
          close();
        } catch (error) {
          showGlobalError(error.message);
        }
      });
      actions.append(reviewButton);
    } else if (check.review.status === "reviewed") {
      const select = createElement(document, "select", {
        attributes: {
          "aria-label": "Questão correta para confirmar a compreensão",
        },
      });
      select.append(
        createElement(document, "option", {
          text: "Selecione outra questão correta",
          attributes: { value: "" },
        }),
      );
      view.confirmationCandidates
        .filter((candidate) => candidate.question.id !== check.questionId)
        .forEach((candidate) => select.append(createQuestionOption(document, candidate)));
      const confirmButton = createElement(document, "button", {
        className: "button button-primary",
        text: "Registrar confirmação",
        attributes: { type: "button" },
      });
      confirmButton.addEventListener("click", () => {
        if (!select.value) {
          showGlobalError("Selecione outra questão correta para confirmar.");
          select.focus();
          return;
        }
        try {
          onConfirm(check.id, select.value);
          close();
        } catch (error) {
          showGlobalError(error.message);
        }
      });
      actions.append(select, confirmButton);
    } else if (confirmationQuestion) {
      actions.append(
        createElement(document, "p", {
          className: "metacognitive-confirmation-copy",
          text: `Confirmada com Q${confirmationQuestion.order}: ${truncate(
            getRichContentPlainText(confirmationQuestion.statement),
            120,
          )}`,
        }),
      );
    }

    item.append(heading, tags, analysis, actions);
    checkList.append(item);
  });
  existingSection.append(checkList);
  body.append(existingSection);

  const createSection = createElement(document, "section", {
    className: "metacognitive-section metacognitive-create-section",
  });
  createSection.append(
    createElement(document, "h3", { text: "Nova verificação" }),
    createElement(document, "p", {
      text:
        "Selecione uma questão correta e descreva o processo mental que merece ser revisado.",
    }),
  );

  const form = createElement(document, "form", {
    className: "metacognitive-form",
  });
  form.noValidate = true;
  const questionField = createElement(document, "label", { className: "field" });
  questionField.append(createElement(document, "span", { text: "Questão correta" }));
  const questionSelect = createElement(document, "select", {
    attributes: { name: "questionId" },
  });
  questionSelect.append(
    createElement(document, "option", {
      text: view.candidates.length
        ? "Selecione uma questão"
        : "Nenhuma questão correta disponível",
      attributes: { value: "" },
    }),
  );
  view.candidates.forEach((candidate) => {
    questionSelect.append(createQuestionOption(document, candidate));
  });
  questionField.append(questionSelect);

  const reasonFieldset = createElement(document, "fieldset", {
    className: "metacognitive-reasons",
  });
  reasonFieldset.append(
    createElement(document, "legend", { text: "Por que esta questão merece revisão?" }),
  );
  METACOGNITIVE_REASON_OPTIONS.forEach((option) => {
    const label = createElement(document, "label", {
      className: "metacognitive-reason-option",
    });
    label.append(
      createElement(document, "input", {
        attributes: { type: "checkbox", name: "reasonTags", value: option.value },
      }),
      createElement(document, "span", { text: option.label }),
    );
    reasonFieldset.append(label);
  });

  function createTextareaField(label, name, placeholder) {
    const field = createElement(document, "label", { className: "field" });
    field.append(createElement(document, "span", { text: label }));
    field.append(
      createElement(document, "textarea", {
        attributes: {
          name,
          rows: "4",
          maxlength: "2000",
          placeholder,
        },
      }),
    );
    return field;
  }

  const formError = createElement(document, "p", {
    className: "form-error",
    attributes: { role: "alert" },
  });
  formError.hidden = true;
  const submitButton = createElement(document, "button", {
    className: "button button-primary",
    text: "Salvar verificação",
    attributes: { type: "submit" },
  });
  submitButton.disabled = !view.candidates.length;

  form.append(
    questionField,
    reasonFieldset,
    createTextareaField(
      "O que tornou a questão exigente?",
      "whyDemanding",
      "Ex.: precisei comparar alternativas muito próximas e quase ignorei uma condição do enunciado.",
    ),
    createTextareaField(
      "Qual é o raciocínio correto?",
      "correctReasoning",
      "Explique o caminho que sustenta a resposta, sem apenas repetir o gabarito.",
    ),
    createTextareaField(
      "Como reconhecer esse padrão no futuro?",
      "howToRecognize",
      "Registre um sinal, pergunta de controle ou regra prática para usar na próxima vez.",
    ),
    formError,
    createElement(document, "div", { className: "metacognitive-form-actions" }),
  );
  form.lastElementChild.append(submitButton);
  createSection.append(form);
  body.append(createSection);

  const globalError = createElement(document, "p", {
    className: "form-error metacognitive-global-error",
    attributes: { role: "alert" },
  });
  globalError.hidden = true;
  body.append(globalError);

  const footer = createElement(document, "footer", { className: "modal-footer" });
  const closeFooterButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Fechar",
    attributes: { type: "button" },
  });
  footer.append(closeFooterButton);

  card.append(header, body, footer);
  dialog.append(card);
  document.body.append(dialog);

  function showGlobalError(message) {
    globalError.textContent = message;
    globalError.hidden = false;
    globalError.scrollIntoView({ block: "nearest" });
  }

  function close() {
    if (dialog.open) {
      dialog.close();
    } else {
      dialog.remove();
      onClose();
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    formError.hidden = true;
    const data = new FormData(form);
    const values = {
      questionId: String(data.get("questionId") ?? ""),
      reasonTags: data.getAll("reasonTags").map(String),
      whyDemanding: String(data.get("whyDemanding") ?? ""),
      correctReasoning: String(data.get("correctReasoning") ?? ""),
      howToRecognize: String(data.get("howToRecognize") ?? ""),
    };
    submitButton.disabled = true;
    try {
      onCreate(values);
      close();
    } catch (error) {
      formError.textContent = error.message;
      formError.hidden = false;
      submitButton.disabled = !view.candidates.length;
    }
  });

  closeButton.addEventListener("click", close);
  closeFooterButton.addEventListener("click", close);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => {
    dialog.remove();
    onClose();
  });

  dialog.showModal();
  (view.candidates.length ? questionSelect : closeFooterButton).focus();
  return dialog;
}

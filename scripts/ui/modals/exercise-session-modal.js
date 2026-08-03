import { createElement } from "../../utils/dom.js";

const RESULT_LABELS = Object.freeze({
  correct: "Correta",
  incorrect: "Incorreta",
  unanswered: "Não respondida",
});

const TYPE_LABELS = Object.freeze({
  objective: "Objetiva",
  true_false: "Verdadeiro ou falso",
  discursive: "Discursiva",
  other: "Outro formato",
});

const DIFFICULTY_LABELS = Object.freeze({
  easy: "Fácil",
  medium: "Média",
  hard: "Difícil",
  unknown: "Não informada",
});

function appendRichContent(document, container, content, emptyText) {
  if (!content?.plainText) {
    container.append(
      createElement(document, "p", {
        className: "question-empty-value",
        text: emptyText,
      }),
    );
    return;
  }

  const value = createElement(document, "div", {
    className: "question-rich-content",
  });
  value.innerHTML = content.content;
  container.append(value);
}

function createAnswerBlock(document, label, content, emptyText) {
  const block = createElement(document, "section", {
    className: "question-answer-block",
  });
  block.append(createElement(document, "h4", { text: label }));
  appendRichContent(document, block, content, emptyText);
  return block;
}

function createQuestionItem(document, question) {
  const details = createElement(document, "details", {
    className: `imported-question result-${question.result}`,
    attributes: {
      "data-question-result": question.result,
    },
  });
  const summary = createElement(document, "summary", {
    className: "imported-question-summary",
  });
  const number = createElement(document, "span", {
    className: "question-number",
    text: String(question.order),
  });
  const title = createElement(document, "div", {
    className: "question-summary-copy",
  });
  title.append(
    createElement(document, "strong", {
      text: question.statement.plainText,
    }),
    createElement(document, "small", {
      text: `${TYPE_LABELS[question.questionType]} · ${DIFFICULTY_LABELS[question.difficulty]}`,
    }),
  );
  const result = createElement(document, "span", {
    className: `question-result-badge result-${question.result}`,
    text: RESULT_LABELS[question.result],
  });
  summary.append(number, title, result);

  const body = createElement(document, "div", {
    className: "imported-question-body",
  });
  const statement = createElement(document, "section", {
    className: "question-statement",
  });
  statement.append(createElement(document, "h4", { text: "Enunciado" }));
  appendRichContent(document, statement, question.statement, "Enunciado ausente.");
  body.append(
    statement,
    createAnswerBlock(
      document,
      "Sua resposta",
      question.userAnswer,
      "Questão não respondida.",
    ),
    createAnswerBlock(
      document,
      "Resposta correta",
      question.correctAnswer,
      "Resposta correta não fornecida pelo Test Quest.",
    ),
  );

  if (question.correction?.plainText) {
    body.append(
      createAnswerBlock(
        document,
        "Correção e explicação",
        question.correction,
        "Correção não informada.",
      ),
    );
  }
  if (question.expectedCriteria?.plainText) {
    body.append(
      createAnswerBlock(
        document,
        "Critérios esperados",
        question.expectedCriteria,
        "Critérios não informados.",
      ),
    );
  }
  if (question.metacognition?.plainText) {
    body.append(
      createAnswerBlock(
        document,
        "Metacognição",
        question.metacognition,
        "Metacognição não informada.",
      ),
    );
  }

  details.append(summary, body);
  return details;
}

function createFilterButton(document, label, value, count) {
  return createElement(document, "button", {
    className: "question-filter-button",
    text: `${label} ${count}`,
    attributes: {
      type: "button",
      "data-question-filter": value,
      "aria-pressed": String(value === "all"),
    },
  });
}

function safeSourceUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function openExerciseSessionModal({
  document,
  view,
  onSaveNotes,
  onClose = () => {},
}) {
  const { session, questions } = view;
  const dialog = createElement(document, "dialog", {
    className: "modal exercise-session-modal",
  });
  const card = createElement(document, "div", {
    className: "modal-card exercise-session-modal-card",
  });
  const header = createElement(document, "header", {
    className: "modal-header exercise-session-modal-header",
  });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Resultado importado do Test Quest",
    }),
    createElement(document, "h2", { text: session.sessionTitle }),
    createElement(document, "p", {
      className: "modal-description",
      text: `${session.stats.total} questões · ${session.stats.correct} acertos · ${session.stats.incorrect} erros · ${session.stats.percentage}% de aproveitamento`,
    }),
  );
  const closeButton = createElement(document, "button", {
    className: "icon-button",
    text: "×",
    attributes: { type: "button", "aria-label": "Fechar lista" },
  });
  header.append(copy, closeButton);

  const body = createElement(document, "div", {
    className: "modal-body exercise-session-modal-body",
  });
  const summary = createElement(document, "section", {
    className: "session-detail-summary",
  });
  const stats = [
    ["Acertos", session.stats.correct, "correct"],
    ["Erros", session.stats.incorrect, "incorrect"],
    ["Em branco", session.stats.unanswered, "unanswered"],
    ["Respondidas", session.stats.answered, ""],
  ];
  stats.forEach(([label, value, className]) => {
    const stat = createElement(document, "article", {
      className: `session-detail-stat ${className}`.trim(),
    });
    stat.append(
      createElement(document, "strong", { text: value }),
      createElement(document, "span", { text: label }),
    );
    summary.append(stat);
  });
  body.append(summary);

  const filterBar = createElement(document, "div", {
    className: "question-filter-bar",
    attributes: { role: "group", "aria-label": "Filtrar questões" },
  });
  const counts = {
    all: questions.length,
    correct: session.stats.correct,
    incorrect: session.stats.incorrect,
    unanswered: session.stats.unanswered,
  };
  [
    ["Todas", "all"],
    ["Corretas", "correct"],
    ["Incorretas", "incorrect"],
    ["Em branco", "unanswered"],
  ].forEach(([label, value]) =>
    filterBar.append(createFilterButton(document, label, value, counts[value])),
  );
  body.append(filterBar);

  const questionList = createElement(document, "section", {
    className: "imported-question-list",
  });
  questions.forEach((question) =>
    questionList.append(createQuestionItem(document, question)),
  );
  const filterEmpty = createElement(document, "p", {
    className: "filter-empty panel",
    text: "Nenhuma questão neste filtro.",
  });
  filterEmpty.hidden = true;
  body.append(questionList, filterEmpty);

  const errorPreparation = createElement(document, "section", {
    className: "error-preparation-panel",
  });
  errorPreparation.append(
    createElement(document, "div", {
      className: "placeholder-icon compact-placeholder-icon",
      text: "!",
    }),
    createElement(document, "div"),
  );
  const errorCopy = errorPreparation.lastElementChild;
  errorCopy.append(
    createElement(document, "strong", {
      text: `${view.errorCandidateCount} questão(ões) pronta(s) para análise de erro`,
    }),
    createElement(document, "p", {
      text:
        "As respostas, correções e critérios já estão preservados. A criação e o acompanhamento dos Registros de Erro serão ativados na Fundação 08.",
    }),
  );
  body.append(errorPreparation);

  const noteField = createElement(document, "label", {
    className: "field session-notes-field",
  });
  noteField.append(
    createElement(document, "span", { text: "Observação pessoal da lista" }),
  );
  const noteInput = createElement(document, "textarea", {
    attributes: {
      rows: "4",
      placeholder:
        "Ex.: errei principalmente questões de interpretação; revisar antes da próxima lista.",
    },
  });
  noteInput.value = session.sessionNotes?.plainText ?? "";
  noteField.append(noteInput);
  body.append(noteField);

  const footer = createElement(document, "footer", {
    className: "modal-footer exercise-session-modal-footer",
  });
  const footerStart = createElement(document, "div", {
    className: "exercise-session-footer-start",
  });
  const sourceUrl = safeSourceUrl(session.sourceUrl);
  if (sourceUrl) {
    const sourceLink = createElement(document, "a", {
      className: "button button-secondary",
      text: "Abrir origem",
      attributes: {
        href: sourceUrl,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    });
    footerStart.append(sourceLink);
  }
  const actions = createElement(document, "div", {
    className: "exercise-session-footer-actions",
  });
  const closeFooterButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Fechar",
    attributes: { type: "button" },
  });
  const saveButton = createElement(document, "button", {
    className: "button button-primary",
    text: "Salvar observação",
    attributes: { type: "button" },
  });
  actions.append(closeFooterButton, saveButton);
  footer.append(footerStart, actions);
  card.append(header, body, footer);
  dialog.append(card);
  document.body.append(dialog);

  function close() {
    if (dialog.open) {
      dialog.close();
    }
  }

  filterBar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-question-filter]");
    if (!button) {
      return;
    }
    const filter = button.dataset.questionFilter;
    let visible = 0;
    filterBar.querySelectorAll("[data-question-filter]").forEach((candidate) => {
      candidate.setAttribute(
        "aria-pressed",
        String(candidate === button),
      );
    });
    questionList.querySelectorAll(".imported-question").forEach((item) => {
      item.hidden =
        filter !== "all" && item.dataset.questionResult !== filter;
      visible += Number(!item.hidden);
    });
    filterEmpty.hidden = visible > 0;
  });

  saveButton.addEventListener("click", () => {
    onSaveNotes(noteInput.value);
    close();
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
  closeButton.focus();
  return dialog;
}

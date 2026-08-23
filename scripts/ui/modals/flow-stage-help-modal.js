import { createElement } from "../../utils/dom.js";

const STAGE_GUIDANCE = Object.freeze({
  base: Object.freeze({
    description:
      "Construa a base teórica em um Resumo e confirme depois que ele foi estudado.",
  }),
  practice: Object.freeze({
    description:
      "Conclua listas no Test Quest e salve os resultados no Study Stack.",
  }),
  errorAnalysis: Object.freeze({
    description:
      "Conclua duas análises. Se não houver erros suficientes, acertos difíceis também podem ser verificados.",
  }),
  review: Object.freeze({
    description:
      "Revise uma análise concluída e depois confirme que a compreensão foi mantida.",
  }),
  consolidation: Object.freeze({
    description:
      "Depois dos nove pontos anteriores, confirme conscientemente a consolidação do assunto.",
  }),
});

const IMMEDIATE_DEPENDENCY = Object.freeze({
  practice: "Conclua a Base para avançar até esta etapa.",
  errorAnalysis: "Conclua a Prática para avançar até esta etapa.",
  review: "Conclua a Análise para avançar até esta etapa.",
  consolidation: "Conclua a Revisão para avançar até esta etapa.",
});

function createList(document, items, emptyText) {
  if (!items.length) {
    return createElement(document, "p", {
      className: "flow-help-empty",
      text: emptyText,
    });
  }
  const list = createElement(document, "ul", { className: "flow-help-list" });
  items.forEach((item) => {
    list.append(createElement(document, "li", { text: item }));
  });
  return list;
}

function getStageState(stage) {
  if (stage.complete) {
    return "Concluída";
  }
  if (!stage.canBecomeCurrent) {
    return "Aguardando etapa anterior";
  }
  if (stage.current || stage.activePoints > 0) {
    return "Em andamento";
  }
  return "Ainda não iniciada";
}

function getStageProgress(stage) {
  if (stage.key === "practice") {
    return `${stage.activePoints}/${stage.cap} listas registradas`;
  }
  return `${stage.activePoints}/${stage.cap} pontos`;
}

function createRequirement(label, complete) {
  return Object.freeze({ label, complete: Boolean(complete) });
}

function getStageRequirements(stage) {
  if (stage.key === "base") {
    return [
      createRequirement("Concluir um Resumo com conteúdo.", stage.activePoints >= 1),
      createRequirement(
        "Confirmar o Resumo concluído como estudado.",
        stage.activePoints >= 2,
      ),
    ];
  }

  if (stage.key === "practice") {
    return [1, 2, 3].map((position) =>
      createRequirement(
        `Salvar o ${position}º resultado de uma lista concluída no Study Stack.`,
        stage.activePoints >= position,
      ),
    );
  }

  if (stage.key === "errorAnalysis") {
    return [
      createRequirement(
        "Concluir uma análise de erro ou uma verificação metacognitiva de acerto difícil.",
        stage.activePoints >= 1,
      ),
      createRequirement(
        "Concluir uma segunda análise ou verificação equivalente.",
        stage.activePoints >= 2,
      ),
    ];
  }

  if (stage.key === "review") {
    return [
      createRequirement(
        "Revisar uma análise concluída para conquistar o primeiro ponto.",
        stage.activePoints >= 1,
      ),
      createRequirement(
        "Confirmar posteriormente que a compreensão foi mantida.",
        stage.activePoints >= 2,
      ),
    ];
  }

  return [
    createRequirement(
      "Alcançar 9/9 pontos nas quatro etapas anteriores.",
      stage.canBecomeCurrent || stage.complete,
    ),
    createRequirement(
      "Confirmar conscientemente a consolidação do assunto.",
      stage.complete,
    ),
  ];
}

function createChecklist(document, requirements) {
  const list = createElement(document, "ul", {
    className: "flow-help-list flow-help-checklist",
  });

  requirements.forEach((requirement) => {
    const item = createElement(document, "li", {
      className: requirement.complete ? "complete" : "pending",
      text: `${requirement.complete ? "✓" : "○"} ${requirement.label}`,
      attributes: {
        "aria-label": `${requirement.complete ? "Concluído" : "Pendente"}: ${requirement.label}`,
      },
    });
    if (requirement.complete) {
      item.style.color = "var(--success)";
    }
    list.append(item);
  });

  return list;
}

function appendPracticeCriteria(document, body) {
  const criteria = createElement(document, "details", {
    className: "flow-help-section flow-help-criteria",
  });
  const summary = createElement(document, "summary", {
    className: "flow-help-criteria-summary",
    text: "Ver critérios de uma lista válida",
  });
  const content = createElement(document, "div", {
    className: "flow-help-criteria-content",
  });
  content.append(
    createElement(document, "p", {
      className: "flow-help-empty",
      text:
        "Para contar na Prática, o resultado salvo precisa representar uma lista concluída com pelo menos 15 questões respondidas. Resultados importados que já tragam a validação de prática preservam essa informação.",
    }),
  );
  criteria.append(summary, content);
  body.append(criteria);
}

export function openFlowStageHelpModal({
  document,
  stage,
  onAction,
  onClose = () => {},
}) {
  const dialog = createElement(document, "dialog", {
    className: "modal flow-help-modal",
  });
  const card = createElement(document, "div", {
    className: "modal-card flow-help-card",
  });
  const header = createElement(document, "header", { className: "modal-header" });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", { className: "eyebrow", text: "Roteiro para consolidar" }),
    createElement(document, "h2", { text: stage.label }),
    createElement(document, "p", {
      className: "modal-description",
      text: STAGE_GUIDANCE[stage.key]?.description ?? stage.description,
    }),
  );
  const closeButton = createElement(document, "button", {
    className: "icon-button",
    text: "×",
    attributes: { type: "button", "aria-label": "Fechar explicação" },
  });
  header.append(copy, closeButton);

  const body = createElement(document, "div", {
    className: "modal-body flow-help-body",
  });
  const score = createElement(document, "section", {
    className: `flow-help-score ${stage.complete ? "complete" : ""}`,
  });
  score.append(
    createElement(document, "strong", {
      text: getStageProgress(stage),
    }),
    createElement(document, "span", {
      text: getStageState(stage),
    }),
  );
  body.append(score);

  if (!stage.canBecomeCurrent && IMMEDIATE_DEPENDENCY[stage.key]) {
    body.append(
      createElement(document, "p", {
        className: "flow-help-warning flow-help-blocked-warning",
        text: IMMEDIATE_DEPENDENCY[stage.key],
      }),
    );
  }

  const checklist = createElement(document, "section", {
    className: "flow-help-section flow-help-checklist-section",
    attributes: { "aria-label": "O que ainda falta nesta etapa" },
  });
  checklist.append(
    createElement(document, "h3", { text: "Checklist da etapa" }),
    createChecklist(document, getStageRequirements(stage)),
  );
  body.append(checklist);

  if (stage.evidence.length) {
    const evidence = createElement(document, "section", {
      className: "flow-help-section",
    });
    evidence.append(
      createElement(document, "h3", { text: "Evidências já conquistadas" }),
      createList(document, stage.evidence, ""),
    );
    body.append(evidence);
  } else {
    body.append(
      createElement(document, "p", {
        className: "flow-help-empty flow-help-empty-evidence",
        text: "Nenhuma evidência registrada ainda.",
      }),
    );
  }

  if (stage.key === "practice") {
    appendPracticeCriteria(document, body);
  }

  if (stage.key === "errorAnalysis") {
    const explanation = createElement(document, "section", {
      className: "flow-help-section",
    });
    explanation.append(
      createElement(document, "h3", { text: "Quando não houver erros suficientes" }),
      createElement(document, "p", {
        className: "flow-help-empty",
        text:
          "Você pode usar uma verificação metacognitiva de um acerto difícil, por exemplo uma questão correta que exigiu esforço, insegurança ou eliminação. Ela cumpre a mesma função de análise consciente.",
      }),
    );
    body.append(explanation);
  }

  const footer = createElement(document, "footer", { className: "modal-footer" });
  const closeFooterButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Fechar",
    attributes: { type: "button" },
  });
  footer.append(closeFooterButton);

  if (stage.key === "consolidation") {
    const consolidationButton = createElement(document, "button", {
      className: "button button-primary",
      text: stage.complete ? "Consolidação confirmada" : "Confirmar consolidação",
      attributes: {
        type: "button",
        title:
          !stage.canBecomeCurrent && !stage.complete
            ? "Disponível ao alcançar 9/9 pontos nas etapas anteriores."
            : "Confirmar consolidação",
      },
    });
    consolidationButton.disabled = !stage.canBecomeCurrent || stage.complete;
    consolidationButton.addEventListener("click", () => {
      if (!onAction || consolidationButton.disabled) {
        return;
      }
      onAction({
        type: "confirm_consolidation",
        label: "Confirmar consolidação",
      });
      close();
    });
    footer.append(consolidationButton);
  } else if (stage.action && onAction && stage.action.type !== "open_stage_help") {
    const actionButton = createElement(document, "button", {
      className: "button button-primary",
      text: stage.action.label,
      attributes: { type: "button" },
    });
    actionButton.addEventListener("click", () => {
      onAction(stage.action);
      close();
    });
    footer.append(actionButton);
  }

  card.append(header, body, footer);
  dialog.append(card);
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
  closeFooterButton.focus();
  return dialog;
}

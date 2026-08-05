import { getRichContentPlainText } from "../../domain/rich-content.js";
import { clearElement, createElement } from "../../utils/dom.js";

const STUDY_STATE_LABELS = Object.freeze({
  initial_base: "Base inicial",
  in_practice: "Em prática",
  in_review: "Em revisão",
  consolidated: "Consolidado",
  custom: "Personalizado",
});

const RECORD_TYPE_LABELS = Object.freeze({
  summary: "Resumo",
  note: "Anotação",
  imported_session: "Exercícios",
  error_record: "Erro",
});


export function getPerceivedMasteryPresentation(value) {
  const informed = Number.isInteger(value) && value >= 0 && value <= 100;

  return Object.freeze({
    informed,
    value: informed ? value : null,
    displayValue: informed ? `${value}%` : "Não informado",
    description: informed
      ? "Sua autoavaliação atual. Ela não altera a pontuação objetiva."
      : "Registre uma autoavaliação de 0% a 100% na edição da Visão Geral.",
  });
}

function formatDateTime(value) {
  if (!value || Number.isNaN(Date.parse(value))) {
    return "Ainda não registrado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStudyDate(value) {
  if (!value) {
    return "Sem data";
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function createMetric(document, label, value, onClick, description = "") {
  const button = createElement(document, "button", {
    className: "metric-card panel",
    attributes: { type: "button", title: description || label },
  });
  button.append(
    createElement(document, "strong", { text: value }),
    createElement(document, "span", { text: label }),
  );
  button.addEventListener("click", onClick);
  return button;
}

function createPersonalPerception(document, mastery) {
  const presentation = getPerceivedMasteryPresentation(mastery);
  const indicator = createElement(document, "aside", {
    className: `overview-personal-perception ${presentation.informed ? "" : "empty"}`,
    attributes: {
      title: presentation.description,
      "aria-label": `Percepção pessoal: ${presentation.displayValue}. ${presentation.description}`,
    },
  });
  indicator.append(
    createElement(document, "span", { text: "Percepção" }),
    createElement(document, "strong", {
      text: presentation.informed ? presentation.displayValue : "—",
    }),
  );

  return indicator;
}

function createOverviewFact(document, title, content, emptyText) {
  const card = createElement(document, "article", {
    className: `overview-fact ${content ? "" : "empty"}`,
  });
  card.append(
    createElement(document, "span", { text: title }),
    createElement(document, "p", { text: content || emptyText }),
  );
  return card;
}

function createRecordList(document, records, emptyText) {
  if (!records.length) {
    return createElement(document, "p", {
      className: "overview-empty-copy",
      text: emptyText,
    });
  }

  const list = createElement(document, "ul", { className: "overview-record-list" });
  records.forEach((record) => {
    const item = createElement(document, "li");
    const copy = createElement(document, "div");
    copy.append(
      createElement(document, "strong", {
        text: record.title || "Registro sem título",
      }),
      createElement(document, "span", {
        text: `${RECORD_TYPE_LABELS[record.type] ?? "Registro"} · ${formatStudyDate(record.studyDate)}`,
      }),
    );
    item.append(
      copy,
      createElement(document, "span", {
        className: `record-badge status-${record.status}`,
        text:
          record.status === "completed"
            ? "Concluído"
            : record.status === "in_progress"
              ? "Em andamento"
              : "Rascunho",
      }),
    );
    list.append(item);
  });
  return list;
}

function createHistoryList(document, events) {
  if (!events.length) {
    return createElement(document, "p", {
      className: "overview-empty-copy",
      text: "A atividade do assunto aparecerá aqui conforme você estudar.",
    });
  }

  const list = createElement(document, "ul", { className: "overview-history-list" });
  events.slice(0, 5).forEach((event) => {
    const item = createElement(document, "li");
    item.append(
      createElement(document, "span", { className: "history-dot" }),
      createElement(document, "div"),
    );
    item.lastElementChild.append(
      createElement(document, "strong", { text: event.summary }),
      createElement(document, "small", { text: formatDateTime(event.occurredAt) }),
    );
    list.append(item);
  });
  return list;
}


function createGuidedFlowPanel({
  document,
  subject,
  progress,
  flowView,
  onMakeStageCurrent,
  onStageAction,
  onOpenStageHelp,
}) {
  const panel = createElement(document, "section", {
    className: `panel guided-flow-panel ${flowView.completed ? "completed" : ""}`,
  });
  const header = createElement(document, "header", {
    className: "guided-flow-header",
  });
  const headerCopy = createElement(document, "div");
  headerCopy.append(
    createElement(document, "p", {
      className: "eyebrow",
      text: "Roteiro para consolidar",
    }),
    createElement(document, "h3", {
      text: flowView.completed
        ? "Assunto consolidado"
        : `Etapa atual: ${flowView.current.label}`,
    }),
    createElement(document, "p", {
      text: flowView.completed
        ? "Os 10 pontos estão ativos. O caminho permanece disponível para consulta."
        : `Recomendação atual: ${flowView.recommended.label}. O avanço só acontece quando você decidir.`,
    }),
  );
  header.append(headerCopy);

  const navigation = createElement(document, "div", {
    className: "guided-flow-navigation",
  });
  const progressSummary = createElement(document, "section", {
    className: "guided-flow-progress-summary",
    attributes: { "aria-label": "Pontuação objetiva do assunto" },
  });
  const score = createElement(document, "div", {
    className: "overview-progress-score guided-flow-progress-score",
    attributes: {
      role: "progressbar",
      "aria-label": "Progresso geral do assunto",
      "aria-valuemin": "0",
      "aria-valuemax": String(progress.goalTotal),
      "aria-valuenow": String(progress.currentTotal),
    },
  });
  score.style.setProperty("--progress-angle", `${progress.percentage * 3.6}deg`);
  const scoreInner = createElement(document, "div");
  scoreInner.append(
    createElement(document, "strong", { text: `${progress.currentTotal}` }),
    createElement(document, "span", { text: `de ${progress.goalTotal}` }),
  );
  score.append(scoreInner);

  const progressCopy = createElement(document, "div", {
    className: "guided-flow-progress-copy",
  });
  const progressMeta = createElement(document, "div", {
    className: "overview-progress-meta guided-flow-progress-meta",
  });
  const stateRow = createElement(document, "div", {
    className: "overview-state-row",
  });
  stateRow.append(
    createElement(document, "span", {
      className: "state-badge",
      text: STUDY_STATE_LABELS[subject.studyState] ?? subject.studyState,
    }),
    createElement(document, "small", {
      text: `Recalculado em ${formatDateTime(progress.calculatedAt)}`,
    }),
  );
  progressMeta.append(
    stateRow,
    createPersonalPerception(document, subject.overview.perceivedMastery),
  );
  progressCopy.append(
    progressMeta,
    createElement(document, "h4", {
      text: `${progress.percentage}% do caminho atual`,
    }),
    createElement(document, "p", {
      text: "Pontuação baseada nas evidências persistidas deste assunto.",
    }),
  );
  progressSummary.append(score, progressCopy);

  const trackWrap = createElement(document, "div", {
    className: "guided-flow-track-wrap",
  });
  const track = createElement(document, "div", {
    className: "guided-flow-track",
    attributes: { role: "tablist", "aria-label": "Etapas de consolidação" },
  });
  const detail = createElement(document, "div", {
    className: "guided-flow-detail",
    attributes: { role: "tabpanel" },
  });
  let selectedStage = flowView.currentStage;
  const buttons = new Map();

  function renderDetail(stageKey) {
    selectedStage = stageKey;
    const stage = flowView.stages.find((candidate) => candidate.key === stageKey);
    buttons.forEach((button, key) => {
      const selected = key === stageKey;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    clearElement(detail);

    const copy = createElement(document, "div", {
      className: "guided-flow-detail-copy",
    });
    const badges = createElement(document, "div", {
      className: "guided-flow-badges",
    });
    if (stage.current) {
      badges.append(createElement(document, "span", { text: "Etapa atual" }));
    }
    if (stage.recommended && !stage.current) {
      badges.append(
        createElement(document, "span", {
          className: "recommended",
          text: "Recomendada",
        }),
      );
    }
    if (stage.complete) {
      badges.append(
        createElement(document, "span", { className: "complete", text: "Concluída" }),
      );
    }
    copy.append(
      badges,
      createElement(document, "h4", { text: stage.label }),
      createElement(document, "p", { text: stage.description }),
    );

    const stageProgress = createElement(document, "div", {
      className: "guided-flow-stage-progress",
    });
    const stageProgressHeader = createElement(document, "div", {
      className: "guided-flow-stage-progress-header",
    });
    stageProgressHeader.append(
      createElement(document, "strong", {
        text: `${stage.activePoints}/${stage.cap} pontos`,
      }),
      createElement(document, "span", {
        text: `${Math.round((stage.activePoints / stage.cap) * 100)}%`,
      }),
    );
    const stageProgressTrack = createElement(document, "div", {
      className: "guided-flow-stage-progress-track",
      attributes: {
        role: "progressbar",
        "aria-label": `Progresso em ${stage.label}`,
        "aria-valuemin": "0",
        "aria-valuemax": String(stage.cap),
        "aria-valuenow": String(stage.activePoints),
      },
    });
    const stageProgressFill = createElement(document, "span", {
      className: "guided-flow-stage-progress-fill",
    });
    stageProgressFill.style.width = `${(stage.activePoints / stage.cap) * 100}%`;
    stageProgressTrack.append(stageProgressFill);
    stageProgress.append(stageProgressHeader, stageProgressTrack);
    copy.append(stageProgress);

    const missingText = stage.complete
      ? "Todos os requisitos desta etapa estão cumpridos."
      : stage.missing[0] || "Consulte os requisitos desta etapa.";
    copy.append(
      createElement(document, "p", {
        className: stage.complete
          ? "guided-flow-stage-note complete"
          : "guided-flow-stage-note",
        text: missingText,
      }),
    );
    if (!stage.canBecomeCurrent && stage.blockedReason) {
      copy.append(
        createElement(document, "p", {
          className: "guided-flow-blocked-reason",
          text: stage.blockedReason,
        }),
      );
    }

    const actions = createElement(document, "div", {
      className: "guided-flow-actions",
    });
    const helpButton = createElement(document, "button", {
      className: "button button-ghost",
      text: "Como conquistar estes pontos?",
      attributes: { type: "button" },
    });
    helpButton.addEventListener("click", () => onOpenStageHelp(stage));
    actions.append(helpButton);

    if (!stage.current) {
      const makeCurrentButton = createElement(document, "button", {
        className: "button button-secondary",
        text: "Tornar etapa atual",
        attributes: {
          type: "button",
          title: stage.blockedReason ?? "Tornar esta etapa atual",
        },
      });
      makeCurrentButton.disabled = !stage.canBecomeCurrent;
      makeCurrentButton.addEventListener("click", () => onMakeStageCurrent(stage.key));
      actions.append(makeCurrentButton);
    }

    if (stage.action) {
      const actionButton = createElement(document, "button", {
        className: "button button-primary",
        text: stage.action.label,
        attributes: { type: "button" },
      });
      actionButton.addEventListener("click", () => onStageAction(stage.action));
      actions.append(actionButton);
      [stage.action.secondary, stage.action.tertiary]
        .filter(Boolean)
        .forEach((extraAction) => {
          const extraButton = createElement(document, "button", {
            className: "guided-flow-secondary-action",
            text: extraAction.label,
            attributes: { type: "button" },
          });
          extraButton.addEventListener("click", () =>
            onStageAction(extraAction),
          );
          actions.append(extraButton);
        });
    }

    detail.append(copy, actions);
  }

  flowView.stages.forEach((stage, index) => {
    const button = createElement(document, "button", {
      className: [
        "guided-flow-stage",
        stage.current ? "current" : "",
        stage.recommended ? "recommended" : "",
        stage.complete ? "complete" : "",
      ]
        .filter(Boolean)
        .join(" "),
      attributes: {
        type: "button",
        role: "tab",
        "aria-selected": String(stage.key === selectedStage),
        "aria-controls": "guided-flow-detail",
      },
    });
    button.tabIndex = stage.key === selectedStage ? 0 : -1;
    button.append(
      createElement(document, "span", {
        className: "guided-flow-stage-index",
        text: stage.complete ? "✓" : String(index + 1),
      }),
      createElement(document, "strong", { text: stage.shortLabel }),
      createElement(document, "small", {
        text: `${stage.activePoints}/${stage.cap}`,
      }),
    );
    button.addEventListener("click", () => renderDetail(stage.key));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) {
        return;
      }
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + direction + flowView.stages.length) % flowView.stages.length;
      const nextStage = flowView.stages[nextIndex];
      renderDetail(nextStage.key);
      buttons.get(nextStage.key)?.focus();
    });
    buttons.set(stage.key, button);
    track.append(button);
  });
  detail.id = "guided-flow-detail";
  trackWrap.append(track);
  navigation.append(progressSummary, trackWrap);

  panel.append(header, navigation);
  if (flowView.regression) {
    const notice = createElement(document, "div", {
      className: "guided-flow-system-notice regression",
    });
    notice.append(
      createElement(document, "p", { text: flowView.regressionMessage }),
      createElement(document, "button", {
        className: "button button-secondary",
        text: `Voltar para ${flowView.recommended.shortLabel}`,
        attributes: { type: "button" },
      }),
    );
    notice.lastElementChild.addEventListener("click", () =>
      onMakeStageCurrent(flowView.recommendedStage),
    );
    panel.append(notice);
  } else if (flowView.advanceAvailable) {
    const notice = createElement(document, "div", {
      className: "guided-flow-system-notice advance",
    });
    notice.append(
      createElement(document, "p", {
        text: `${flowView.current.label} está concluída. Prosseguir para ${flowView.recommended.label} é recomendado, mas continua sendo uma decisão sua.`,
      }),
      createElement(document, "button", {
        className: "button button-primary",
        text: `Prosseguir para ${flowView.recommended.shortLabel}`,
        attributes: { type: "button" },
      }),
    );
    notice.lastElementChild.addEventListener("click", () =>
      onMakeStageCurrent(flowView.recommendedStage),
    );
    panel.append(notice);
  }
  panel.append(detail);
  renderDetail(selectedStage);
  return panel;
}


export function renderOverviewSection({
  document,
  container,
  subject,
  progress,
  recordCounts,
  recentRecords,
  importantRecords,
  recentEvents,
  navigate,
  onCreate,
  onEditOverview,
  guidedFlow,
  onMakeStageCurrent,
  onStageAction,
  onOpenStageHelp,
}) {
  clearElement(container);

  const inner = createElement(document, "div", {
    className: "content-inner overview-content",
  });
  const header = createElement(document, "header", { className: "section-header" });
  const headerCopy = createElement(document, "div");
  headerCopy.append(
    createElement(document, "p", { className: "eyebrow", text: "Fundação 10" }),
    createElement(document, "h2", { text: "Visão Geral" }),
    createElement(document, "p", {
      className: "section-description",
      text:
        "Seu momento atual, as evidências já conquistadas e o próximo passo do assunto em uma única tela.",
    }),
  );
  const actions = createElement(document, "div", { className: "section-header-actions" });
  const editButton = createElement(document, "button", {
    className: "button button-secondary",
    text: "Editar Visão Geral",
    attributes: { type: "button" },
  });
  editButton.addEventListener("click", onEditOverview);
  const createButton = createElement(document, "button", {
    className: "button button-primary",
    text: "+ Novo registro",
    attributes: { type: "button" },
  });
  createButton.addEventListener("click", onCreate);
  actions.append(editButton, createButton);
  header.append(headerCopy, actions);
  inner.append(header);

  inner.append(
    createGuidedFlowPanel({
      document,
      subject,
      progress,
      flowView: guidedFlow,
      onMakeStageCurrent,
      onStageAction,
      onOpenStageHelp,
    }),
  );


  const metrics = createElement(document, "section", { className: "metrics-grid" });
  metrics.append(
    createMetric(document, "Resumos", recordCounts.summaries, () => navigate("summaries")),
    createMetric(document, "Anotações", recordCounts.notes, () => navigate("notes")),
    createMetric(document, "Registros de erro", recordCounts.errors, () => navigate("errors")),
    createMetric(document, "Arquivados", recordCounts.archived, () => navigate("archived")),
  );
  inner.append(metrics);

  const momentPanel = createElement(document, "section", {
    className: "panel overview-moment-panel",
  });
  const momentHeader = createElement(document, "header", {
    className: "overview-panel-header",
  });
  const momentCopy = createElement(document, "div");
  momentCopy.append(
    createElement(document, "p", { className: "eyebrow", text: "Momento atual" }),
    createElement(document, "h3", { text: subject.subjectName }),
    createElement(document, "p", { text: `${subject.matterName} › ${subject.themeName}` }),
  );
  momentHeader.append(momentCopy);

  const factGrid = createElement(document, "div", { className: "overview-fact-grid" });
  factGrid.append(
    createOverviewFact(
      document,
      "Próximo passo pessoal",
      getRichContentPlainText(subject.overview.nextStep),
      "O roteiro acima mostra a recomendação objetiva; aqui você pode registrar uma intenção pessoal.",
    ),
    createOverviewFact(
      document,
      "Dificuldade principal",
      getRichContentPlainText(subject.overview.mainDifficulty),
      "Nenhuma dificuldade principal foi registrada.",
    ),
    createOverviewFact(
      document,
      "Percepção atual",
      getRichContentPlainText(subject.overview.currentPerception),
      "Registre o que está claro e o que ainda parece frágil.",
    ),
    createOverviewFact(
      document,
      "Observação de progresso",
      getRichContentPlainText(subject.overview.progressObservation),
      "Ainda não há uma observação de evolução.",
    ),
  );
  momentPanel.append(momentHeader, factGrid);
  inner.append(momentPanel);

  const lowerGrid = createElement(document, "section", {
    className: "overview-lower-grid",
  });
  const importantPanel = createElement(document, "article", {
    className: "panel overview-list-panel",
  });
  importantPanel.append(
    createElement(document, "p", { className: "eyebrow", text: "Acesso rápido" }),
    createElement(document, "h3", { text: "Registros importantes" }),
    createRecordList(
      document,
      importantRecords.slice(0, 4),
      "Marque um Resumo ou uma Anotação como importante para encontrá-lo aqui.",
    ),
  );

  const recentPanel = createElement(document, "article", {
    className: "panel overview-list-panel",
  });
  recentPanel.append(
    createElement(document, "p", { className: "eyebrow", text: "Cronologia" }),
    createElement(document, "h3", { text: "Registros recentes" }),
    createRecordList(
      document,
      recentRecords.slice(0, 4),
      "O primeiro registro do assunto aparecerá aqui.",
    ),
  );
  lowerGrid.append(importantPanel, recentPanel);
  inner.append(lowerGrid);

  const historyPanel = createElement(document, "section", {
    className: "panel overview-history-panel",
  });
  const historyHeader = createElement(document, "div", {
    className: "overview-panel-header",
  });
  const historyCopy = createElement(document, "div");
  historyCopy.append(
    createElement(document, "p", { className: "eyebrow", text: "Atividade" }),
    createElement(document, "h3", { text: "Movimentos recentes" }),
  );
  const historyButton = createElement(document, "button", {
    className: "button button-ghost",
    text: "Ver histórico completo",
    attributes: { type: "button" },
  });
  historyButton.addEventListener("click", () => navigate("history"));
  historyHeader.append(historyCopy, historyButton);
  historyPanel.append(historyHeader, createHistoryList(document, recentEvents));
  inner.append(historyPanel);

  container.append(inner);
}

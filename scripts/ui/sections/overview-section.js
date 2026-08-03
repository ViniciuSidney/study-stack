import { PROGRESS_CATEGORY_DEFINITIONS } from "../../domain/progress.js";
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

const CATEGORY_HELP = Object.freeze({
  base: "Resumo concluído e marcação de estudo.",
  practice: "Listas válidas com pelo menos 15 respostas.",
  errorAnalysis: "Registros de Erro com análise completa.",
  review: "Erros revisados e evidências de superação.",
  consolidation: "Confirmação após alcançar os 9 pontos anteriores.",
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

function createProgressCategory(document, key, category) {
  const definition = PROGRESS_CATEGORY_DEFINITIONS[key];
  const card = createElement(document, "article", {
    className: `progress-category ${category.activePoints === category.cap ? "complete" : ""}`,
  });
  const header = createElement(document, "div", {
    className: "progress-category-header",
  });
  header.append(
    createElement(document, "strong", { text: definition.label }),
    createElement(document, "span", {
      text: `${category.activePoints}/${category.cap}`,
    }),
  );
  const track = createElement(document, "div", {
    className: "progress-mini-track",
    attributes: {
      role: "progressbar",
      "aria-label": `Progresso em ${definition.label}`,
      "aria-valuemin": "0",
      "aria-valuemax": String(category.cap),
      "aria-valuenow": String(category.activePoints),
    },
  });
  const fill = createElement(document, "span", {
    className: "progress-mini-fill",
  });
  fill.style.width = `${(category.activePoints / category.cap) * 100}%`;
  track.append(fill);
  card.append(
    header,
    track,
    createElement(document, "p", { text: CATEGORY_HELP[key] }),
  );
  return card;
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
    createElement(document, "span", { text: "Percepção pessoal" }),
    createElement(document, "strong", { text: presentation.displayValue }),
  );

  const track = createElement(document, "div", {
    className: "overview-personal-track",
    attributes: presentation.informed
      ? {
          role: "progressbar",
          "aria-label": "Percepção pessoal de domínio",
          "aria-valuemin": "0",
          "aria-valuemax": "100",
          "aria-valuenow": String(presentation.value),
        }
      : {
          role: "status",
          "aria-label": "Percepção pessoal não informada",
        },
  });
  const fill = createElement(document, "span", {
    className: "overview-personal-fill",
  });
  fill.style.width = `${presentation.value ?? 0}%`;
  track.append(fill);
  indicator.append(track);

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
}) {
  clearElement(container);

  const inner = createElement(document, "div", {
    className: "content-inner overview-content",
  });
  const header = createElement(document, "header", { className: "section-header" });
  const headerCopy = createElement(document, "div");
  headerCopy.append(
    createElement(document, "p", { className: "eyebrow", text: "Fundação 09" }),
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

  const progressPanel = createElement(document, "section", {
    className: "panel overview-progress-panel",
  });
  const progressLead = createElement(document, "div", {
    className: "overview-progress-lead",
  });
  const score = createElement(document, "div", {
    className: "overview-progress-score",
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

  const leadCopy = createElement(document, "div", {
    className: "overview-progress-copy",
  });
  const progressMeta = createElement(document, "div", {
    className: "overview-progress-meta",
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
  leadCopy.append(
    progressMeta,
    createElement(document, "h3", { text: `${progress.percentage}% do caminho atual` }),
    createElement(document, "p", {
      text:
        "A pontuação vem de evidências persistidas. A percepção pessoal é exibida separadamente e não altera este cálculo.",
    }),
  );
  progressLead.append(score, leadCopy);

  const categoryGrid = createElement(document, "div", {
    className: "progress-category-grid",
  });
  Object.keys(PROGRESS_CATEGORY_DEFINITIONS).forEach((key) => {
    categoryGrid.append(createProgressCategory(document, key, progress.categories[key]));
  });
  progressPanel.append(progressLead, categoryGrid);
  inner.append(progressPanel);

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
      "Próximo passo",
      getRichContentPlainText(subject.overview.nextStep),
      "Defina uma ação pequena e concreta para continuar.",
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

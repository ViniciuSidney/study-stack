import { clearElement, createElement } from "../../utils/dom.js";

function formatDateTime(value) {
  if (!value) {
    return "Ainda não registrado";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function appendStatusRow(document, list, label, value) {
  const row = createElement(document, "li");
  row.append(
    createElement(document, "span", { text: label }),
    createElement(document, "strong", { text: String(value) }),
  );
  list.append(row);
}

function createMetric(document, label, value, onClick) {
  const button = createElement(document, "button", {
    className: "metric-card panel",
    attributes: { type: "button" },
  });
  button.append(
    createElement(document, "strong", { text: value }),
    createElement(document, "span", { text: label }),
  );
  button.addEventListener("click", onClick);
  return button;
}

export function renderOverviewSection({
  document,
  container,
  subject,
  storageInfo,
  recordCounts,
  recentRecords,
  navigate,
  onCreate,
}) {
  clearElement(container);

  const inner = createElement(document, "div", { className: "content-inner" });
  const header = createElement(document, "header", { className: "section-header" });
  const headerCopy = createElement(document, "div");
  headerCopy.append(
    createElement(document, "p", { className: "eyebrow", text: "Fundação 03" }),
    createElement(document, "h2", { text: "Visão Geral" }),
    createElement(document, "p", {
      className: "section-description",
      text:
        "O Subject agora possui registros reais, persistentes e rastreáveis por histórico. Resumos e Anotações já podem começar pelo núcleo comum.",
    }),
  );
  const createButton = createElement(document, "button", {
    className: "button button-primary",
    text: "+ Novo registro",
    attributes: { type: "button" },
  });
  createButton.addEventListener("click", onCreate);
  header.append(headerCopy, createButton);
  inner.append(header);

  const metrics = createElement(document, "section", { className: "metrics-grid" });
  metrics.append(
    createMetric(document, "Resumos", recordCounts.summaries, () => navigate("summaries")),
    createMetric(document, "Anotações", recordCounts.notes, () => navigate("notes")),
    createMetric(document, "Importantes", recordCounts.important, () => navigate("summaries")),
    createMetric(document, "Arquivados", recordCounts.archived, () => navigate("archived")),
  );
  inner.append(metrics);

  const grid = createElement(document, "section", { className: "foundation-grid" });
  const subjectPanel = createElement(document, "article", {
    className: "panel foundation-panel",
  });
  subjectPanel.append(
    createElement(document, "p", { className: "eyebrow", text: "Assunto conectado" }),
    createElement(document, "h3", { text: subject.subjectName }),
    createElement(document, "p", { text: `${subject.matterName} › ${subject.themeName}` }),
  );
  const subjectStatus = createElement(document, "ul", { className: "status-list" });
  appendStatusRow(document, subjectStatus, "Estado", subject.studyState);
  appendStatusRow(document, subjectStatus, "Registros ativos", recordCounts.total);
  appendStatusRow(document, subjectStatus, "Rascunhos", recordCounts.drafts);
  appendStatusRow(document, subjectStatus, "Em andamento", recordCounts.inProgress);
  appendStatusRow(document, subjectStatus, "Última atividade", formatDateTime(subject.lastActivityAt));
  subjectPanel.append(subjectStatus);

  const storagePanel = createElement(document, "aside", {
    className: "panel foundation-panel",
  });
  storagePanel.append(
    createElement(document, "p", { className: "eyebrow", text: "Persistência" }),
    createElement(document, "h3", { text: "Estado v1 operacional" }),
    createElement(document, "p", {
      text:
        "Cada operação passa por validação estrutural, transação controlada e atualização da integridade.",
    }),
  );
  const storageStatus = createElement(document, "ul", { className: "status-list" });
  appendStatusRow(document, storageStatus, "Schema", storageInfo.schemaVersion);
  appendStatusRow(document, storageStatus, "Integridade", storageInfo.integrityStatus);
  appendStatusRow(document, storageStatus, "Records", storageInfo.recordCount);
  appendStatusRow(document, storageStatus, "Eventos", storageInfo.historyCount);
  appendStatusRow(document, storageStatus, "Última gravação", formatDateTime(storageInfo.updatedAt));
  storagePanel.append(storageStatus);
  grid.append(subjectPanel, storagePanel);

  const recentPanel = createElement(document, "article", {
    className: "panel foundation-panel foundation-wide",
  });
  recentPanel.append(
    createElement(document, "p", { className: "eyebrow", text: "Atividade recente" }),
    createElement(document, "h3", { text: "Registros do assunto" }),
  );

  if (!recentRecords.length) {
    recentPanel.append(
      createElement(document, "p", {
        text: "Nenhum registro foi criado. A estrutura está limpa e pronta para o primeiro Resumo ou Anotação.",
      }),
    );
  } else {
    const list = createElement(document, "ul", { className: "recent-record-list" });
    recentRecords.slice(0, 5).forEach((record) => {
      const item = createElement(document, "li");
      item.append(
        createElement(document, "strong", { text: record.title || "Registro sem título" }),
        createElement(document, "span", {
          text: `${record.type === "summary" ? "Resumo" : "Anotação"} · ${record.studyDate}`,
        }),
      );
      list.append(item);
    });
    recentPanel.append(list);
  }
  grid.append(recentPanel);

  const milestonePanel = createElement(document, "article", {
    className: "panel foundation-panel foundation-wide",
  });
  milestonePanel.append(
    createElement(document, "p", { className: "eyebrow", text: "Marco atual" }),
    createElement(document, "h3", { text: "Record e ciclo básico de vida" }),
  );
  const list = createElement(document, "ul", { className: "foundation-list" });
  [
    "Criação manual limitada a Resumos e Anotações.",
    "Tipo e assunto imutáveis após a criação.",
    "Edição de título, data, tags, importância e observações.",
    "Transição real entre Rascunho e Em andamento.",
    "Arquivamento confirmado e restauração sem confirmação.",
    "Histórico funcional gerado em todas as operações.",
  ].forEach((text) => list.append(createElement(document, "li", { text })));
  milestonePanel.append(list);
  grid.append(milestonePanel);

  inner.append(grid);
  container.append(inner);
}

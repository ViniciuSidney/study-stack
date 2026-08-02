import { clearElement, createElement } from "../../utils/dom.js";

const TYPE_LABELS = Object.freeze({
  summary: "Resumo",
  note: "Anotação",
  imported_session: "Lista importada",
  error_record: "Registro de erro",
});

export function renderArchivedSection({
  document,
  container,
  records,
  onRestore,
}) {
  clearElement(container);
  const inner = createElement(document, "div", { className: "content-inner" });
  const header = createElement(document, "header", { className: "section-header" });
  const copy = createElement(document, "div");
  copy.append(
    createElement(document, "p", { className: "eyebrow", text: "Recuperação" }),
    createElement(document, "h2", { text: "Arquivados" }),
    createElement(document, "p", {
      className: "section-description",
      text:
        "Arquivar retira o registro das visões correntes, mas preserva dados, vínculos e histórico. Não há exclusão permanente comum.",
    }),
  );
  header.append(copy);
  inner.append(header);

  if (!records.length) {
    const empty = createElement(document, "section", {
      className: "panel empty-state",
    });
    empty.append(
      createElement(document, "div", { className: "placeholder-icon", text: "□" }),
      createElement(document, "h3", { text: "Nenhum registro arquivado" }),
      createElement(document, "p", {
        text: "Os registros arquivados deste assunto aparecerão aqui e poderão ser restaurados sem confirmação adicional.",
      }),
    );
    inner.append(empty);
    container.append(inner);
    return;
  }

  const grid = createElement(document, "section", { className: "record-grid" });
  records.forEach((record) => {
    const card = createElement(document, "article", {
      className: "record-card archived-card panel",
    });
    card.append(
      createElement(document, "p", {
        className: "eyebrow",
        text: TYPE_LABELS[record.type] ?? "Registro",
      }),
      createElement(document, "h3", { text: record.title || "Registro sem título" }),
      createElement(document, "p", {
        className: "record-meta",
        text: `Data de estudo: ${new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeZone: "UTC",
        }).format(new Date(`${record.studyDate}T12:00:00Z`))}`,
      }),
      createElement(document, "p", {
        className: "record-preview",
        text: record.archiveReason
          ? `Motivo: ${record.archiveReason}`
          : "Arquivado sem motivo adicional.",
      }),
    );
    const actions = createElement(document, "div", { className: "record-actions" });
    const restoreButton = createElement(document, "button", {
      className: "button button-primary button-small",
      text: "Restaurar",
      attributes: { type: "button" },
    });
    restoreButton.addEventListener("click", () => onRestore(record));
    actions.append(restoreButton);
    card.append(actions);
    grid.append(card);
  });

  inner.append(grid);
  container.append(inner);
}

import { createElement } from "../utils/dom.js";

let confirmationScreenSequence = 0;

function normalizeMetrics(metrics) {
  if (!Array.isArray(metrics)) return [];
  return metrics.filter(
    (metric) =>
      metric &&
      metric.label !== undefined &&
      metric.value !== undefined &&
      metric.value !== null,
  );
}

export function openActionConfirmationScreen({
  document,
  eyebrow = "Ação concluída",
  title,
  message,
  metrics = [],
  confirmLabel = "Confirmar",
  onConfirm = () => {},
}) {
  if (!title || typeof title !== "string") {
    throw new TypeError("A tela de confirmação exige um título.");
  }

  document.querySelector(".action-confirmation-screen")?.remove();

  const screenId = `action-confirmation-${++confirmationScreenSequence}`;
  const titleId = `${screenId}-title`;
  const messageId = `${screenId}-message`;
  const screen = createElement(document, "section", {
    className: "action-confirmation-screen",
    attributes: {
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": titleId,
      ...(message ? { "aria-describedby": messageId } : {}),
    },
  });
  const card = createElement(document, "div", {
    className: "action-confirmation-card",
  });
  const icon = createElement(document, "div", {
    className: "action-confirmation-icon",
    text: "✓",
    attributes: { "aria-hidden": "true" },
  });
  const copy = createElement(document, "div", {
    className: "action-confirmation-copy",
  });
  copy.append(
    createElement(document, "p", {
      className: "eyebrow action-confirmation-eyebrow",
      text: eyebrow,
    }),
    createElement(document, "h2", {
      text: title,
      attributes: { id: titleId },
    }),
  );

  if (message) {
    copy.append(
      createElement(document, "p", {
        className: "action-confirmation-message",
        text: message,
        attributes: { id: messageId },
      }),
    );
  }

  const normalizedMetrics = normalizeMetrics(metrics);
  if (normalizedMetrics.length) {
    const metricsGrid = createElement(document, "div", {
      className: "action-confirmation-metrics",
    });
    normalizedMetrics.forEach((metric) => {
      const item = createElement(document, "div", {
        className: "action-confirmation-metric",
      });
      item.append(
        createElement(document, "strong", { text: String(metric.value) }),
        createElement(document, "span", { text: String(metric.label) }),
      );
      metricsGrid.append(item);
    });
    card.append(icon, copy, metricsGrid);
  } else {
    card.append(icon, copy);
  }

  const confirmButton = createElement(document, "button", {
    className: "button button-primary action-confirmation-button",
    text: confirmLabel,
    attributes: { type: "button" },
  });
  card.append(confirmButton);
  screen.append(card);

  const previousActiveElement = document.activeElement;
  const appShell = document.querySelector("#appShell");
  const appShellWasInert = appShell?.inert ?? false;
  const root = document.documentElement;
  const rootWasLocked = root.classList.contains("action-confirmation-open");
  let closed = false;
  let fallbackTimer = null;

  function restorePageState() {
    if (appShell) {
      appShell.inert = appShellWasInert;
    }
    if (!rootWasLocked) {
      root.classList.remove("action-confirmation-open");
    }
    if (previousActiveElement?.isConnected) {
      previousActiveElement.focus?.({ preventScroll: true });
    }
  }

  function finishClose() {
    if (closed) return;
    closed = true;
    if (fallbackTimer !== null) {
      clearTimeout(fallbackTimer);
    }
    document.removeEventListener("keydown", handleKeydown, true);
    screen.remove();
    restorePageState();
    onConfirm();
  }

  function close() {
    if (closed || screen.classList.contains("is-leaving")) return;
    screen.classList.add("is-leaving");
    screen.classList.remove("is-visible");

    const reducedMotion =
      document.documentElement.dataset.reducedMotion === "true";
    if (reducedMotion) {
      finishClose();
      return;
    }

    screen.addEventListener(
      "transitionend",
      (event) => {
        if (event.target === screen) finishClose();
      },
      { once: true },
    );
    fallbackTimer = setTimeout(finishClose, 320);
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      confirmButton.focus();
    }
  }

  confirmButton.addEventListener("click", close);
  document.addEventListener("keydown", handleKeydown, true);
  if (appShell) {
    appShell.inert = true;
  }
  root.classList.add("action-confirmation-open");

  document.body.append(screen);
  const requestFrame = document.defaultView?.requestAnimationFrame;
  if (typeof requestFrame === "function") {
    requestFrame.call(document.defaultView, () => {
      screen.classList.add("is-visible");
    });
  } else {
    screen.classList.add("is-visible");
  }
  confirmButton.focus();

  return Object.freeze({
    element: screen,
    close,
  });
}

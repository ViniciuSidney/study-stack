const FORM_CONTROL_TAGS = new Set(["INPUT", "SELECT", "TEXTAREA"]);
const formControlCounters = new WeakMap();

function ensureFormControlIdentifier(document, element) {
  if (!FORM_CONTROL_TAGS.has(element.tagName)) {
    return;
  }

  const existingId = String(element.getAttribute("id") ?? "").trim();
  const existingName = String(element.getAttribute("name") ?? "").trim();
  if (existingId || existingName) {
    return;
  }

  let next = (formControlCounters.get(document) ?? 0) + 1;
  let id = `study-stack-field-${next}`;

  while (typeof document.getElementById === "function" && document.getElementById(id)) {
    next += 1;
    id = `study-stack-field-${next}`;
  }

  formControlCounters.set(document, next);
  element.setAttribute("id", id);
}

export function getRequiredElement(document, selector) {
  const element = document.querySelector(selector);

  if (!element) {
    throw new Error(`Elemento obrigatório não encontrado: ${selector}`);
  }

  return element;
}

export function clearElement(element) {
  element.replaceChildren();
}

export function createElement(document, tagName, options = {}) {
  const element = document.createElement(tagName);

  if (options.className) {
    element.className = options.className;
  }

  if (options.text !== undefined) {
    element.textContent = String(options.text);
  }

  for (const [name, value] of Object.entries(options.attributes ?? {})) {
    element.setAttribute(name, String(value));
  }

  ensureFormControlIdentifier(document, element);

  if (Array.isArray(options.children)) {
    element.append(...options.children.filter(Boolean));
  }

  return element;
}

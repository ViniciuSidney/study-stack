export const PERCEIVED_MASTERY_LEVELS = Object.freeze([
  Object.freeze({ value: 20, label: "Muito frágil", max: 20 }),
  Object.freeze({ value: 40, label: "Frágil", max: 40 }),
  Object.freeze({ value: 60, label: "Em construção", max: 60 }),
  Object.freeze({ value: 80, label: "Seguro", max: 80 }),
  Object.freeze({ value: 100, label: "Muito seguro", max: 100 }),
]);

export function getPerceivedMasteryLevel(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 100) {
    return null;
  }

  return (
    PERCEIVED_MASTERY_LEVELS.find((level) => numeric <= level.max) ??
    PERCEIVED_MASTERY_LEVELS.at(-1)
  );
}

export function getPerceivedMasteryPresentation(value) {
  const level = getPerceivedMasteryLevel(value);

  return Object.freeze({
    informed: Boolean(level),
    value: level ? Number(value) : null,
    normalizedValue: level?.value ?? null,
    displayValue: level?.label ?? "Não informado",
  });
}

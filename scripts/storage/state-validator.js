import { COLLECTION_NAMES } from "../config/storage-config.js";

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isIsoDateTime(value) {
  return (
    typeof value === "string" &&
    value.length >= 20 &&
    !Number.isNaN(Date.parse(value))
  );
}

export class StateValidationError extends Error {
  constructor(errors) {
    super(`Estado inválido: ${errors.join(" ")}`);
    this.name = "StateValidationError";
    this.errors = Object.freeze([...errors]);
  }
}

export function validateState(state, expectedSchemaVersion) {
  const errors = [];

  if (!isPlainObject(state)) {
    return {
      valid: false,
      errors: ["A raiz do estado deve ser um objeto."],
    };
  }

  if (state.schemaVersion !== expectedSchemaVersion) {
    errors.push(
      `schemaVersion incompatível: esperado ${expectedSchemaVersion}.`,
    );
  }

  if (typeof state.appVersion !== "string" || !state.appVersion.trim()) {
    errors.push("appVersion ausente.");
  }

  if (!isIsoDateTime(state.createdAt)) {
    errors.push("createdAt inválido.");
  }

  if (!isIsoDateTime(state.updatedAt)) {
    errors.push("updatedAt inválido.");
  }

  if (
    isIsoDateTime(state.createdAt) &&
    isIsoDateTime(state.updatedAt) &&
    Date.parse(state.updatedAt) < Date.parse(state.createdAt)
  ) {
    errors.push("updatedAt não pode ser anterior a createdAt.");
  }

  if (!isPlainObject(state.collections)) {
    errors.push("collections deve ser um objeto.");
  } else {
    for (const collectionName of COLLECTION_NAMES) {
      const collection = state.collections[collectionName];

      if (!isPlainObject(collection)) {
        errors.push(`Coleção ${collectionName} ausente ou inválida.`);
        continue;
      }

      for (const [id, entity] of Object.entries(collection)) {
        if (!isPlainObject(entity)) {
          errors.push(`${collectionName}.${id} deve ser um objeto.`);
          continue;
        }

        if (entity.id !== id) {
          errors.push(
            `${collectionName}.${id} possui identificador divergente.`,
          );
        }
      }
    }
  }

  if (!Array.isArray(state.migrationHistory)) {
    errors.push("migrationHistory deve ser um array.");
  }

  if (!isPlainObject(state.integrity)) {
    errors.push("integrity deve ser um objeto.");
  }

  return { valid: errors.length === 0, errors };
}

export function assertValidState(state, expectedSchemaVersion) {
  const result = validateState(state, expectedSchemaVersion);

  if (!result.valid) {
    throw new StateValidationError(result.errors);
  }

  return state;
}

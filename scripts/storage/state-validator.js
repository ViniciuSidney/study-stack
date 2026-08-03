import { validateNote } from "../domain/note.js";
import {
  validateImportedQuestion,
  validateImportedSession,
} from "../domain/imported-session.js";
import { validateProgressSnapshot } from "../domain/progress.js";
import { validateRecord } from "../domain/record.js";
import { validateSummary } from "../domain/summary.js";
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

  if (isPlainObject(state.collections)) {
    const subjects = state.collections.subjects ?? {};
    const records = state.collections.records ?? {};
    const summaries = state.collections.summaries ?? {};
    const notes = state.collections.notes ?? {};
    const importedSessions = state.collections.importedSessions ?? {};
    const importedQuestions = state.collections.importedQuestions ?? {};
    const progressSnapshots = state.collections.progressSnapshots ?? {};

    for (const [id, record] of Object.entries(records)) {
      const validation = validateRecord(record);

      for (const error of validation.errors) {
        errors.push(`records.${id}: ${error}`);
      }

      if (!Object.hasOwn(subjects, record.subjectId)) {
        errors.push(`records.${id} referencia Subject inexistente.`);
      }

      if (record.type === "summary" && !Object.hasOwn(summaries, id)) {
        errors.push(`records.${id} não possui Summary correspondente.`);
      }

      if (record.type === "note" && !Object.hasOwn(notes, id)) {
        errors.push(`records.${id} não possui Note correspondente.`);
      }

      if (
        record.type === "imported_session" &&
        !Object.values(importedSessions).some((session) => session.recordId === id)
      ) {
        errors.push(`records.${id} não possui ImportedSession correspondente.`);
      }
    }

    for (const [id, summary] of Object.entries(summaries)) {
      const validation = validateSummary(summary);

      for (const error of validation.errors) {
        errors.push(`summaries.${id}: ${error}`);
      }

      const record = records[id];

      if (!record) {
        errors.push(`summaries.${id} referencia Record inexistente.`);
      } else if (record.type !== "summary") {
        errors.push(`summaries.${id} referencia Record de tipo incompatível.`);
      }
    }

    for (const [id, note] of Object.entries(notes)) {
      const validation = validateNote(note);

      for (const error of validation.errors) {
        errors.push(`notes.${id}: ${error}`);
      }

      const record = records[id];

      if (!record) {
        errors.push(`notes.${id} referencia Record inexistente.`);
      } else if (record.type !== "note") {
        errors.push(`notes.${id} referencia Record de tipo incompatível.`);
      }

      for (const linkedRecordId of note.linkedRecordIds ?? []) {
        const linkedRecord = records[linkedRecordId];

        if (!linkedRecord) {
          errors.push(
            `notes.${id} referencia Record vinculado inexistente: ${linkedRecordId}.`,
          );
        } else if (record && linkedRecord.subjectId !== record.subjectId) {
          errors.push(
            `notes.${id} vincula Record de outro assunto: ${linkedRecordId}.`,
          );
        }
      }
    }

    const sourceSessionKeys = new Set();
    for (const [id, session] of Object.entries(importedSessions)) {
      const validation = validateImportedSession(session);

      for (const error of validation.errors) {
        errors.push(`importedSessions.${id}: ${error}`);
      }

      const record = records[session.recordId];
      if (!record) {
        errors.push(`importedSessions.${id} referencia Record inexistente.`);
      } else if (record.type !== "imported_session") {
        errors.push(
          `importedSessions.${id} referencia Record de tipo incompatível.`,
        );
      } else if (record.subjectId !== session.subjectId) {
        errors.push(`importedSessions.${id} diverge do assunto do Record.`);
      }

      if (!Object.hasOwn(subjects, session.subjectId)) {
        errors.push(`importedSessions.${id} referencia Subject inexistente.`);
      }

      const sourceKey = `${session.subjectId}:${session.sourceSessionId}`;
      if (sourceSessionKeys.has(sourceKey)) {
        errors.push(
          `Existe mais de uma ImportedSession para a origem ${sourceKey}.`,
        );
      }
      sourceSessionKeys.add(sourceKey);

      for (const questionId of session.questionIds ?? []) {
        const question = importedQuestions[questionId];
        if (!question) {
          errors.push(
            `importedSessions.${id} referencia questão inexistente: ${questionId}.`,
          );
        } else if (question.sessionId !== id) {
          errors.push(
            `importedSessions.${id} referencia questão de outra sessão: ${questionId}.`,
          );
        }
      }
    }

    for (const [id, question] of Object.entries(importedQuestions)) {
      const validation = validateImportedQuestion(question);

      for (const error of validation.errors) {
        errors.push(`importedQuestions.${id}: ${error}`);
      }

      const session = importedSessions[question.sessionId];
      if (!session) {
        errors.push(`importedQuestions.${id} referencia sessão inexistente.`);
      } else {
        if (!session.questionIds.includes(id)) {
          errors.push(
            `importedQuestions.${id} não consta na ordem da sessão correspondente.`,
          );
        }
        if (session.subjectId !== question.subjectId) {
          errors.push(`importedQuestions.${id} diverge do assunto da sessão.`);
        }
      }
    }

    const snapshotSubjects = new Set();
    for (const [id, snapshot] of Object.entries(progressSnapshots)) {
      const validation = validateProgressSnapshot(snapshot);

      for (const error of validation.errors) {
        errors.push(`progressSnapshots.${id}: ${error}`);
      }

      if (!Object.hasOwn(subjects, snapshot.subjectId)) {
        errors.push(`progressSnapshots.${id} referencia Subject inexistente.`);
      }

      if (snapshotSubjects.has(snapshot.subjectId)) {
        errors.push(
          `Existe mais de um ProgressSnapshot para o Subject ${snapshot.subjectId}.`,
        );
      }
      snapshotSubjects.add(snapshot.subjectId);
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

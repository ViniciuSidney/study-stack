export class UnsupportedSchemaVersionError extends Error {
  constructor(currentVersion, supportedVersion) {
    super(
      `Schema ${currentVersion || "desconhecido"} não é compatível com ` +
        `${supportedVersion}.`,
    );
    this.name = "UnsupportedSchemaVersionError";
    this.currentVersion = currentVersion;
    this.supportedVersion = supportedVersion;
  }
}

export class MigrationRunner {
  constructor(targetVersion) {
    this.targetVersion = targetVersion;
  }

  migrate(state) {
    if (state.schemaVersion === this.targetVersion) {
      return { state, applied: [] };
    }

    throw new UnsupportedSchemaVersionError(
      state.schemaVersion,
      this.targetVersion,
    );
  }
}

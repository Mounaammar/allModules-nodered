"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MakeStoppedAtNullable1607431743769 = void 0;
const config = require("../../../../config");
class MakeStoppedAtNullable1607431743769 {
    async up(queryRunner) {
        const tablePrefix = config.get('database.tablePrefix');
        await queryRunner.query(`PRAGMA writable_schema = 1; `, undefined);
        await queryRunner.query(`UPDATE SQLITE_MASTER SET SQL = 'CREATE TABLE IF NOT EXISTS "${tablePrefix}execution_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "data" text NOT NULL, "finished" boolean NOT NULL, "mode" varchar NOT NULL, "retryOf" varchar, "retrySuccessId" varchar, "startedAt" datetime NOT NULL, "stoppedAt" datetime, "workflowData" text NOT NULL, "workflowId" varchar)' WHERE NAME = "${tablePrefix}execution_entity";`, undefined);
        await queryRunner.query(`PRAGMA writable_schema = 0;`, undefined);
    }
    async down(queryRunner) {
    }
}
exports.MakeStoppedAtNullable1607431743769 = MakeStoppedAtNullable1607431743769;
//# sourceMappingURL=1607431743769-MakeStoppedAtNullable.js.map